import hre from "hardhat";
import { expect } from "chai";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployDSTokenPermissionless, DAYS } from "./utils/fixture";
import { DSConstants } from "../utils/globals";

describe("ComplianceServicePermissionless", function () {
  const reason = "freeze reason";

  async function fixture() {
    const contracts = await loadFixture(deployDSTokenPermissionless);
    const {
      dsToken,
      trustService,
      complianceService,
      blacklistManager,
      complianceConfigurationService,
    } = contracts;

    const [master, transferAgent, user1, user2, platformWallet] = await hre.ethers.getSigners();

    await trustService.connect(master).setRole(transferAgent, DSConstants.roles.TRANSFER_AGENT);

    const user1Address = await user1.getAddress();
    const user2Address = await user2.getAddress();

    await dsToken.issueTokens(user1Address, 1_000);

    return {
      dsToken,
      complianceService,
      blacklistManager,
      complianceConfigurationService,
      transferAgent,
      user1,
      user2,
      user1Address,
      user2Address,
      platformWallet,
    };
  }

  // ─── Iter 1: Basic permissionless behavior ───────────────────────────────

  describe("Basic permissionless behavior", function () {
    it("allows transfer between any two non-blacklisted wallets (no registry required)", async function () {
      const { dsToken, complianceService, user1, user2Address } = await fixture();
      const user1Address = await user1.getAddress();

      // preTransferCheck is a view — simulates compliance outcome without moving tokens
      const check = await complianceService.preTransferCheck(user1Address, user2Address, 250);
      expect(check[0]).to.equal(0); // 0 = valid
      expect(check[1]).to.equal("Valid");

      await dsToken.connect(user1).transfer(user2Address, 250);
      expect(await dsToken.balanceOf(user2Address)).to.equal(250);
    });

    it("allows issuance to any non-blacklisted wallet", async function () {
      const { dsToken, user2Address } = await fixture();
      await expect(dsToken.issueTokens(user2Address, 500)).to.not.be.reverted;
      expect(await dsToken.balanceOf(user2Address)).to.equal(500);
    });

    it("rejects transfer when sender is blacklisted (code 100)", async function () {
      const { complianceService, blacklistManager, transferAgent, user1Address, user2Address } = await fixture();
      await blacklistManager.connect(transferAgent).addToBlacklist(user1Address, reason);

      // preTransferCheck is a view — simulates compliance outcome without moving tokens
      const check = await complianceService.preTransferCheck(user1Address, user2Address, 100);
      expect(check[0]).to.equal(100); // 100 = wallet blacklisted
      expect(check[1]).to.equal("Wallet is blacklisted");
    });

    it("rejects transfer when recipient is blacklisted (code 100)", async function () {
      const { complianceService, blacklistManager, transferAgent, user1Address, user2Address } = await fixture();
      await blacklistManager.connect(transferAgent).addToBlacklist(user2Address, reason);

      // preTransferCheck is a view — simulates compliance outcome without moving tokens
      const check = await complianceService.preTransferCheck(user1Address, user2Address, 100);
      expect(check[0]).to.equal(100); // 100 = wallet blacklisted
      expect(check[1]).to.equal("Wallet is blacklisted");
    });

    it("restores transferability after removing from blacklist", async function () {
      const { complianceService, blacklistManager, transferAgent, user1Address, user2Address } = await fixture();
      await blacklistManager.connect(transferAgent).addToBlacklist(user2Address, reason);
      // preTransferCheck is a view — simulates compliance outcome without moving tokens
      let check = await complianceService.preTransferCheck(user1Address, user2Address, 100);
      expect(check[0]).to.equal(100); // 100 = wallet blacklisted

      await blacklistManager.connect(transferAgent).removeFromBlacklist(user2Address);
      check = await complianceService.preTransferCheck(user1Address, user2Address, 100);
      expect(check[0]).to.equal(0); // 0 = valid — blacklist removal takes effect immediately
    });

    it("rejects transfer when token is paused (code 10)", async function () {
      const { complianceService, user1Address, user2Address } = await fixture();
      // newPreTransferCheck accepts balance and paused flag directly — allows testing without state changes
      const check = await complianceService.newPreTransferCheck(user1Address, user2Address, 100, 1000, true);
      expect(check[0]).to.equal(10); // 10 = token paused
    });

    it("rejects transfer when balance is insufficient (code 15)", async function () {
      const { complianceService, user1Address, user2Address } = await fixture();
      // value (2000) > balanceFrom (1000) — triggers insufficient balance check
      const check = await complianceService.newPreTransferCheck(user1Address, user2Address, 2000, 1000, false);
      expect(check[0]).to.equal(15); // 15 = insufficient balance
    });

    it("rejects issuance to blacklisted wallet (code 100)", async function () {
      const { complianceService, blacklistManager, transferAgent, user1Address } = await fixture();
      await blacklistManager.connect(transferAgent).addToBlacklist(user1Address, reason);

      // preIssuanceCheck is a view — simulates compliance outcome without minting tokens
      const check = await complianceService.preIssuanceCheck(user1Address, 500);
      expect(check[0]).to.equal(100); // 100 = wallet blacklisted
      expect(check[1]).to.equal("Wallet is blacklisted");
    });

    it("rejects issuance to zero address (code 101)", async function () {
      const { complianceService } = await fixture();
      // preIssuanceCheck is a view — simulates compliance outcome without minting tokens
      const check = await complianceService.preIssuanceCheck(hre.ethers.ZeroAddress, 500);
      expect(check[0]).to.equal(101); // 101 = zero address
      expect(check[1]).to.equal("Zero address");
    });

    it("returns full balance as transferable when no lockup configured", async function () {
      const { complianceService, user1Address } = await fixture();
      const currentTime = (await hre.ethers.provider.getBlock("latest"))!.timestamp;

      const transferable = await complianceService.getComplianceTransferableTokens(user1Address, currentTime + 1, 0);
      expect(transferable).to.equal(1_000);
    });

    it("returns 0 transferable tokens when blacklisted", async function () {
      const { complianceService, blacklistManager, transferAgent, user1Address } = await fixture();
      await blacklistManager.connect(transferAgent).addToBlacklist(user1Address, reason);

      const currentTime = (await hre.ethers.provider.getBlock("latest"))!.timestamp;
      const transferable = await complianceService.getComplianceTransferableTokens(user1Address, currentTime + 1, 0);
      expect(transferable).to.equal(0);
    });

    it("stub registry: getInvestor returns empty string for any wallet", async function () {
      const contracts = await loadFixture(deployDSTokenPermissionless);
      const [, , user] = await hre.ethers.getSigners();
      expect(await contracts.registryService.getInvestor(await user.getAddress())).to.equal("");
    });
  });

  // ─── Iter 2: Lockup behavior ──────────────────────────────────────────────

  describe("Lockup", function () {
    const LOCK_PERIOD = 30 * DAYS;

    async function fixtureWithLockup() {
      const f = await fixture();
      await f.complianceConfigurationService.setNonUSLockPeriod(LOCK_PERIOD);
      return f;
    }

    it("tokens are locked immediately after issuance during lockup window", async function () {
      const { dsToken, complianceService, user1Address, user2Address } = await fixtureWithLockup();

      // fixture issued 1000 tokens to user1 — all locked for 30 days from issuance
      const balance = await dsToken.balanceOf(user1Address);
      const locked = await complianceService.lockedAt(user1Address, (await hre.ethers.provider.getBlock("latest"))!.timestamp + 1);
      expect(balance).to.equal(1_000);
      expect(locked).to.equal(1_000); // entire balance is within the lockup window

      // preTransferCheck is a view — simulates compliance outcome without moving tokens
      const check = await complianceService.preTransferCheck(user1Address, user2Address, 1);
      expect(check[0]).to.equal(16); // 16 = tokens locked — even transferring 1 token is blocked
      expect(check[1]).to.equal("Tokens Locked");
    });

    it("tokens become transferable after lockup window expires", async function () {
      const { complianceService, user1Address, user2Address } = await fixtureWithLockup();

      await time.increase(LOCK_PERIOD + 1);

      // preTransferCheck is a view — simulates compliance outcome without moving tokens
      const check = await complianceService.preTransferCheck(user1Address, user2Address, 1_000);
      expect(check[0]).to.equal(0); // 0 = valid — lockup expired
      expect(check[1]).to.equal("Valid");
    });

    it("received-by-transfer tokens carry no lockup", async function () {
      const { dsToken, complianceService, user1, user2, user2Address } = await fixtureWithLockup();
      const user3 = (await hre.ethers.getSigners())[5];
      const user3Address = await user3.getAddress();

      // Advance time so user1 can transfer
      await time.increase(LOCK_PERIOD + 1);

      // user1 → user2 (post-lockup)
      await dsToken.connect(user1).transfer(user2Address, 500);
      expect(await dsToken.balanceOf(user2Address)).to.equal(500);

      // user2 received via transfer, not issuance — no lockup record was created for user2
      expect(await complianceService.issuancesCount(user2Address)).to.equal(0);
      // preTransferCheck is a view — simulates compliance outcome without moving tokens
      const check = await complianceService.preTransferCheck(user2Address, user3Address, 500);
      expect(check[0]).to.equal(0); // 0 = valid
      expect(check[1]).to.equal("Valid");
    });

    it("platform wallet issuance creates no lockup record", async function () {
      const { dsToken, complianceService, platformWallet } = await fixtureWithLockup();
      const contracts = await loadFixture(deployDSTokenPermissionless);
      const platformWalletAddress = await platformWallet.getAddress();

      await contracts.walletManager.addPlatformWallet(platformWalletAddress);
      await dsToken.issueTokens(platformWalletAddress, 500);

      expect(await complianceService.issuancesCount(platformWalletAddress)).to.equal(0);
    });

    it("getNonUSLockPeriod == 0 disables lockup completely", async function () {
      const { complianceService, user1Address, user2Address } = await fixture();
      // lockPeriod is 0 by default — all tokens freely transferable regardless of issuance records
      // preTransferCheck is a view — simulates compliance outcome without moving tokens
      const check = await complianceService.preTransferCheck(user1Address, user2Address, 1_000);
      expect(check[0]).to.equal(0); // 0 = valid
      expect(check[1]).to.equal("Valid");
    });

    it("partial unlock: only portion within window is locked", async function () {
      const contracts = await loadFixture(deployDSTokenPermissionless);
      const { dsToken, complianceService, complianceConfigurationService, trustService } = contracts;
      const [master, ta, user] = await hre.ethers.getSigners();
      await trustService.connect(master).setRole(ta, DSConstants.roles.TRANSFER_AGENT);
      const userAddress = await user.getAddress();
      const recipientAddress = (await hre.ethers.getSigners())[5].getAddress();

      await complianceConfigurationService.setNonUSLockPeriod(LOCK_PERIOD);

      // Issue 600 tokens now
      await dsToken.issueTokens(userAddress, 600);

      // Advance 20 days — first issuance still locked (expires at 30 days)
      await time.increase(20 * DAYS);

      // Issue 400 more tokens (locked for next 30 days)
      await dsToken.issueTokens(userAddress, 400);

      // Advance another 11 days → first issuance (30 days) expires, second is 11/30
      await time.increase(11 * DAYS);

      // First batch (600) unlocked, second batch (400) still locked
      // Total balance: 1000, locked: 400 → max transferable: 600
      const locked = await complianceService.lockedAt(userAddress, (await hre.ethers.provider.getBlock("latest"))!.timestamp + 1);
      expect(locked).to.equal(400); // second batch still within lockup window

      // preTransferCheck is a view — simulates compliance outcome without moving tokens
      const check = await complianceService.preTransferCheck(userAddress, await recipientAddress, 601);
      expect(check[0]).to.equal(16); // 16 = tokens locked — trying to transfer 601 exceeds unlocked 600
      expect(check[1]).to.equal("Tokens Locked");

      const ok = await complianceService.preTransferCheck(userAddress, await recipientAddress, 600);
      expect(ok[0]).to.equal(0); // 0 = valid — exactly the unlocked amount
      expect(ok[1]).to.equal("Valid");
    });

    it("issuancesCount tracks records correctly", async function () {
      const { dsToken, complianceService, user1Address } = await fixtureWithLockup();
      expect(await complianceService.issuancesCount(user1Address)).to.equal(1);

      await dsToken.issueTokens(user1Address, 200);
      expect(await complianceService.issuancesCount(user1Address)).to.equal(2);
    });

    it("expired records are swept on next issuance", async function () {
      const { dsToken, complianceService, user1Address } = await fixtureWithLockup();
      expect(await complianceService.issuancesCount(user1Address)).to.equal(1);

      await time.increase(LOCK_PERIOD + 1);

      // Next issuance sweeps the expired record before adding new one
      await dsToken.issueTokens(user1Address, 200);
      expect(await complianceService.issuancesCount(user1Address)).to.equal(1);
    });

    it("getComplianceTransferableTokens reflects locked amount", async function () {
      const { complianceService, user1Address } = await fixtureWithLockup();
      const now = (await hre.ethers.provider.getBlock("latest"))!.timestamp;

      // getComplianceTransferableTokens returns balance minus locked amount at a given time
      const transferable = await complianceService.getComplianceTransferableTokens(user1Address, now + 1, 0);
      expect(transferable).to.equal(0); // all 1000 tokens locked — transferable = balance - locked = 0

      // After lockup expires, full balance becomes transferable
      const future = now + LOCK_PERIOD + 2;
      const transferableFuture = await complianceService.getComplianceTransferableTokens(user1Address, future, 0);
      expect(transferableFuture).to.equal(1_000);
    });

    it("lockedAt returns 0 when lockPeriod is 0", async function () {
      const { complianceService, user1Address } = await fixture();
      const now = (await hre.ethers.provider.getBlock("latest"))!.timestamp;
      expect(await complianceService.lockedAt(user1Address, now + 1)).to.equal(0);
    });

    it("issuance cap: reverts when MAX_ISSUANCES_PER_WALLET (30) exceeded", async function () {
      const contracts = await loadFixture(deployDSTokenPermissionless);
      const { dsToken, complianceConfigurationService, trustService } = contracts;
      const [master] = await hre.ethers.getSigners();
      const user = (await hre.ethers.getSigners())[6];
      const userAddress = await user.getAddress();

      await complianceConfigurationService.setNonUSLockPeriod(365 * DAYS);

      // Issue 30 times (max)
      for (let i = 0; i < 30; i++) {
        await dsToken.issueTokens(userAddress, 1);
      }

      // 31st issuance should revert
      await expect(dsToken.issueTokens(userAddress, 1)).to.be.revertedWith("Issuance cap reached");
    });
  });
});
