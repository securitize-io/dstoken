import hre from "hardhat";
import { expect } from "chai";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployDSTokenPermissionless, deployDSTokenPermissionlessWithGlobalDenylist, DAYS } from "./utils/fixture";
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
      const contracts = await loadFixture(deployDSTokenPermissionless);
      const { dsToken, trustService, complianceService, blacklistManager, complianceConfigurationService } = contracts;
      const [master, transferAgent, user1, user2, platformWallet] = await hre.ethers.getSigners();
      await trustService.connect(master).setRole(transferAgent, DSConstants.roles.TRANSFER_AGENT);
      const user1Address = await user1.getAddress();
      const user2Address = await user2.getAddress();
      // Set lockup BEFORE issuance so the record is written and tokens are correctly locked
      await complianceConfigurationService.setNonUSLockPeriod(LOCK_PERIOD);
      await dsToken.issueTokens(user1Address, 1_000);
      return { dsToken, complianceService, blacklistManager, complianceConfigurationService, transferAgent, user1, user2, user1Address, user2Address, platformWallet };
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

    it("overflow-safe lockup: enormous lockPeriod does not brick transfers (lockedAt)", async function () {
      // Regression for: ts + lockPeriod overflow in _lockedAt when lockPeriod is near uint256 max.
      // With Solidity 0.8 checked arithmetic the addition reverts, permanently bricking preTransferCheck.
      // Fix: replace `ts + lockPeriod > _time` with `lockPeriod > _time - ts` (no addition).
      const contracts = await loadFixture(deployDSTokenPermissionless);
      const { dsToken, complianceService, complianceConfigurationService } = contracts;
      const user = (await hre.ethers.getSigners())[6];
      const recipient = (await hre.ethers.getSigners())[7];
      const userAddress = await user.getAddress();

      // Set an astronomically large lock period that would overflow uint256 when added to any timestamp
      const HUGE_LOCK_PERIOD = hre.ethers.MaxUint256;
      await complianceConfigurationService.setNonUSLockPeriod(HUGE_LOCK_PERIOD);
      await dsToken.issueTokens(userAddress, 500);

      // _lockedAt must not revert — everything is locked (can't transfer any amount)
      const now = (await hre.ethers.provider.getBlock("latest"))!.timestamp;
      const locked = await complianceService.lockedAt(userAddress, now + 1);
      expect(locked).to.equal(500); // entire balance locked

      const check = await complianceService.preTransferCheck(userAddress, await recipient.getAddress(), 1);
      expect(check[0]).to.equal(16); // 16 = tokens locked — must not revert
    });

    it("overflow-safe lockup: enormous lockPeriod does not brick issuance (cleanupIssuances)", async function () {
      // Regression for: ts + lockPeriod overflow in _cleanupIssuances when lockPeriod is near uint256 max.
      // Fix: early return `if (lockPeriod > block.timestamp) return` and rewrite condition to `ts <= block.timestamp - lockPeriod`.
      const contracts = await loadFixture(deployDSTokenPermissionless);
      const { dsToken, complianceService, complianceConfigurationService } = contracts;
      const user = (await hre.ethers.getSigners())[6];
      const userAddress = await user.getAddress();

      const HUGE_LOCK_PERIOD = hre.ethers.MaxUint256;
      await complianceConfigurationService.setNonUSLockPeriod(HUGE_LOCK_PERIOD);

      // First issuance records a lockup entry
      await dsToken.issueTokens(userAddress, 100);
      expect(await complianceService.issuancesCount(userAddress)).to.equal(1);

      // Second issuance runs _cleanupIssuances — must not revert due to overflow
      await expect(dsToken.issueTokens(userAddress, 100)).to.not.be.reverted;
      // Nothing was cleaned up (huge lockPeriod → nothing expires) → count grows to 2
      expect(await complianceService.issuancesCount(userAddress)).to.equal(2);
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

    describe("BC-2189: validateIssuanceTime respects disallowBackDating in Permissionless", function () {
      it("with disallowBackDating=true, a MaxUint256 issuance time is capped to block.timestamp", async function () {
        // Variant B: issuer passes type(uint256).max as issuanceTime.
        // With disallowBackDating=true the base class always returns block.timestamp,
        // so the record is written at now, not MaxUint256 — lockup expires normally.
        const contracts = await loadFixture(deployDSTokenPermissionless);
        const { dsToken, complianceService, complianceConfigurationService } = contracts;
        const user = (await hre.ethers.getSigners())[6];
        const userAddress = await user.getAddress();

        await complianceConfigurationService.setNonUSLockPeriod(30 * DAYS);
        await complianceConfigurationService.setDisallowBackDating(true);

        await dsToken.issueTokensCustom(userAddress, 100, hre.ethers.MaxUint256, 0, '', 0);
        expect(await dsToken.balanceOf(userAddress)).to.equal(100);

        // Within the lockup window the tokens are locked
        expect(await complianceService.lockedAt(userAddress, await time.latest())).to.equal(100);

        // After the lockup window expires the wallet is free — proving the timestamp was capped
        await time.increase(30 * DAYS + 1);
        expect(await complianceService.lockedAt(userAddress, await time.latest())).to.equal(0);
      });

      it("with disallowBackDating=false (default), a backdated issuance time is preserved", async function () {
        // Backdating is intentional: issuance time reflects when the investment was made off-chain.
        // A past issuance time 31 days ago makes the 30-day lockup already expired at mint time.
        const contracts = await loadFixture(deployDSTokenPermissionless);
        const { dsToken, complianceService, complianceConfigurationService } = contracts;
        const user = (await hre.ethers.getSigners())[6];
        const userAddress = await user.getAddress();

        await complianceConfigurationService.setNonUSLockPeriod(30 * DAYS);
        // disallowBackDating = false by default

        const pastIssuanceTime = (await time.latest()) - 31 * DAYS;
        await dsToken.issueTokensCustom(userAddress, 100, pastIssuanceTime, 0, '', 0);
        expect(await dsToken.balanceOf(userAddress)).to.equal(100);

        // Lockup already expired because the backdated timestamp is 31 days in the past
        expect(await complianceService.lockedAt(userAddress, await time.latest())).to.equal(0);
      });
    });

    it("period-0 mint writes no record — enabling lockup later does not retroactively lock the holder", async function () {
      // Regression for BC-2187: recordIssuance unconditionally wrote a record even when
      // lockPeriod == 0, causing _lockedAt to retroactively lock the holder when a TA
      // later enables a non-zero lockup anchored to the original mint timestamp.
      const contracts = await loadFixture(deployDSTokenPermissionless);
      const { dsToken, complianceService, complianceConfigurationService, trustService } = contracts;
      const [master, transferAgent, user1, user2] = await hre.ethers.getSigners();
      await trustService.connect(master).setRole(transferAgent, DSConstants.roles.TRANSFER_AGENT);
      const user1Address = await user1.getAddress();
      const user2Address = await user2.getAddress();

      // Mint while lockPeriod == 0 — no record should be written
      expect(await complianceConfigurationService.getNonUSLockPeriod()).to.equal(0);
      await dsToken.issueTokens(user1Address, 1_000);
      expect(await complianceService.issuancesCount(user1Address)).to.equal(0);

      // Transfer Agent enables a 30-day lockup for go-forward issuances
      await time.increase(1 * DAYS);
      await complianceConfigurationService.connect(transferAgent).setNonUSLockPeriod(30 * DAYS);

      // The period-0 mint must NOT be retroactively locked
      const check = await complianceService.preTransferCheck(user1Address, user2Address, 1_000);
      expect(check[0]).to.equal(0); // 0 = valid — old mint is unaffected by new lockup
      expect(check[1]).to.equal("Valid");
      await dsToken.connect(user1).transfer(user2Address, 1_000);
      expect(await dsToken.balanceOf(user2Address)).to.equal(1_000);
    });

    it("period-0 mint writes no record — new mints after lockup is enabled are correctly locked", async function () {
      // Confirms the fix is scoped: only period-0 mints skip the record.
      // Mints after a non-zero lockup is configured must still create records and lock tokens.
      const contracts = await loadFixture(deployDSTokenPermissionless);
      const { dsToken, complianceService, complianceConfigurationService, trustService } = contracts;
      const [master, transferAgent, user1, user2] = await hre.ethers.getSigners();
      await trustService.connect(master).setRole(transferAgent, DSConstants.roles.TRANSFER_AGENT);
      const user1Address = await user1.getAddress();
      const user2Address = await user2.getAddress();

      // Enable lockup first, then mint
      await complianceConfigurationService.connect(transferAgent).setNonUSLockPeriod(30 * DAYS);
      await dsToken.issueTokens(user1Address, 1_000);

      // Record must exist and tokens must be locked
      expect(await complianceService.issuancesCount(user1Address)).to.equal(1);
      const check = await complianceService.preTransferCheck(user1Address, user2Address, 1_000);
      expect(check[0]).to.equal(16); // 16 = tokens locked
      expect(check[1]).to.equal("Tokens Locked");
    });

    describe("BC-2190: platform wallet label does not bypass active lockup", function () {
      it("labeling a locked wallet as platform does not let it transfer locked tokens", async function () {
        // Attack: wallet receives tokens (lockup records written), then Issuer calls addPlatformWallet
        // to escape the lockup via the isPlatformWallet bypass that was removed.
        const contracts = await loadFixture(deployDSTokenPermissionless);
        const { dsToken, complianceService, complianceConfigurationService, walletManager } = contracts;
        const user = (await hre.ethers.getSigners())[6];
        const recipient = (await hre.ethers.getSigners())[7];
        const userAddress = await user.getAddress();
        const recipientAddress = await recipient.getAddress();

        await complianceConfigurationService.setNonUSLockPeriod(30 * DAYS);
        await dsToken.issueTokens(userAddress, 100);

        // Tokens are locked
        let check = await complianceService.preTransferCheck(userAddress, recipientAddress, 1);
        expect(check[0]).to.equal(16); // 16 = tokens locked

        // Issuer labels the wallet as platform (guard is inert under StubRegistryService)
        await walletManager.addPlatformWallet(userAddress);
        expect(await walletManager.isPlatformWallet(userAddress)).to.equal(true);

        // Lockup is still enforced — labeling as platform does not bypass existing lockup records
        check = await complianceService.preTransferCheck(userAddress, recipientAddress, 1);
        expect(check[0]).to.equal(16); // 16 = tokens locked — bypass closed
      });

      it("legitimate platform wallet (registered before issuance) has no lockup records and transfers freely", async function () {
        // A wallet added as platform BEFORE receiving tokens has no lockup records because
        // recordIssuance skips writing records for platform wallets.
        // Confirms the fix does not break the intended platform wallet exemption.
        const contracts = await loadFixture(deployDSTokenPermissionless);
        const { dsToken, complianceService, complianceConfigurationService, walletManager } = contracts;
        const platformWallet = (await hre.ethers.getSigners())[6];
        const recipient = (await hre.ethers.getSigners())[7];
        const platformWalletAddress = await platformWallet.getAddress();
        const recipientAddress = await recipient.getAddress();

        await complianceConfigurationService.setNonUSLockPeriod(30 * DAYS);

        // Register as platform BEFORE issuance — no lockup records will be written
        await walletManager.addPlatformWallet(platformWalletAddress);
        await dsToken.issueTokens(platformWalletAddress, 100);

        // No lockup records — _lockedAt returns 0 — transfer is free
        expect(await complianceService.issuancesCount(platformWalletAddress)).to.equal(0);
        const check = await complianceService.preTransferCheck(platformWalletAddress, recipientAddress, 100);
        expect(check[0]).to.equal(0); // 0 = valid — no lockup records, transfers freely
      });
    });
  });

  // ─── BC-2349: Global denylist ───────────────────────────────────────────

  describe("Global denylist (BC-2349)", function () {
    async function fixtureWithGlobalDenylist() {
      const contracts = await loadFixture(deployDSTokenPermissionlessWithGlobalDenylist);
      const { dsToken, trustService, complianceService, walletManager, blacklistManager, globalDenylistManager } = contracts;
      const [master, transferAgent, user1, user2, issuerWallet] = await hre.ethers.getSigners();
      await trustService.connect(master).setRole(transferAgent, DSConstants.roles.TRANSFER_AGENT);
      await walletManager.addIssuerWallet(issuerWallet);
      const user1Address = await user1.getAddress();
      const user2Address = await user2.getAddress();
      const issuerWalletAddress = await issuerWallet.getAddress();

      await dsToken.issueTokens(user1Address, 1_000);

      return {
        dsToken,
        complianceService,
        blacklistManager,
        globalDenylistManager,
        transferAgent,
        user1,
        user2,
        user1Address,
        user2Address,
        issuerWalletAddress,
      };
    }

    it("global denylist hit short-circuits before the local check runs", async function () {
      // Point BLACKLIST_MANAGER at a contract with no isBlacklisted() function at all — if
      // the local check ran, the call would revert (no matching function, no fallback).
      // The transfer must still be rejected cleanly with code 102, proving the global hit
      // short-circuits before the local check is ever consulted.
      const { dsToken, complianceService, globalDenylistManager, user1Address, user2Address } = await fixtureWithGlobalDenylist();

      const revertingMock = await hre.ethers.deployContract("RevertingGlobalDenyListManagerMock");
      await complianceService.setDSService(DSConstants.services.BLACKLIST_MANAGER, await revertingMock.getAddress());

      await globalDenylistManager.setGloballyDenylisted(user1Address, true);

      const check = await complianceService.preTransferCheck(user1Address, user2Address, 100);
      expect(check[0]).to.equal(102);
      expect(check[1]).to.equal("Wallet is globally denylisted");
    });

    it("newPreTransferCheck rejects with 102 when sender is globally denylisted", async function () {
      const { complianceService, globalDenylistManager, user1Address, user2Address } = await fixtureWithGlobalDenylist();
      await globalDenylistManager.setGloballyDenylisted(user1Address, true);

      const check = await complianceService.newPreTransferCheck(user1Address, user2Address, 100, 1_000, false);
      expect(check[0]).to.equal(102);
      expect(check[1]).to.equal("Wallet is globally denylisted");
    });

    it("newPreTransferCheck rejects with 102 when recipient is globally denylisted", async function () {
      const { complianceService, globalDenylistManager, user1Address, user2Address } = await fixtureWithGlobalDenylist();
      await globalDenylistManager.setGloballyDenylisted(user2Address, true);

      const check = await complianceService.newPreTransferCheck(user1Address, user2Address, 100, 1_000, false);
      expect(check[0]).to.equal(102);
      expect(check[1]).to.equal("Wallet is globally denylisted");
    });

    it("preTransferCheck rejects with 102 when sender is globally denylisted", async function () {
      const { complianceService, globalDenylistManager, user1Address, user2Address } = await fixtureWithGlobalDenylist();
      await globalDenylistManager.setGloballyDenylisted(user1Address, true);

      const check = await complianceService.preTransferCheck(user1Address, user2Address, 100);
      expect(check[0]).to.equal(102);
      expect(check[1]).to.equal("Wallet is globally denylisted");
    });

    it("transfer() reverts end-to-end when either party is globally denylisted", async function () {
      const { dsToken, globalDenylistManager, user1, user1Address, user2Address } = await fixtureWithGlobalDenylist();
      await globalDenylistManager.setGloballyDenylisted(user2Address, true);

      await expect(dsToken.connect(user1).transfer(user2Address, 100)).to.be.revertedWith("Wallet is globally denylisted");
      expect(await dsToken.balanceOf(user1Address)).to.equal(1_000);
    });

    it("preIssuanceCheck rejects issuance to a globally denylisted recipient with code 102", async function () {
      const { complianceService, globalDenylistManager, user2Address } = await fixtureWithGlobalDenylist();
      await globalDenylistManager.setGloballyDenylisted(user2Address, true);

      const check = await complianceService.preIssuanceCheck(user2Address, 500);
      expect(check[0]).to.equal(102);
      expect(check[1]).to.equal("Wallet is globally denylisted");
    });

    it("creates no lockup record when issuance is rejected for global denylist", async function () {
      const { dsToken, complianceService, globalDenylistManager, user2Address } = await fixtureWithGlobalDenylist();
      await globalDenylistManager.setGloballyDenylisted(user2Address, true);

      await expect(dsToken.issueTokens(user2Address, 500)).to.be.reverted;
      expect(await complianceService.issuancesCount(user2Address)).to.equal(0);
    });

    it("getComplianceTransferableTokens returns 0 for a globally denylisted wallet with zero lockup configured", async function () {
      const { complianceService, globalDenylistManager, user1Address } = await fixtureWithGlobalDenylist();
      await globalDenylistManager.setGloballyDenylisted(user1Address, true);

      const currentTime = (await hre.ethers.provider.getBlock("latest"))!.timestamp;
      const transferable = await complianceService.getComplianceTransferableTokens(user1Address, currentTime + 1, 0);
      expect(transferable).to.equal(0);
    });

    it("getComplianceTransferableTokens returns 0 for a globally denylisted wallet regardless of active lockup", async function () {
      const contracts = await loadFixture(deployDSTokenPermissionlessWithGlobalDenylist);
      const { dsToken, complianceService, complianceConfigurationService, globalDenylistManager } = contracts;
      const user = (await hre.ethers.getSigners())[6];
      const userAddress = await user.getAddress();

      await complianceConfigurationService.setNonUSLockPeriod(30 * DAYS);
      await dsToken.issueTokens(userAddress, 500);
      await globalDenylistManager.setGloballyDenylisted(userAddress, true);

      const now = (await hre.ethers.provider.getBlock("latest"))!.timestamp;
      expect(await complianceService.getComplianceTransferableTokens(userAddress, now + 1, 0)).to.equal(0);
    });

    it("both sender and recipient are checked — denylisting only the recipient still rejects with 102", async function () {
      const { complianceService, globalDenylistManager, user1Address, user2Address } = await fixtureWithGlobalDenylist();
      await globalDenylistManager.setGloballyDenylisted(user2Address, true);

      const check = await complianceService.preTransferCheck(user1Address, user2Address, 100);
      expect(check[0]).to.equal(102);
    });

    it("burn() succeeds against a globally denylisted wallet", async function () {
      const { dsToken, globalDenylistManager, user1Address } = await fixtureWithGlobalDenylist();
      await globalDenylistManager.setGloballyDenylisted(user1Address, true);

      await expect(dsToken.burn(user1Address, 100, "seize sanctioned wallet")).to.not.be.reverted;
      expect(await dsToken.balanceOf(user1Address)).to.equal(900);
    });

    it("seize() succeeds moving tokens from a globally denylisted wallet", async function () {
      const { dsToken, globalDenylistManager, user1Address, issuerWalletAddress } = await fixtureWithGlobalDenylist();
      await globalDenylistManager.setGloballyDenylisted(user1Address, true);

      await expect(dsToken.seize(user1Address, issuerWalletAddress, 100, "seize sanctioned wallet")).to.not.be.reverted;
      expect(await dsToken.balanceOf(issuerWalletAddress)).to.equal(100);
    });

    it("global manager unset (address(0)) falls back to local-only check", async function () {
      // deployDSTokenPermissionless (no global manager wired) — GLOBAL_DENYLIST_MANAGER stays address(0).
      const contracts = await loadFixture(deployDSTokenPermissionless);
      const { dsToken, trustService, complianceService, blacklistManager } = contracts;
      const [master, transferAgent, user1, user2] = await hre.ethers.getSigners();
      await trustService.connect(master).setRole(transferAgent, DSConstants.roles.TRANSFER_AGENT);
      const user1Address = await user1.getAddress();
      const user2Address = await user2.getAddress();
      await dsToken.issueTokens(user1Address, 1_000);

      await blacklistManager.connect(transferAgent).addToBlacklist(user1Address, "local reason");

      const check = await complianceService.preTransferCheck(user1Address, user2Address, 100);
      expect(check[0]).to.equal(100); // local hit, not 102 — proves fail-open on unset global
      expect(check[1]).to.equal("Wallet is blacklisted");
    });

    it("local manager unset (address(0)) does not revert — BC-1646 fix", async function () {
      const { dsToken, complianceService, user1, user1Address, user2Address } = await fixtureWithGlobalDenylist();

      await complianceService.setDSService(DSConstants.services.BLACKLIST_MANAGER, hre.ethers.ZeroAddress);

      const check = await complianceService.preTransferCheck(user1Address, user2Address, 100);
      expect(check[0]).to.equal(0); // valid — must not revert despite local manager being unset
      expect(check[1]).to.equal("Valid");

      const issuanceCheck = await complianceService.preIssuanceCheck(user2Address, 100);
      expect(issuanceCheck[0]).to.equal(0);

      const transferable = await complianceService.getComplianceTransferableTokens(
        user1Address,
        (await hre.ethers.provider.getBlock("latest"))!.timestamp + 1,
        0
      );
      expect(transferable).to.equal(1_000);

      await expect(dsToken.connect(user1).transfer(user2Address, 100)).to.not.be.reverted;
    });

    it("both global and local unset — full fail-open, everything valid", async function () {
      const contracts = await loadFixture(deployDSTokenPermissionless);
      const { dsToken, complianceService } = contracts;
      const [, , user1, user2] = await hre.ethers.getSigners();
      const user1Address = await user1.getAddress();
      const user2Address = await user2.getAddress();
      await dsToken.issueTokens(user1Address, 1_000);

      // GLOBAL_DENYLIST_MANAGER was never wired by deployDSTokenPermissionless, and we
      // explicitly unset BLACKLIST_MANAGER too.
      await complianceService.setDSService(DSConstants.services.BLACKLIST_MANAGER, hre.ethers.ZeroAddress);

      const check = await complianceService.preTransferCheck(user1Address, user2Address, 500);
      expect(check[0]).to.equal(0);
      expect(check[1]).to.equal("Valid");
      await expect(dsToken.connect(user1).transfer(user2Address, 500)).to.not.be.reverted;
    });

    it("global set + local unset — global denylist is still enforced", async function () {
      const { complianceService, globalDenylistManager, user1Address, user2Address } = await fixtureWithGlobalDenylist();

      await complianceService.setDSService(DSConstants.services.BLACKLIST_MANAGER, hre.ethers.ZeroAddress);
      await globalDenylistManager.setGloballyDenylisted(user1Address, true);

      const check = await complianceService.preTransferCheck(user1Address, user2Address, 100);
      expect(check[0]).to.equal(102); // global still enforced — local-unset fail-open doesn't mask it
    });

    it("global manager reverting on isGloballyDenylisted causes the whole transfer to revert (accepted-risk, fail-closed)", async function () {
      const { dsToken, complianceService, user1, user1Address, user2Address } = await fixtureWithGlobalDenylist();

      const revertingMock = await hre.ethers.deployContract("RevertingGlobalDenyListManagerMock");
      await complianceService.setDSService(DSConstants.services.GLOBAL_DENYLIST_MANAGER, await revertingMock.getAddress());

      await expect(complianceService.preTransferCheck(user1Address, user2Address, 100)).to.be.reverted;
      await expect(dsToken.connect(user1).transfer(user2Address, 100)).to.be.reverted;
    });

    it("distinct rejection codes — 100 for a local-only hit, 102 for a global hit", async function () {
      const { complianceService, blacklistManager, globalDenylistManager, transferAgent, user1Address, user2Address } =
        await fixtureWithGlobalDenylist();

      await blacklistManager.connect(transferAgent).addToBlacklist(user1Address, "local-only reason");
      const localOnlyCheck = await complianceService.preTransferCheck(user1Address, user2Address, 100);
      expect(localOnlyCheck[0]).to.equal(100);
      expect(localOnlyCheck[1]).to.equal("Wallet is blacklisted");

      // user1 stays the funded sender (avoids an insufficient-balance false negative);
      // user2 is now hit on the global list too — global short-circuits ahead of user1's
      // pre-existing local hit, so the code flips from 100 to 102.
      await globalDenylistManager.setGloballyDenylisted(user2Address, true);
      const globalCheck = await complianceService.preTransferCheck(user1Address, user2Address, 100);
      expect(globalCheck[0]).to.equal(102);
      expect(globalCheck[1]).to.equal("Wallet is globally denylisted");
    });
  });
});
