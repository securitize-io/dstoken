import hre from "hardhat";
import { expect } from "chai";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployDSTokenPermissionless, DAYS } from "./utils/fixture";
import { DSConstants } from "../utils/globals";

describe("DSToken Permissionless — End-to-End", function () {
  const LOCK_PERIOD = 30 * DAYS;
  const reason = "compliance action";

  async function fixture() {
    const contracts = await loadFixture(deployDSTokenPermissionless);
    const {
      dsToken,
      trustService,
      registryService,
      complianceService,
      walletManager,
      blacklistManager,
      complianceConfigurationService,
      bulkOperator,
    } = contracts;

    const [master, transferAgent, user1, user2, issuerWallet] = await hre.ethers.getSigners();

    await trustService.connect(master).setRole(transferAgent, DSConstants.roles.TRANSFER_AGENT);
    await walletManager.addIssuerWallet(issuerWallet);

    const user1Address = await user1.getAddress();
    const user2Address = await user2.getAddress();
    const issuerWalletAddress = await issuerWallet.getAddress();

    return {
      dsToken,
      registryService,
      complianceService,
      walletManager,
      blacklistManager,
      complianceConfigurationService,
      bulkOperator,
      master,
      transferAgent,
      user1,
      user2,
      issuerWallet,
      user1Address,
      user2Address,
      issuerWalletAddress,
    };
  }

  async function fixtureWithLockup() {
    const f = await fixture();
    await f.complianceConfigurationService.setNonUSLockPeriod(LOCK_PERIOD);
    await f.dsToken.issueTokens(f.user1Address, 1_000);
    return f;
  }

  // ─── Deploy & basic setup ─────────────────────────────────────────────────

  describe("Deploy & basic setup", function () {
    it("stub registry: getInvestor returns empty string for any wallet", async function () {
      const { registryService, user1Address } = await fixture();
      expect(await registryService.getInvestor(user1Address)).to.equal("");
    });

    it("stub registry: state-changing calls revert with RegistryDisabled", async function () {
      const { registryService } = await fixture();
      await expect(
        registryService.registerInvestor(
          "inv-001",
          "0x0000000000000000000000000000000000000000000000000000000000000000",
        ),
      ).to.be.revertedWithCustomError(registryService, "RegistryDisabled");
    });

    it("compliance service is deployed and wired", async function () {
      const { complianceService } = await fixture();
      expect(await complianceService.getAddress()).to.not.equal(hre.ethers.ZeroAddress);
    });
  });

  // ─── Mint ─────────────────────────────────────────────────────────────────

  describe("Mint", function () {
    it("issues tokens to any wallet without investor registration", async function () {
      const { dsToken, user1Address, user2Address } = await fixture();
      await dsToken.issueTokens(user1Address, 500);
      await dsToken.issueTokens(user2Address, 300);
      expect(await dsToken.balanceOf(user1Address)).to.equal(500);
      expect(await dsToken.balanceOf(user2Address)).to.equal(300);
    });

    it("rejects issuance to blacklisted wallet", async function () {
      const { dsToken, blacklistManager, transferAgent, user1Address } = await fixture();
      await blacklistManager.connect(transferAgent).addToBlacklist(user1Address, reason);
      await expect(dsToken.issueTokens(user1Address, 100)).to.be.reverted;
    });

    it("total supply increases correctly after issuance", async function () {
      const { dsToken, user1Address } = await fixture();
      const before = await dsToken.totalSupply();
      await dsToken.issueTokens(user1Address, 1_000);
      expect(await dsToken.totalSupply()).to.equal(before + 1_000n);
    });
  });

  // ─── Transfer flow with lockup ────────────────────────────────────────────

  describe("Transfer flow with lockup", function () {
    it("transfer is blocked within lockup window (code 16)", async function () {
      const { dsToken, complianceService, user1Address, user2Address } = await fixtureWithLockup();

      // fixtureWithLockup issued 1000 tokens to user1 — all locked for 30 days from issuance
      const balance = await dsToken.balanceOf(user1Address);
      const locked = await complianceService.lockedAt(user1Address, (await hre.ethers.provider.getBlock("latest"))!.timestamp + 1);
      expect(balance).to.equal(1_000);
      expect(locked).to.equal(1_000); // entire balance is within the lockup window

      // preTransferCheck is a view — simulates compliance outcome without moving tokens
      const check = await complianceService.preTransferCheck(user1Address, user2Address, 1);
      expect(check[0]).to.equal(16); // 16 = tokens locked — even transferring 1 token is blocked
      expect(check[1]).to.equal("Tokens Locked");
    });

    it("actual transfer reverts within lockup window", async function () {
      // Confirms the on-chain transfer also reverts, not just the compliance simulation
      const { dsToken, user1, user2Address } = await fixtureWithLockup();
      await expect(dsToken.connect(user1).transfer(user2Address, 1)).to.be.reverted;
    });

    it("transfer succeeds after lockup window expires", async function () {
      const { dsToken, user1, user1Address, user2Address } = await fixtureWithLockup();
      await time.increase(LOCK_PERIOD + 1);

      await dsToken.connect(user1).transfer(user2Address, 500);
      expect(await dsToken.balanceOf(user2Address)).to.equal(500);
      expect(await dsToken.balanceOf(user1Address)).to.equal(500);
    });

    it("tokens received by transfer carry no lockup", async function () {
      const { dsToken, complianceService, user1, user2, user2Address } = await fixtureWithLockup();
      const user3 = (await hre.ethers.getSigners())[5];
      const user3Address = await user3.getAddress();

      await time.increase(LOCK_PERIOD + 1);
      await dsToken.connect(user1).transfer(user2Address, 500);

      // user2 received via transfer, not issuance — no lockup record was created for user2
      expect(await complianceService.issuancesCount(user2Address)).to.equal(0);
      // preTransferCheck is a view — confirms compliance allows the transfer before executing it
      const check = await complianceService.preTransferCheck(user2Address, user3Address, 500);
      expect(check[0]).to.equal(0); // 0 = valid
      expect(check[1]).to.equal("Valid");
      await dsToken.connect(user2).transfer(user3Address, 500);
      expect(await dsToken.balanceOf(user3Address)).to.equal(500);
    });
  });

  // ─── Blacklist flow ───────────────────────────────────────────────────────

  describe("Blacklist flow", function () {
    it("blacklisting recipient blocks transfer (code 100)", async function () {
      const { dsToken, complianceService, blacklistManager, transferAgent, user1, user1Address, user2Address } =
        await fixture();
      await dsToken.issueTokens(user1Address, 1_000);
      await blacklistManager.connect(transferAgent).addToBlacklist(user2Address, reason);

      // preTransferCheck is a view — simulates compliance outcome without moving tokens
      const check = await complianceService.preTransferCheck(user1Address, user2Address, 100);
      expect(check[0]).to.equal(100); // 100 = wallet blacklisted
      expect(check[1]).to.equal("Wallet is blacklisted");
      // Confirms the on-chain transfer also reverts, not just the compliance simulation
      await expect(dsToken.connect(user1).transfer(user2Address, 100)).to.be.reverted;
    });

    it("blacklisting sender blocks transfer (code 100)", async function () {
      const { dsToken, complianceService, blacklistManager, transferAgent, user1, user1Address, user2Address } =
        await fixture();
      await dsToken.issueTokens(user1Address, 1_000);
      await blacklistManager.connect(transferAgent).addToBlacklist(user1Address, reason);

      // preTransferCheck is a view — simulates compliance outcome without moving tokens
      const check = await complianceService.preTransferCheck(user1Address, user2Address, 100);
      expect(check[0]).to.equal(100); // 100 = wallet blacklisted
      expect(check[1]).to.equal("Wallet is blacklisted");
      // Confirms the on-chain transfer also reverts, not just the compliance simulation
      await expect(dsToken.connect(user1).transfer(user2Address, 100)).to.be.reverted;
    });

    it("removing from blacklist restores transferability", async function () {
      const { dsToken, blacklistManager, transferAgent, user1, user1Address, user2Address } = await fixture();
      await dsToken.issueTokens(user1Address, 1_000);
      await blacklistManager.connect(transferAgent).addToBlacklist(user2Address, reason);

      await expect(dsToken.connect(user1).transfer(user2Address, 100)).to.be.reverted;

      await blacklistManager.connect(transferAgent).removeFromBlacklist(user2Address);
      // After removal the on-chain transfer succeeds
      await dsToken.connect(user1).transfer(user2Address, 100);
      expect(await dsToken.balanceOf(user2Address)).to.equal(100);
    });

    it("blacklisted wallet cannot receive issuance", async function () {
      const { dsToken, blacklistManager, transferAgent, user2Address } = await fixture();
      await blacklistManager.connect(transferAgent).addToBlacklist(user2Address, reason);
      await expect(dsToken.issueTokens(user2Address, 500)).to.be.reverted;
    });
  });

  // ─── Seize ────────────────────────────────────────────────────────────────

  describe("Seize", function () {
    it("TA can seize tokens from any wallet to issuer wallet", async function () {
      const { dsToken, transferAgent, user1Address, issuerWalletAddress } = await fixture();
      await dsToken.issueTokens(user1Address, 500);

      await dsToken.connect(transferAgent).seize(user1Address, issuerWalletAddress, 200, reason);
      expect(await dsToken.balanceOf(user1Address)).to.equal(300);
      expect(await dsToken.balanceOf(issuerWalletAddress)).to.equal(200);
    });

    it("seize succeeds even when sender is blacklisted", async function () {
      const { dsToken, blacklistManager, transferAgent, user1Address, issuerWalletAddress } = await fixture();
      await dsToken.issueTokens(user1Address, 500);
      await blacklistManager.connect(transferAgent).addToBlacklist(user1Address, reason);

      await dsToken.connect(transferAgent).seize(user1Address, issuerWalletAddress, 200, reason);
      expect(await dsToken.balanceOf(user1Address)).to.equal(300);
      expect(await dsToken.balanceOf(issuerWalletAddress)).to.equal(200);
    });

    it("seize on fully-locked wallet succeeds", async function () {
      const { dsToken, transferAgent, user1Address, issuerWalletAddress } = await fixtureWithLockup();

      // seize bypasses lockup — Transfer Agent can always move tokens regardless of lock state
      await dsToken.connect(transferAgent).seize(user1Address, issuerWalletAddress, 500, reason);
      expect(await dsToken.balanceOf(user1Address)).to.equal(500);
      expect(await dsToken.balanceOf(issuerWalletAddress)).to.equal(500);
    });

    it("non-TA cannot seize", async function () {
      const { dsToken, user1, user2, user1Address, issuerWalletAddress } = await fixture();
      await dsToken.issueTokens(user1Address, 500);
      await expect(dsToken.connect(user2).seize(user1Address, issuerWalletAddress, 100, reason)).to.be.reverted;
    });
  });

  // ─── BulkOperator ─────────────────────────────────────────────────────────

  describe("BulkOperator", function () {
    it("bulkIssuance issues tokens to multiple wallets", async function () {
      const { dsToken, bulkOperator, user1Address, user2Address } = await fixture();
      const issuanceTime = await hre.ethers.provider.getBlock("latest").then((b) => b!.timestamp);
      await bulkOperator.bulkIssuance([user1Address, user2Address], [300, 200], issuanceTime);
      expect(await dsToken.balanceOf(user1Address)).to.equal(300);
      expect(await dsToken.balanceOf(user2Address)).to.equal(200);
    });

    it("bulkBurn reduces balances correctly", async function () {
      const { dsToken, bulkOperator, user1Address, user2Address } = await fixture();
      const issuanceTime = await hre.ethers.provider.getBlock("latest").then((b) => b!.timestamp);
      await bulkOperator.bulkIssuance([user1Address, user2Address], [300, 200], issuanceTime);
      await bulkOperator.bulkBurn([user1Address, user2Address], [100, 50]);
      expect(await dsToken.balanceOf(user1Address)).to.equal(200);
      expect(await dsToken.balanceOf(user2Address)).to.equal(150);
    });

    it("bulkRegisterAndIssuance reverts with RegistryDisabled", async function () {
      const { bulkOperator, registryService, user1Address } = await fixture();
      const entry = {
        id: "inv-001",
        to: user1Address,
        issuanceValues: [100, 0],
        reason: "test",
        locksValues: [],
        lockReleaseTimes: [],
        country: "US",
        attributeValues: [1, 1, 1],
        attributeExpirations: [0, 0, 0],
      };
      await expect(bulkOperator.bulkRegisterAndIssuance([entry]))
        .to.be.revertedWithCustomError(registryService, "RegistryDisabled");
    });
  });

  // ─── Full scenario flow ───────────────────────────────────────────────────

  describe("Full scenario flow", function () {
    it("deploy → mint A → lockup check → post-lockup transfer A→B → blacklist B → revert → unblacklist → succeed → seize from A", async function () {
      const {
        dsToken,
        blacklistManager,
        transferAgent,
        user1,
        user1Address,
        user2Address,
        issuerWalletAddress,
      } = await fixtureWithLockup();

      // 1. Tokens locked immediately after issuance
      await expect(dsToken.connect(user1).transfer(user2Address, 100)).to.be.reverted;

      // 2. Advance past lockup — transfer A→B succeeds
      await time.increase(LOCK_PERIOD + 1);
      await dsToken.connect(user1).transfer(user2Address, 100);
      expect(await dsToken.balanceOf(user2Address)).to.equal(100);

      // 3. Blacklist B — transfer A→B reverts
      await blacklistManager.connect(transferAgent).addToBlacklist(user2Address, reason);
      await expect(dsToken.connect(user1).transfer(user2Address, 100)).to.be.reverted;

      // 4. Unblacklist B — transfer A→B succeeds again
      await blacklistManager.connect(transferAgent).removeFromBlacklist(user2Address);
      await dsToken.connect(user1).transfer(user2Address, 100);
      expect(await dsToken.balanceOf(user2Address)).to.equal(200);

      // 5. Seize from A to issuer wallet
      const balanceBefore = await dsToken.balanceOf(user1Address);
      await dsToken.connect(transferAgent).seize(user1Address, issuerWalletAddress, 100, reason);
      expect(await dsToken.balanceOf(user1Address)).to.equal(balanceBefore - 100n);
      expect(await dsToken.balanceOf(issuerWalletAddress)).to.equal(100);
    });
  });
});
