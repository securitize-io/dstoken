import hre from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployDSTokenGlobalWhitelisted, INVESTORS } from "./utils/fixture";
import { DSConstants } from "../utils/globals";

describe("ComplianceServiceGlobalWhitelisted", function () {
  let complianceService: any;
  let transferAgent: any;

  let user: any;
  let userAddress: string;
  let user2Address: string;

  const reason = "Test reason";

  beforeEach(async function () {
    const {
      dsToken,
      trustService,
      registryService,
      complianceService: complianceService_,
    } = await loadFixture(deployDSTokenGlobalWhitelisted);
    complianceService = complianceService_;

    const [master, ta, user1, user2] = await hre.ethers.getSigners();
    await trustService
      .connect(master)
      .setRole(ta, DSConstants.roles.TRANSFER_AGENT);

    transferAgent = ta;
    user = user1;
    userAddress = await user1.getAddress();
    user2Address = await user2.getAddress();

    // Register investors and add wallets to avoid whitelist rejections
    await registryService.registerInvestor(
      INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
      INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1,
    );

    await registryService.addWallet(
      userAddress,
      INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
    );

    // Issuance tokens to user
    await dsToken.issueTokens(userAddress, 1000);

    await registryService.registerInvestor(
      INVESTORS.INVESTOR_ID.INVESTOR_ID_2,
      INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_2,
    );

    await registryService.addWallet(
      user2Address,
      INVESTORS.INVESTOR_ID.INVESTOR_ID_2,
    );
  });

  describe("Basic Setup", function () {
    it("should deploy successfully", async function () {
      expect(complianceService).to.not.be.undefined;
      expect(await complianceService.getAddress()).to.not.equal(
        hre.ethers.ZeroAddress,
      );
    });

    it("should initialize with empty blacklist", async function () {
      expect(await complianceService.getBlacklistedWalletsCount()).to.equal(0);
      expect(await complianceService.getBlacklistedWallets()).to.deep.equal([]);
    });

    it("should test constructor and initialization functions", async function () {
      await expect(
        complianceService.initialize(),
      ).to.be.revertedWithCustomError(
        complianceService,
        "InvalidInitialization",
      );

      expect(await complianceService.getBlacklistedWalletsCount()).to.equal(0);
    });

    it("should test onlyProxy modifier behavior with direct deployment", async function () {
      const ComplianceServiceGlobalWhitelisted =
        await hre.ethers.getContractFactory("ComplianceServiceGlobalWhitelisted");
      const directImplementation =
        await ComplianceServiceGlobalWhitelisted.deploy();

      expect(directImplementation).to.not.be.undefined;

      await expect(
        directImplementation.initialize(),
      ).to.be.revertedWithCustomError(
        directImplementation,
        "UUPSUnauthorizedCallContext",
      );
    });
  });

  describe("Blacklist Management", function () {
    it("should add wallet to blacklist with reason", async function () {
      await expect(
        complianceService
          .connect(transferAgent)
          .addToBlacklist(userAddress, reason),
      )
        .to.emit(complianceService, "WalletAddedToBlacklist")
        .withArgs(userAddress, reason, await transferAgent.getAddress());

      expect(await complianceService.isBlacklisted(userAddress)).to.be.true;
      expect(await complianceService.getBlacklistReason(userAddress)).to.equal(
        reason,
      );
    });

    it("should remove wallet from blacklist", async function () {
      // Add to blacklist first
      await complianceService
        .connect(transferAgent)
        .addToBlacklist(userAddress, reason);
      expect(await complianceService.isBlacklisted(userAddress)).to.be.true;

      // Now remove from blacklist
      await expect(
        complianceService
          .connect(transferAgent)
          .removeFromBlacklist(userAddress),
      )
        .to.emit(complianceService, "WalletRemovedFromBlacklist")
        .withArgs(userAddress, await transferAgent.getAddress());

      expect(await complianceService.isBlacklisted(userAddress)).to.be.false;
    });

    it("should reject duplicate blacklist addition", async function () {
      // Add to blacklist first
      await complianceService
        .connect(transferAgent)
        .addToBlacklist(userAddress, "First reason");

      // Try adding again
      await expect(
        complianceService
          .connect(transferAgent)
          .addToBlacklist(userAddress, "Second reason"),
      ).to.be.revertedWith("Wallet already blacklisted");
    });

    it("should reject removal of non-blacklisted wallet", async function () {
      // Try to remove without adding first
      await expect(
        complianceService
          .connect(transferAgent)
          .removeFromBlacklist(userAddress),
      ).to.be.revertedWith("Wallet not blacklisted");
    });

    it("should reject zero address in blacklist", async function () {
      await expect(
        complianceService
          .connect(transferAgent)
          .addToBlacklist(hre.ethers.ZeroAddress, "Invalid"),
      ).to.be.revertedWith("Invalid wallet address");
    });

    describe("Access Control", function () {
      it("should only allow authorized users to manage blacklist", async function () {
        const errorMsg = "Insufficient trust level";

        await expect(
          complianceService.connect(user).addToBlacklist(userAddress, reason),
        ).to.be.revertedWith(errorMsg);

        await expect(
          complianceService.connect(user).removeFromBlacklist(userAddress),
        ).to.be.revertedWith(errorMsg);

        await expect(
          complianceService
            .connect(user)
            .batchAddToBlacklist([userAddress], [reason]),
        ).to.be.revertedWith(errorMsg);

        await expect(
          complianceService
            .connect(user)
            .batchRemoveFromBlacklist([userAddress]),
        ).to.be.revertedWith(errorMsg);
      });
    });
  });

  describe("Batch Operations", function () {
    it("should add multiple wallets to blacklist", async function () {
      const wallets = [userAddress, user2Address];
      const reasons = ["Reason 1", "Reason 2"];

      await complianceService
        .connect(transferAgent)
        .batchAddToBlacklist(wallets, reasons);

      for (let i = 0; i < wallets.length; i++) {
        expect(await complianceService.isBlacklisted(wallets[i])).to.be.true;
        expect(await complianceService.getBlacklistReason(wallets[i])).to.equal(
          reasons[i],
        );
      }
      expect(await complianceService.getBlacklistedWalletsCount()).to.equal(2);
    });

    it("should remove multiple wallets from blacklist", async function () {
      const wallets = [userAddress, user2Address];
      const reasons = ["Reason 1", "Reason 2"];

      await complianceService
        .connect(transferAgent)
        .batchAddToBlacklist(wallets, reasons);
      expect(await complianceService.getBlacklistedWalletsCount()).to.equal(2);

      await complianceService
        .connect(transferAgent)
        .batchRemoveFromBlacklist(wallets);

      for (const wallet of wallets) {
        expect(await complianceService.isBlacklisted(wallet)).to.be.false;
      }
      expect(await complianceService.getBlacklistedWalletsCount()).to.equal(0);
    });

    it("should reject batch operations with mismatched array lengths", async function () {
      const wallets = [userAddress];
      const reasons = ["Reason 1", "Reason 2"];

      await expect(
        complianceService
          .connect(transferAgent)
          .batchAddToBlacklist(wallets, reasons),
      ).to.be.revertedWith(
        "Wallets and reasons arrays must have the same length",
      );
    });
  });

  describe("Transfer Validation", function () {
    it("should allow transfers to non-blacklisted wallets", async function () {
      const resultPreTransferCheck = await complianceService.preTransferCheck(
        userAddress,
        user2Address,
        1000,
      );

      expect(resultPreTransferCheck[0]).to.equal(0);
      expect(resultPreTransferCheck[1]).to.equal("Valid");

      const resultNewPreTransferCheck =
        await complianceService.newPreTransferCheck(
          userAddress,
          user2Address,
          1000,
          1000,
          false,
        );

      expect(resultNewPreTransferCheck[0]).to.equal(0);
      expect(resultNewPreTransferCheck[1]).to.equal("Valid");
    });

    it("should reject transfers to blacklisted wallets", async function () {
      await complianceService
        .connect(transferAgent)
        .addToBlacklist(user2Address, reason);

      const result1 = await complianceService.preTransferCheck(
        userAddress,
        user2Address,
        1000,
      );
      expect(result1[0]).to.equal(100);
      expect(result1[1]).to.equal("Wallet is blacklisted");

      const result2 = await complianceService.newPreTransferCheck(
        userAddress,
        user2Address,
        1000,
        10000,
        false,
      );
      expect(result2[0]).to.equal(100);
      expect(result2[1]).to.equal("Wallet is blacklisted");
    });

    it("should override whitelist check for blacklisted wallets", async function () {
      await complianceService
        .connect(transferAgent)
        .addToBlacklist(userAddress, reason);

      expect(await complianceService.checkWhitelisted(userAddress)).to.be.false;
    });
  });

  describe("Issuance Validation", function () {
    it("should allow issuance to non-blacklisted wallets", async function () {
      const result = await complianceService.preIssuanceCheck(
        userAddress,
        1000,
      );

      expect(result[0]).to.equal(0);
      expect(result[1]).to.equal("Valid");
    });

    it("should reject issuance to blacklisted wallets", async function () {
      await complianceService
        .connect(transferAgent)
        .addToBlacklist(userAddress, reason);

      const result = await complianceService.preIssuanceCheck(
        userAddress,
        1000,
      );
      expect(result[0]).to.equal(100);
      expect(result[1]).to.equal("Wallet is blacklisted");
    });
  });
});
