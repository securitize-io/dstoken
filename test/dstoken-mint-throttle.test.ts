import { expect } from 'chai';
import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import hre, { ethers } from 'hardhat';
import { deployDSTokenPermissionless, HOURS } from './utils/fixture';
import { DSConstants } from '../utils/globals';

// ─── Constants ────────────────────────────────────────────────────────────────

// The cap is share-denominated: shares are what a mint credits, and shares per token scale as
// 1 / multiplier, so metering tokens let an issuer redefine the unit the cap is expressed in.
// Mint amounts below stay token-denominated, as callers pass them.
const CAP_TOKENS = 1_000n;
/** 10 ** (18 - decimals) at the initial 1e18 multiplier; the fixture deploys with decimals = 2. */
const SHARES_PER_TOKEN = 10n ** 16n;
const toShares = (tokens: bigint) => tokens * SHARES_PER_TOKEN;
const CAP_AMOUNT = toShares(CAP_TOKENS);
const CAP_WINDOW = BigInt(8 * HOURS);
const OVER_CAP_DELAY = BigInt(5 * HOURS);
const OVER_CAP_GRACE = BigInt(24 * HOURS);
const SALT = ethers.ZeroHash;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Deploys the token, wires an issuer role, and returns key handles.
 *
 * The over-cap delay is set up front because setMintCap now refuses to enable the cap while the
 * delay is zero (a zero delay makes the over-cap path schedule-and-execute in one block, i.e. an
 * unconditional bypass of the allowance). Pass false to get a token in the raw post-upgrade state.
 */
async function fixture(withOverCapDelay = true) {
  const contracts = await loadFixture(deployDSTokenPermissionless);
  const { dsToken, trustService } = contracts;
  const [master, issuer, recipient, unauthorized] = await hre.ethers.getSigners();

  await trustService.connect(master).setRole(issuer, DSConstants.roles.ISSUER);
  if (withOverCapDelay) {
    await dsToken.connect(master).setOverCapDelay(OVER_CAP_DELAY);
  }

  return { dsToken, master, issuer, recipient, unauthorized };
}

/** Schedules an over-cap issuance and returns the emitted operationId. */
async function schedule(dsToken: any, signer: any, to: string, amount: bigint, salt = SALT): Promise<string> {
  const tx = await dsToken.connect(signer).scheduleOverCapIssuance(to, amount, salt);
  const receipt = await tx.wait();
  for (const log of receipt.logs) {
    try {
      const parsed = dsToken.interface.parseLog(log);
      if (parsed?.name === 'OverCapMintScheduled') return parsed.args.operationId as string;
    } catch { /* skip non-matching logs */ }
  }
  throw new Error('OverCapMintScheduled event not found');
}

// ─────────────────────────────────────────────────────────────────────────────

