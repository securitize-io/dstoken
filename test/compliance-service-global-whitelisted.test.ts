import hre from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployDSTokenGlobalWhitelisted, INVESTORS } from "./utils/fixture";
import { DSConstants } from "../utils/globals";

describe("ComplianceServiceGlobalWhitelisted", function () {
  let complianceService: any;
  let blacklistManager: any;
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
      blacklistManager: blacklistManager_,
    } = await loadFixture(deployDSTokenGlobalWhitelisted);
    complianceService = complianceService_;
    blacklistManager = blacklistManager_;

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
      expect(await blacklistManager.getBlacklistedWalletsCount()).to.equal(0);
      expect(await blacklistManager.getBlacklistedWallets()).to.deep.equal([]);
    });

    it("should test constructor and initialization functions", async function () {
      await expect(
        complianceService.initialize(),
      ).to.be.revertedWithCustomError(
        complianceService,
        "InvalidInitialization",
      );

      expect(await blacklistManager.getBlacklistedWalletsCount()).to.equal(0);
    });

    it("should test onlyProxy modifier behavior with direct deployment", async function () {
      const ComplianceServiceGlobalWhitelisted =
        await hre.ethers.getContractFactory(
          "ComplianceServiceGlobalWhitelisted",
        );
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

    it("should revert when _initialize is called outside initialization context", async function () {
      const MockComplianceServiceGlobalWhitelisted =
        await hre.ethers.getContractFactory(
          "MockComplianceServiceGlobalWhitelisted",
        );
      const mock = await hre.upgrades.deployProxy(
        MockComplianceServiceGlobalWhitelisted,
        [],
        { initializer: false },
      );

      // First, initialize properly
      await mock.initialize();

      // Now try to call _initialize again outside of initialization
      await expect(mock.exposedInitialize()).to.be.revertedWithCustomError(
        mock,
        "NotInitializing",
      );
    });
  });

  describe("BlackListManager Initialization", function () {
    it("Should throw if already initialized", async function () {
      expect(await blacklistManager.getInitializedVersion()).to.equal(1);
      await expect(blacklistManager.initialize()).to.be.revertedWithCustomError(
        blacklistManager,
        "InvalidInitialization",
      );
    });

    it("Should throw if trying to initialize the implementation contract", async function () {
      const BlackListManager =
        await hre.ethers.getContractFactory("BlackListManager");
      const blmAddress =
        await hre.upgrades.deployImplementation(BlackListManager);
      const blmImplementation = BlackListManager.attach(blmAddress as string);
      await expect(
        blmImplementation.initialize(),
      ).to.be.revertedWithCustomError(
        blmImplementation,
        "UUPSUnauthorizedCallContext",
      );
    });

    it("Should throw if trying to initialize the implementation contract of a proxy", async function () {
      const implementation =
        await hre.upgrades.erc1967.getImplementationAddress(
          await blacklistManager.getAddress(),
        );
      const BlackListManager =
        await hre.ethers.getContractFactory("BlackListManager");
      const blmImplementation = BlackListManager.attach(implementation);
      await expect(
        blmImplementation.initialize(),
      ).to.be.revertedWithCustomError(
        blmImplementation,
        "UUPSUnauthorizedCallContext",
      );
    });
  });

  describe("Blacklist Management", function () {
    it("should add wallet to blacklist with reason", async function () {
      await expect(
        blacklistManager
          .connect(transferAgent)
          .addToBlacklist(userAddress, reason),
      )
        .to.emit(blacklistManager, "WalletAddedToBlacklist")
        .withArgs(userAddress, reason, await transferAgent.getAddress());

      expect(await blacklistManager.isBlacklisted(userAddress)).to.be.true;
      expect(await blacklistManager.getBlacklistReason(userAddress)).to.equal(
        reason,
      );
    });

    it("should remove wallet from blacklist", async function () {
      // Add to blacklist first
      await blacklistManager
        .connect(transferAgent)
        .addToBlacklist(userAddress, reason);
      expect(await blacklistManager.isBlacklisted(userAddress)).to.be.true;

      // Now remove from blacklist
      await expect(
        blacklistManager
          .connect(transferAgent)
          .removeFromBlacklist(userAddress),
      )
        .to.emit(blacklistManager, "WalletRemovedFromBlacklist")
        .withArgs(userAddress, await transferAgent.getAddress());

      expect(await blacklistManager.isBlacklisted(userAddress)).to.be.false;
    });

    it("should reject duplicate blacklist addition", async function () {
      // Add to blacklist first
      await blacklistManager
        .connect(transferAgent)
        .addToBlacklist(userAddress, "First reason");

      // Try adding again
      await expect(
        blacklistManager
          .connect(transferAgent)
          .addToBlacklist(userAddress, "Second reason"),
      ).to.be.revertedWithCustomError(
        blacklistManager,
        "WalletAlreadyBlacklisted",
      );
    });

    it("should reject removal of non-blacklisted wallet", async function () {
      // Try to remove without adding first
      await expect(
        blacklistManager
          .connect(transferAgent)
          .removeFromBlacklist(userAddress),
      ).to.be.revertedWithCustomError(blacklistManager, "WalletNotBlacklisted");
    });

    it("should reject zero address in blacklist", async function () {
      await expect(
        blacklistManager
          .connect(transferAgent)
          .addToBlacklist(hre.ethers.ZeroAddress, "Invalid"),
      ).to.be.revertedWithCustomError(blacklistManager, "ZeroAddressInvalid");
    });

    describe("Access Control", function () {
      it("should only allow authorized users to manage blacklist", async function () {
        const errorMsg = "Insufficient trust level";

        await expect(
          blacklistManager.connect(user).addToBlacklist(userAddress, reason),
        ).to.be.revertedWith(errorMsg);

        await expect(
          blacklistManager.connect(user).removeFromBlacklist(userAddress),
        ).to.be.revertedWith(errorMsg);
      });
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
      await blacklistManager
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
      await blacklistManager
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
      await blacklistManager
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

  describe("Transferable Tokens", function () {
    it("should return transferable tokens for non-blacklisted wallets", async function () {
      const currentTime = await hre.ethers.provider.getBlock("latest").then(block => block!.timestamp);
      const transferableTokens = await complianceService.getComplianceTransferableTokens(
        userAddress,
        currentTime + 1,
        0,
      );

      // Can transfer all tokens as not blacklisted
      expect(transferableTokens).to.equal(1000);
    });

    it("should return 0 transferable tokens for blacklisted wallets", async function () {
      await blacklistManager
        .connect(transferAgent)
        .addToBlacklist(userAddress, reason);

      const currentTime = await hre.ethers.provider.getBlock("latest").then(block => block!.timestamp);
      const transferableTokens = await complianceService.getComplianceTransferableTokens(
        userAddress,
        currentTime + 1,
        0,
      );

      expect(transferableTokens).to.equal(0);
    });
  });
});