describe('Mint Throttle & Over-Cap Timelock (BC-2132)', function () {

  // ── Default state ───────────────────────────────────────────────────────────

  describe('Default state (cap disabled)', function () {
    it('mintCapAmount defaults to 0', async function () {
      const { dsToken } = await fixture();
      expect(await dsToken.mintCapAmount()).to.equal(0n);
    });

    it('allows unlimited minting when cap is disabled', async function () {
      const { dsToken, master, recipient } = await fixture();
      await dsToken.connect(master).issueTokens(recipient, 10_000_000n);
      expect(await dsToken.balanceOf(recipient)).to.equal(10_000_000n);
    });

    it('does not track mintedInWindow when cap is disabled', async function () {
      const { dsToken, master, recipient } = await fixture();
      await dsToken.connect(master).issueTokens(recipient, 500n);
      expect(await dsToken.mintedInWindow()).to.equal(0n);
    });
  });

  // ── setMintCap ──────────────────────────────────────────────────────────────

  describe('setMintCap', function () {
    it('sets cap and window correctly', async function () {
      const { dsToken, master } = await fixture();
      await dsToken.connect(master).setMintCap(CAP_AMOUNT, CAP_WINDOW);
      expect(await dsToken.mintCapAmount()).to.equal(CAP_AMOUNT);
      expect(await dsToken.mintCapWindow()).to.equal(CAP_WINDOW);
    });

    it('resets the window and mintedInWindow on every call', async function () {
      const { dsToken, master, recipient } = await fixture();
      await dsToken.connect(master).setMintCap(CAP_AMOUNT, CAP_WINDOW);
      await dsToken.connect(master).issueTokens(recipient, 300n);
      expect(await dsToken.mintedInWindow()).to.equal(toShares(300n));

      await dsToken.connect(master).setMintCap(CAP_AMOUNT, CAP_WINDOW);
      expect(await dsToken.mintedInWindow()).to.equal(0n);
    });

    it('disables cap when amount is set to 0', async function () {
      const { dsToken, master, recipient } = await fixture();
      await dsToken.connect(master).setMintCap(CAP_AMOUNT, CAP_WINDOW);
      await dsToken.connect(master).setMintCap(0n, 0n);
      await expect(dsToken.connect(master).issueTokens(recipient, 10_000_000n)).to.not.be.reverted;
    });

    it('reverts when window is 0 but amount > 0', async function () {
      const { dsToken, master } = await fixture();
      await expect(dsToken.connect(master).setMintCap(CAP_AMOUNT, 0n))
        .to.be.revertedWith('Window must be > 0 when cap is active');
    });

    it('emits MintCapUpdated', async function () {
      const { dsToken, master } = await fixture();
      await expect(dsToken.connect(master).setMintCap(CAP_AMOUNT, CAP_WINDOW))
        .to.emit(dsToken, 'MintCapUpdated')
        .withArgs(CAP_AMOUNT, CAP_WINDOW);
    });

    it('reverts from unauthorized caller', async function () {
      const { dsToken, unauthorized } = await fixture();
      await expect(dsToken.connect(unauthorized).setMintCap(CAP_AMOUNT, CAP_WINDOW))
        .to.be.revertedWith('Insufficient trust level');
    });
  });

  // ── Throttling ──────────────────────────────────────────────────────────────

  describe('Throttling', function () {
    async function fixtureWithCap() {
      const f = await fixture();
      await f.dsToken.connect(f.master).setMintCap(CAP_AMOUNT, CAP_WINDOW);
      return f;
    }

    it('allows a mint within the cap', async function () {
      const { dsToken, master, recipient } = await fixtureWithCap();
      await dsToken.connect(master).issueTokens(recipient, 500n);
      expect(await dsToken.balanceOf(recipient)).to.equal(500n);
      expect(await dsToken.mintedInWindow()).to.equal(toShares(500n));
    });

    it('allows a mint exactly at the cap boundary', async function () {
      const { dsToken, master, recipient } = await fixtureWithCap();
      await dsToken.connect(master).issueTokens(recipient, CAP_TOKENS);
      expect(await dsToken.mintedInWindow()).to.equal(CAP_AMOUNT);
    });

    it('reverts when a single mint exceeds the cap', async function () {
      const { dsToken, master, recipient } = await fixtureWithCap();
      await expect(dsToken.connect(master).issueTokens(recipient, CAP_TOKENS + 1n))
        .to.be.revertedWith('Mint cap exceeded');
    });

    it('accumulates two mints in the same window correctly', async function () {
      const { dsToken, master, recipient } = await fixtureWithCap();
      await dsToken.connect(master).issueTokens(recipient, 600n);
      await dsToken.connect(master).issueTokens(recipient, 400n);
      expect(await dsToken.mintedInWindow()).to.equal(CAP_AMOUNT);
    });

    it('reverts when accumulated mints exceed the cap', async function () {
      const { dsToken, master, recipient } = await fixtureWithCap();
      await dsToken.connect(master).issueTokens(recipient, 600n);
      await expect(dsToken.connect(master).issueTokens(recipient, 401n))
        .to.be.revertedWith('Mint cap exceeded');
    });

    it('resets the window automatically after CAP_WINDOW elapses (tumbling window)', async function () {
      const { dsToken, master, recipient } = await fixtureWithCap();
      await dsToken.connect(master).issueTokens(recipient, CAP_TOKENS);

      await time.increase(CAP_WINDOW + 1n);

      // Full cap available again in the new window
      await dsToken.connect(master).issueTokens(recipient, CAP_TOKENS);
      expect(await dsToken.mintedInWindow()).to.equal(CAP_AMOUNT);
    });

    it('does not reset the window before CAP_WINDOW elapses', async function () {
      const { dsToken, master, recipient } = await fixtureWithCap();
      await dsToken.connect(master).issueTokens(recipient, 600n);

      // Advance by half the window — definitely still within the current window
      await time.increase(CAP_WINDOW / 2n);

      await expect(dsToken.connect(master).issueTokens(recipient, 401n))
        .to.be.revertedWith('Mint cap exceeded');
    });

    it('emits MintCapConsumed on every successful throttled mint', async function () {
      const { dsToken, master, recipient } = await fixtureWithCap();
      const windowStart = await dsToken.windowStart();
      await expect(dsToken.connect(master).issueTokens(recipient, 300n))
        .to.emit(dsToken, 'MintCapConsumed')
        .withArgs(toShares(300n), toShares(300n), windowStart);
    });

    it('issuer role is also subject to the cap', async function () {
      const { dsToken, issuer, recipient } = await fixtureWithCap();
      await expect(dsToken.connect(issuer).issueTokens(recipient, CAP_TOKENS + 1n))
        .to.be.revertedWith('Mint cap exceeded');
    });
  });

  // ── scheduleOverCapIssuance ──────────────────────────────────────────────────

  describe('scheduleOverCapIssuance', function () {
    async function fixtureWithDelay() {
      const f = await fixture();
      await f.dsToken.connect(f.master).setMintCap(CAP_AMOUNT, CAP_WINDOW);
      await f.dsToken.connect(f.master).setOverCapDelay(OVER_CAP_DELAY);
      await f.dsToken.connect(f.master).setOverCapGracePeriod(OVER_CAP_GRACE);
      return f;
    }

    it('schedules a pending mint and stores it correctly', async function () {
      const { dsToken, master, recipient } = await fixtureWithDelay();
      const recipientAddress = await recipient.getAddress();
      const operationId = await schedule(dsToken, master, recipientAddress, CAP_TOKENS + 1n);

      const op = await dsToken.pendingMints(operationId);
      expect(op.to).to.equal(recipientAddress);
      expect(op.amount).to.equal(CAP_TOKENS + 1n);
      expect(op.executed).to.be.false;
      expect(op.cancelled).to.be.false;
      expect(op.readyAt).to.be.gt(0n);
      expect(op.expiresAt).to.be.gt(op.readyAt);
    });

    it('emits OverCapMintScheduled with correct args', async function () {
      const { dsToken, master, recipient } = await fixtureWithDelay();
      const recipientAddress = await recipient.getAddress();
      const currentTime = BigInt(await time.latest());
      const expectedReadyAt = currentTime + OVER_CAP_DELAY + 1n; // +1 for next block

      await expect(dsToken.connect(master).scheduleOverCapIssuance(recipientAddress, CAP_TOKENS + 1n, SALT))
        .to.emit(dsToken, 'OverCapMintScheduled')
        .withArgs(
          (_opId: string) => _opId.startsWith('0x'),
          recipientAddress,
          CAP_TOKENS + 1n,
          expectedReadyAt
        );
    });

    it('reverts when to is address(0)', async function () {
      const { dsToken, master } = await fixtureWithDelay();
      await expect(dsToken.connect(master).scheduleOverCapIssuance(ethers.ZeroAddress, CAP_TOKENS + 1n, SALT))
        .to.be.revertedWith('Invalid address');
    });

    it('reverts when amount is 0', async function () {
      const { dsToken, master, recipient } = await fixtureWithDelay();
      await expect(dsToken.connect(master).scheduleOverCapIssuance(recipient, 0n, SALT))
        .to.be.revertedWith('Amount is zero');
    });

    it('reverts when the same operationId is scheduled twice in the same block', async function () {
      const { dsToken, master, recipient } = await fixtureWithDelay();
      const recipientAddress = await recipient.getAddress();
      const dsTokenAddress = await dsToken.getAddress();
      const calldata = dsToken.interface.encodeFunctionData(
        'scheduleOverCapIssuance', [recipientAddress, CAP_TOKENS + 1n, SALT]
      );
      const nonce = await hre.ethers.provider.getTransactionCount(master.address, 'pending');

      // Disable automine so two txs land in the same block with the same timestamp
      await hre.network.provider.send('evm_setAutomine', [false]);
      const [r1, r2] = await Promise.all([
        master.sendTransaction({ to: dsTokenAddress, data: calldata, nonce,     gasLimit: 300_000n }),
        master.sendTransaction({ to: dsTokenAddress, data: calldata, nonce: nonce + 1, gasLimit: 300_000n }),
      ]);
      await hre.network.provider.send('evm_mine');
      await hre.network.provider.send('evm_setAutomine', [true]);

      const receipt1 = await r1.wait().catch(() => null);
      const receipt2 = await r2.wait().catch(() => null);

      expect(receipt1?.status).to.equal(1); // first schedule succeeded
      // second must have reverted (status 0 or wait() threw)
      expect(receipt2?.status ?? 0).to.equal(0);
    });

    it('allows two schedules with different salts', async function () {
      const { dsToken, master, recipient } = await fixtureWithDelay();
      const recipientAddress = await recipient.getAddress();
      const salt2 = ethers.id('another-salt');
      await expect(dsToken.connect(master).scheduleOverCapIssuance(recipientAddress, CAP_TOKENS + 1n, SALT))
        .to.not.be.reverted;
      await expect(dsToken.connect(master).scheduleOverCapIssuance(recipientAddress, CAP_TOKENS + 1n, salt2))
        .to.not.be.reverted;
    });

    it('reverts from unauthorized caller', async function () {
      const { dsToken, unauthorized, recipient } = await fixtureWithDelay();
      await expect(dsToken.connect(unauthorized).scheduleOverCapIssuance(recipient, CAP_TOKENS + 1n, SALT))
        .to.be.revertedWith('Insufficient trust level');
    });
  });

  // ── executeOverCapMint ───────────────────────────────────────────────────────

  describe('executeOverCapMint', function () {
    async function fixtureScheduled() {
      const f = await fixture();
      await f.dsToken.connect(f.master).setMintCap(CAP_AMOUNT, CAP_WINDOW);
      await f.dsToken.connect(f.master).setOverCapDelay(OVER_CAP_DELAY);
      await f.dsToken.connect(f.master).setOverCapGracePeriod(OVER_CAP_GRACE);
      const recipientAddress = await f.recipient.getAddress();
      const operationId = await schedule(f.dsToken, f.master, recipientAddress, CAP_TOKENS * 10n);
      return { ...f, recipientAddress, operationId };
    }

    it('executes successfully after the delay has elapsed', async function () {
      const { dsToken, master, recipientAddress, operationId } = await fixtureScheduled();
      await time.increase(OVER_CAP_DELAY + 1n);

      await dsToken.connect(master).executeOverCapMint(operationId);

      expect(await dsToken.balanceOf(recipientAddress)).to.equal(CAP_TOKENS * 10n);
      expect((await dsToken.pendingMints(operationId)).executed).to.be.true;
    });

    it('emits Transfer, TxShares, and OverCapMintExecuted', async function () {
      const { dsToken, master, recipientAddress, operationId } = await fixtureScheduled();
      await time.increase(OVER_CAP_DELAY + 1n);

      await expect(dsToken.connect(master).executeOverCapMint(operationId))
        .to.emit(dsToken, 'Transfer').withArgs(ethers.ZeroAddress, recipientAddress, CAP_TOKENS * 10n)
        .and.to.emit(dsToken, 'OverCapMintExecuted').withArgs(operationId);
    });

    it('adds the recipient to the wallet enumeration', async function () {
      const { dsToken, master, recipientAddress, operationId } = await fixtureScheduled();
      const walletCountBefore = await dsToken.walletCount();
      await time.increase(OVER_CAP_DELAY + 1n);
      await dsToken.connect(master).executeOverCapMint(operationId);
      expect(await dsToken.walletCount()).to.equal(walletCountBefore + 1n);
    });

    it('reverts when executed before the delay has elapsed', async function () {
      const { dsToken, master, operationId } = await fixtureScheduled();
      await time.increase(OVER_CAP_DELAY - 10n);

      const op = await dsToken.pendingMints(operationId);
      await expect(dsToken.connect(master).executeOverCapMint(operationId))
        .to.be.revertedWith('Operation not ready');
    });

    it('reverts when the operation has expired', async function () {
      const { dsToken, master, operationId } = await fixtureScheduled();
      await time.increase(OVER_CAP_DELAY + OVER_CAP_GRACE + 1n);

      await expect(dsToken.connect(master).executeOverCapMint(operationId))
        .to.be.revertedWith('Operation expired');
    });

    it('never expires when overCapGracePeriod is 0', async function () {
      const { dsToken, master, recipient } = await fixture();
      await dsToken.connect(master).setOverCapDelay(OVER_CAP_DELAY);
      // overCapGracePeriod defaults to 0 = never expires
      const recipientAddress = await recipient.getAddress();
      const operationId = await schedule(dsToken, master, recipientAddress, 500n);

      await time.increase(OVER_CAP_DELAY + BigInt(365 * 24 * HOURS));

      await expect(dsToken.connect(master).executeOverCapMint(operationId)).to.not.be.reverted;
    });

    it('reverts when already executed', async function () {
      const { dsToken, master, operationId } = await fixtureScheduled();
      await time.increase(OVER_CAP_DELAY + 1n);
      await dsToken.connect(master).executeOverCapMint(operationId);

      await expect(dsToken.connect(master).executeOverCapMint(operationId))
        .to.be.revertedWith('Operation already executed');
    });

    it('reverts when the operation was cancelled', async function () {
      const { dsToken, master, operationId } = await fixtureScheduled();
      await dsToken.connect(master).cancelOverCapMint(operationId);
      await time.increase(OVER_CAP_DELAY + 1n);

      await expect(dsToken.connect(master).executeOverCapMint(operationId))
        .to.be.revertedWith('Operation already cancelled');
    });

    it('reverts on a non-existent operationId', async function () {
      const { dsToken, master } = await fixtureScheduled();
      const bogusId = ethers.id('does-not-exist');
      await expect(dsToken.connect(master).executeOverCapMint(bogusId))
        .to.be.revertedWith('Operation does not exist');
    });

    it('does not count toward mintedInWindow (bypasses cap counter)', async function () {
      const { dsToken, master, operationId } = await fixtureScheduled();
      await dsToken.connect(master).setMintCap(CAP_AMOUNT, CAP_WINDOW);
      const mintedBefore = await dsToken.mintedInWindow();
      await time.increase(OVER_CAP_DELAY + 1n);
      await dsToken.connect(master).executeOverCapMint(operationId);
      expect(await dsToken.mintedInWindow()).to.equal(mintedBefore);
    });

    it('issuer role can also execute', async function () {
      const { dsToken, issuer, operationId } = await fixtureScheduled();
      await time.increase(OVER_CAP_DELAY + 1n);
      await expect(dsToken.connect(issuer).executeOverCapMint(operationId)).to.not.be.reverted;
    });

    it('reverts from unauthorized caller', async function () {
      const { dsToken, unauthorized, operationId } = await fixtureScheduled();
      await time.increase(OVER_CAP_DELAY + 1n);
      await expect(dsToken.connect(unauthorized).executeOverCapMint(operationId))
        .to.be.revertedWith('Insufficient trust level');
    });
  });

  // ── cancelOverCapMint ────────────────────────────────────────────────────────

  describe('cancelOverCapMint', function () {
    async function fixtureScheduled() {
      const f = await fixture();
      await f.dsToken.connect(f.master).setOverCapDelay(OVER_CAP_DELAY);
      await f.dsToken.connect(f.master).setOverCapGracePeriod(OVER_CAP_GRACE);
      const recipientAddress = await f.recipient.getAddress();
      const operationId = await schedule(f.dsToken, f.master, recipientAddress, 500n);
      return { ...f, recipientAddress, operationId };
    }

    it('MASTER cancels a pending mint', async function () {
      const { dsToken, master, operationId } = await fixtureScheduled();
      await dsToken.connect(master).cancelOverCapMint(operationId);
      expect((await dsToken.pendingMints(operationId)).cancelled).to.be.true;
    });

    it('emits OverCapMintCancelled', async function () {
      const { dsToken, master, operationId } = await fixtureScheduled();
      await expect(dsToken.connect(master).cancelOverCapMint(operationId))
        .to.emit(dsToken, 'OverCapMintCancelled')
        .withArgs(operationId);
    });

    it('cancellation prevents subsequent execution', async function () {
      const { dsToken, master, operationId } = await fixtureScheduled();
      await dsToken.connect(master).cancelOverCapMint(operationId);
      await time.increase(OVER_CAP_DELAY + 1n);

      await expect(dsToken.connect(master).executeOverCapMint(operationId))
        .to.be.revertedWith('Operation already cancelled');
    });

    it('can cancel after readyAt (within grace period)', async function () {
      const { dsToken, master, operationId } = await fixtureScheduled();
      await time.increase(OVER_CAP_DELAY + 1n);
      await expect(dsToken.connect(master).cancelOverCapMint(operationId)).to.not.be.reverted;
    });

    it('reverts when cancelling an already-executed operation', async function () {
      const { dsToken, master, operationId } = await fixtureScheduled();
      await time.increase(OVER_CAP_DELAY + 1n);
      await dsToken.connect(master).executeOverCapMint(operationId);

      await expect(dsToken.connect(master).cancelOverCapMint(operationId))
        .to.be.revertedWith('Operation already executed');
    });

    it('reverts when cancelling an already-cancelled operation', async function () {
      const { dsToken, master, operationId } = await fixtureScheduled();
      await dsToken.connect(master).cancelOverCapMint(operationId);

      await expect(dsToken.connect(master).cancelOverCapMint(operationId))
        .to.be.revertedWith('Operation already cancelled');
    });

    it('reverts on a non-existent operationId', async function () {
      const { dsToken, master } = await fixtureScheduled();
      const bogusId = ethers.id('does-not-exist');
      await expect(dsToken.connect(master).cancelOverCapMint(bogusId))
        .to.be.revertedWith('Operation does not exist');
    });

    it('allows issuer to cancel (cancelling must not itself be a queued master operation)', async function () {
      // Audit #3: while cancelOverCapMint was onlyMaster, cancelling after handover meant a
      // master-timelock op maturing after a shorter overCapDelay had already let the mint execute.
      // ISSUER already schedules and executes over-cap mints, so it gains nothing here.
      const { dsToken, issuer, operationId } = await fixtureScheduled();

      await expect(dsToken.connect(issuer).cancelOverCapMint(operationId))
        .to.emit(dsToken, 'OverCapMintCancelled')
        .withArgs(operationId);
    });

    it('allows a transfer agent to cancel, giving a canceller outside the issuer set', async function () {
      // Covers the compromised-issuer case: the responder must not have to be an issuer.
      const { dsToken, master, unauthorized, operationId } = await fixtureScheduled();
      const trustService: any = await hre.ethers.getContractAt(
        'TrustService',
        await dsToken.getDSService(DSConstants.services.TRUST_SERVICE),
      );
      await trustService.connect(master).setRole(unauthorized, DSConstants.roles.TRANSFER_AGENT);

      await expect(dsToken.connect(unauthorized).cancelOverCapMint(operationId))
        .to.emit(dsToken, 'OverCapMintCancelled')
        .withArgs(operationId);
    });

    it('reverts from unauthorized caller', async function () {
      const { dsToken, unauthorized, operationId } = await fixtureScheduled();
      await expect(dsToken.connect(unauthorized).cancelOverCapMint(operationId))
        .to.be.revertedWith('Insufficient trust level');
    });
  });

  // ── Parameter setters ────────────────────────────────────────────────────────

  describe('Parameter setters', function () {
    it('setOverCapDelay updates delay and emits event', async function () {
      const { dsToken, master } = await fixture();
      await expect(dsToken.connect(master).setOverCapDelay(OVER_CAP_DELAY))
        .to.emit(dsToken, 'OverCapDelayUpdated')
        .withArgs(OVER_CAP_DELAY);
      expect(await dsToken.overCapDelay()).to.equal(OVER_CAP_DELAY);
    });

    it('setOverCapGracePeriod updates grace period and emits event', async function () {
      const { dsToken, master } = await fixture();
      await expect(dsToken.connect(master).setOverCapGracePeriod(OVER_CAP_GRACE))
        .to.emit(dsToken, 'OverCapGracePeriodUpdated')
        .withArgs(OVER_CAP_GRACE);
      expect(await dsToken.overCapGracePeriod()).to.equal(OVER_CAP_GRACE);
    });

    it('setOverCapDelay reverts from unauthorized', async function () {
      const { dsToken, unauthorized } = await fixture();
      await expect(dsToken.connect(unauthorized).setOverCapDelay(OVER_CAP_DELAY))
        .to.be.revertedWith('Insufficient trust level');
    });

    it('setOverCapGracePeriod reverts from unauthorized', async function () {
      const { dsToken, unauthorized } = await fixture();
      await expect(dsToken.connect(unauthorized).setOverCapGracePeriod(OVER_CAP_GRACE))
        .to.be.revertedWith('Insufficient trust level');
    });
  });

  // ── Edge cases ───────────────────────────────────────────────────────────────

  describe('Edge cases', function () {
    it('first mint after upgrade resets window cleanly (windowStart = 0)', async function () {
      const { dsToken, master, recipient } = await fixture();
      // windowStart is 0 by default; first mint with cap should reset the window
      await dsToken.connect(master).setMintCap(CAP_AMOUNT, CAP_WINDOW);
      // After setMintCap, windowStart is set to block.timestamp — so minting works from the start
      await expect(dsToken.connect(master).issueTokens(recipient, 100n)).to.not.be.reverted;
    });

    it('setMintCap mid-window with new cap below mintedInWindow does not underflow', async function () {
      const { dsToken, master, recipient } = await fixture();
      await dsToken.connect(master).setMintCap(CAP_AMOUNT, CAP_WINDOW);
      await dsToken.connect(master).issueTokens(recipient, 800n);
      expect(await dsToken.mintedInWindow()).to.equal(toShares(800n));

      // Lower the cap below what was already minted — window resets
      await dsToken.connect(master).setMintCap(toShares(500n), CAP_WINDOW);
      expect(await dsToken.mintedInWindow()).to.equal(0n);
      // New cap of 500 should work fine from a clean window
      await expect(dsToken.connect(master).issueTokens(recipient, 500n)).to.not.be.reverted;
    });

    it('bounds shares, not tokens, so lowering the multiplier cannot amplify a mint', async function () {
      // Audit #6: the allowance metered tokens while the balance credited is shares, and shares
      // per token scale as 1 / multiplier. An issuer could lower the multiplier, mint exactly
      // mintCapAmount tokens (the cap passing cleanly), restore the multiplier, and end up with an
      // arbitrary multiple of the intended shares. Metering shares makes the cap independent of
      // the rate, so the cheapened mint is rejected instead.
      const { dsToken, master, recipient } = await fixture();
      const rebasing: any = await hre.ethers.getContractAt(
        'SecuritizeRebasingProvider',
        await dsToken.getDSService(DSConstants.services.REBASING_PROVIDER),
      );
      await dsToken.connect(master).setMintCap(CAP_AMOUNT, CAP_WINDOW);

      // a hundred-fold cheaper per token, so the same token amount buys 100x the shares
      await rebasing.connect(master).setMultiplier(10n ** 16n);

      await expect(dsToken.connect(master).issueTokens(recipient, CAP_TOKENS))
        .to.be.revertedWith('Mint cap exceeded');

      // the allowance still buys exactly what it is worth at that rate, and no more
      await expect(dsToken.connect(master).issueTokens(recipient, CAP_TOKENS / 100n)).to.not.be.reverted;
      expect(await dsToken.mintedInWindow()).to.equal(CAP_AMOUNT);
    });

    it('rejects a multiplier change from an issuer, closing the schedule-then-cheapen path', async function () {
      // The over-cap path stores its approved amount in tokens and converts at execution, so an
      // issuer able to move the multiplier in between would mint more shares than were approved.
      const { dsToken, issuer } = await fixture();
      const rebasing: any = await hre.ethers.getContractAt(
        'SecuritizeRebasingProvider',
        await dsToken.getDSService(DSConstants.services.REBASING_PROVIDER),
      );

      await expect(rebasing.connect(issuer).setMultiplier(10n ** 16n))
        .to.be.revertedWith('Insufficient trust level');
    });

    it('cannot enable the cap while overCapDelay is 0, so the over-cap path is never instant', async function () {
      // Audit #3: a zero delay made schedule-and-execute possible in one block, i.e. an
      // unconditional bypass of the allowance for any ROLE_ISSUER holder.
      const { dsToken, master } = await fixture(false);
      expect(await dsToken.overCapDelay()).to.equal(0n);

      await expect(dsToken.connect(master).setMintCap(CAP_AMOUNT, CAP_WINDOW))
        .to.be.revertedWith('Over-cap delay must be set when cap is active');
    });

    it('cannot zero the delay while the cap is active', async function () {
      const { dsToken, master } = await fixture();
      await dsToken.connect(master).setMintCap(CAP_AMOUNT, CAP_WINDOW);

      await expect(dsToken.connect(master).setOverCapDelay(0n))
        .to.be.revertedWith('Over-cap delay must be > 0 while cap is active');
    });

    it('supports the documented enable and disable ordering', async function () {
      const { dsToken, master } = await fixture(false);

      // enable: delay first, then cap
      await dsToken.connect(master).setOverCapDelay(OVER_CAP_DELAY);
      await dsToken.connect(master).setMintCap(CAP_AMOUNT, CAP_WINDOW);
      expect(await dsToken.mintCapAmount()).to.equal(CAP_AMOUNT);

      // disable: cap first, then delay
      await dsToken.connect(master).setMintCap(0n, 0n);
      await dsToken.connect(master).setOverCapDelay(0n);
      expect(await dsToken.overCapDelay()).to.equal(0n);
    });

    it('issueTokensCustom is also throttled', async function () {
      const { dsToken, master, recipient } = await fixture();
      await dsToken.connect(master).setMintCap(CAP_AMOUNT, CAP_WINDOW);

      await expect(
        dsToken.connect(master).issueTokensCustom(recipient, CAP_TOKENS + 1n, 0n, 0n, '', 0n)
      ).to.be.revertedWith('Mint cap exceeded');
    });

    it('issueTokensWithMultipleLocks is also throttled', async function () {
      const { dsToken, master, recipient } = await fixture();
      await dsToken.connect(master).setMintCap(CAP_AMOUNT, CAP_WINDOW);

      await expect(
        dsToken.connect(master).issueTokensWithMultipleLocks(recipient, CAP_TOKENS + 1n, 0n, [], '', [])
      ).to.be.revertedWith('Mint cap exceeded');
    });
  });
});
