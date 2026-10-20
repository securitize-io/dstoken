import { expect } from 'chai';
import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import hre, { ethers } from 'hardhat';
import {
  deployDSTokenPermissionless,
  deployDSTokenScaledUI,
  deployDSTokenScaledUISixDecimals,
  deployDSTokenScaledUIEighteenDecimals,
  HOURS,
} from './utils/fixture';
import { DSConstants } from '../utils/globals';

// ─── ERC-165 interface ids ────────────────────────────────────────────────────
// The ERC-8056 ids are the ones printed in the EIP; the test recomputes them from the selectors so
// a drift between the spec and contracts/token/IScaledUIAmount.sol is caught here.

const selector = (sig: string) => BigInt(ethers.id(sig).slice(0, 10));
const interfaceId = (...sigs: string[]) =>
  '0x' + sigs.map(selector).reduce((a, b) => a ^ b, 0n).toString(16).padStart(8, '0');

const ID_ERC165 = '0x01ffc9a7';
const ID_ERC20 = '0x36372b07';
const ID_ERC20_METADATA = interfaceId('name()', 'symbol()', 'decimals()');
const ID_ERC20_PERMIT = interfaceId(
  'permit(address,address,uint256,uint256,uint8,bytes32,bytes32)',
  'nonces(address)',
  'DOMAIN_SEPARATOR()',
);
const ID_SCALED_UI = interfaceId('uiMultiplier()');
const ID_SCALED_UI_NEW = interfaceId('newUIMultiplier()', 'effectiveAt()');
const ID_SCALED_UI_CONVERSION = interfaceId('toUIAmount(uint256)', 'fromUIAmount(uint256)');
const ID_SCALED_UI_BALANCES = interfaceId('balanceOfUI(address)', 'totalSupplyUI()');
const ID_RANDOM = '0xdeadbeef';

const ONE = 10n ** 18n; // 1.0 with 18 decimals
const TWO = 2n * ONE;
const ONE_THIRD = ONE / 3n; // 333333333333333333: 1:3 reverse split, deliberately inexact
const DELAY = BigInt(24 * HOURS);

const SPEC_IDS = {
  IScaledUIAmount: '0xa60bf13d',
  IScaledUIAmountNewUIMultiplier: '0x4bd27648',
  IScaledUIAmountConversion: '0x57854fc3',
  IScaledUIAmountBalances: '0xd890fd71',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SCALED_UI_FIXTURES: Record<number, () => Promise<any>> = {
  2: deployDSTokenScaledUI,
  6: deployDSTokenScaledUISixDecimals,
  18: deployDSTokenScaledUIEighteenDecimals,
};

async function scaledUIFixture(decimals = 2) {
  const contracts = await loadFixture(SCALED_UI_FIXTURES[decimals]);
  const { dsToken, trustService, rebasingProvider } = contracts;
  const [master, issuer, holderA, holderB, unauthorized] = await hre.ethers.getSigners();
  await trustService.connect(master).setRole(issuer, DSConstants.roles.ISSUER);
  return { dsToken, trustService, rebasingProvider, master, issuer, holderA, holderB, unauthorized };
}

async function rebasingFixture() {
  const contracts = await loadFixture(deployDSTokenPermissionless);
  const { dsToken, trustService, rebasingProvider } = contracts;
  const [master, issuer, holderA] = await hre.ethers.getSigners();
  await trustService.connect(master).setRole(issuer, DSConstants.roles.ISSUER);
  return { dsToken, trustService, rebasingProvider, master, issuer, holderA };
}

const floorMulDiv = (x: bigint, num: bigint, den: bigint) => (x * num) / den;

// ─────────────────────────────────────────────────────────────────────────────

describe('ERC-165 interface detection (BC-2599)', function () {
  it('ERC-8056 interface ids computed from the selectors match the ids published in the EIP', function () {
    expect(ID_SCALED_UI).to.equal(SPEC_IDS.IScaledUIAmount);
    expect(ID_SCALED_UI_NEW).to.equal(SPEC_IDS.IScaledUIAmountNewUIMultiplier);
    expect(ID_SCALED_UI_CONVERSION).to.equal(SPEC_IDS.IScaledUIAmountConversion);
    expect(ID_SCALED_UI_BALANCES).to.equal(SPEC_IDS.IScaledUIAmountBalances);
  });

  describe('REBASING token (--token-mode REBASING)', function () {
    it('supports ERC-165, ERC-20, ERC-20 Metadata and ERC-20 Permit', async function () {
      const { dsToken } = await rebasingFixture();
      expect(await dsToken.supportsInterface(ID_ERC165)).to.equal(true);
      expect(await dsToken.supportsInterface(ID_ERC20)).to.equal(true);
      expect(await dsToken.supportsInterface(ID_ERC20_METADATA)).to.equal(true);
      expect(await dsToken.supportsInterface(ID_ERC20_PERMIT)).to.equal(true);
    });

    it('does not advertise any ERC-8056 interface (balanceOf is already scaled)', async function () {
      const { dsToken } = await rebasingFixture();
      expect(await dsToken.supportsInterface(ID_SCALED_UI)).to.equal(false);
      expect(await dsToken.supportsInterface(ID_SCALED_UI_NEW)).to.equal(false);
      expect(await dsToken.supportsInterface(ID_SCALED_UI_CONVERSION)).to.equal(false);
      expect(await dsToken.supportsInterface(ID_SCALED_UI_BALANCES)).to.equal(false);
      expect(await dsToken.supportsInterface(ID_RANDOM)).to.equal(false);
      expect(await dsToken.scaledUIAmountEnabled()).to.equal(false);
    });
  });

  describe('SCALED_UI token (default)', function () {
    it('supports ERC-165, ERC-20 and the four ERC-8056 interfaces', async function () {
      const { dsToken } = await scaledUIFixture();
      expect(await dsToken.supportsInterface(ID_ERC165)).to.equal(true);
      expect(await dsToken.supportsInterface(ID_ERC20)).to.equal(true);
      expect(await dsToken.supportsInterface(ID_SCALED_UI)).to.equal(true);
      expect(await dsToken.supportsInterface(ID_SCALED_UI_NEW)).to.equal(true);
      expect(await dsToken.supportsInterface(ID_SCALED_UI_CONVERSION)).to.equal(true);
      expect(await dsToken.supportsInterface(ID_SCALED_UI_BALANCES)).to.equal(true);
      expect(await dsToken.supportsInterface(ID_RANDOM)).to.equal(false);
      expect(await dsToken.scaledUIAmountEnabled()).to.equal(true);
    });
  });
});

describe('ERC-8056 Scaled UI Amount (BC-2599)', function () {
  describe('Mode selection', function () {
    it('a token deployed without --token-mode is SCALED_UI with the multiplier at 1.0 and nothing pending', async function () {
      const { dsToken } = await hre.run('deploy-all', { name: 'Default', symbol: 'DEF', decimals: 2, compliance: 'PERMISSIONLESS', registryType: 'STUB' });
      expect(await dsToken.scaledUIAmountEnabled()).to.equal(true);
      expect(await dsToken.uiMultiplier()).to.equal(ONE);
      expect(await dsToken.newUIMultiplier()).to.equal(ONE);
      expect(await dsToken.effectiveAt()).to.equal(0);
      expect(await dsToken.supportsInterface(ID_SCALED_UI)).to.equal(true);
    });

    it('deploy-all --token-mode REBASING opts out: ERC-8056 off, rebasing multiplier movable', async function () {
      const { dsToken, rebasingProvider, master } = await rebasingFixture();
      expect(await dsToken.scaledUIAmountEnabled()).to.equal(false);
      expect(await dsToken.supportsInterface(ID_SCALED_UI)).to.equal(false);
      await rebasingProvider.connect(master).setMultiplier(TWO);
      expect(await rebasingProvider.multiplier()).to.equal(TWO);
    });

    it('master disables the mode: emits ScaledUIAmountModeChanged(false), ERC-8056 goes inert, rebasing multiplier unfreezes', async function () {
      const { dsToken, rebasingProvider, master } = await scaledUIFixture();
      await expect(dsToken.connect(master).setScaledUIAmountMode(false))
        .to.emit(dsToken, 'ScaledUIAmountModeChanged').withArgs(false);
      expect(await dsToken.scaledUIAmountEnabled()).to.equal(false);
      expect(await dsToken.supportsInterface(ID_SCALED_UI)).to.equal(false);
      expect(await dsToken.supportsInterface(ID_ERC20)).to.equal(true);
      await expect(dsToken.uiMultiplier()).to.be.revertedWith('Scaled UI amount not enabled');
      await rebasingProvider.connect(master).setMultiplier(TWO);
      expect(await rebasingProvider.multiplier()).to.equal(TWO);
    });

    it('master re-enables: requires the rebasing multiplier at 1e18, resets the UI multiplier and emits UIMultiplierUpdated(0, 1e18, now)', async function () {
      const { dsToken, rebasingProvider, master } = await rebasingFixture();
      await rebasingProvider.connect(master).setMultiplier(TWO);
      await expect(dsToken.connect(master).setScaledUIAmountMode(true)).to.be.revertedWith('Rebasing multiplier must be 1e18');

      await rebasingProvider.connect(master).setMultiplier(ONE);
      const tx = await dsToken.connect(master).setScaledUIAmountMode(true);
      const block = await ethers.provider.getBlock(tx.blockNumber!);
      await expect(tx).to.emit(dsToken, 'UIMultiplierUpdated').withArgs(0, ONE, block!.timestamp);
      await expect(tx).to.emit(dsToken, 'ScaledUIAmountModeChanged').withArgs(true);
      expect(await dsToken.scaledUIAmountEnabled()).to.equal(true);
      expect(await dsToken.uiMultiplier()).to.equal(ONE);
      expect(await dsToken.supportsInterface(ID_SCALED_UI)).to.equal(true);
    });

    it('switching with existing holders is allowed while both multipliers are identity, and changes no balance', async function () {
      const { dsToken, master, issuer, holderA } = await scaledUIFixture();
      await dsToken.connect(issuer).issueTokens(holderA, 1_000);
      await dsToken.connect(master).setScaledUIAmountMode(false);
      expect(await dsToken.balanceOf(holderA)).to.equal(1_000);
      await dsToken.connect(master).setScaledUIAmountMode(true);
      expect(await dsToken.balanceOf(holderA)).to.equal(1_000);
      expect(await dsToken.balanceOfUI(holderA)).to.equal(1_000);
    });

    it('reverts for a non-master caller', async function () {
      const { dsToken, issuer } = await scaledUIFixture();
      await expect(dsToken.connect(issuer).setScaledUIAmountMode(false)).to.be.revertedWith('Insufficient trust level');
    });

    it('reverts when setting the mode the token already has', async function () {
      const scaled = await scaledUIFixture();
      await expect(scaled.dsToken.connect(scaled.master).setScaledUIAmountMode(true)).to.be.revertedWith('Scaled UI amount mode unchanged');
      const rebasing = await rebasingFixture();
      await expect(rebasing.dsToken.connect(rebasing.master).setScaledUIAmountMode(false)).to.be.revertedWith('Scaled UI amount mode unchanged');
    });

    it('disabling reverts while an update is pending', async function () {
      const { dsToken, master, issuer } = await scaledUIFixture();
      const effectiveAt = BigInt(await time.latest()) + DELAY;
      await dsToken.connect(issuer).setUIMultiplier(TWO, effectiveAt);
      await expect(dsToken.connect(master).setScaledUIAmountMode(false)).to.be.revertedWith('UI multiplier must be 1e18 with no pending update');
    });

    it('disabling reverts while the UI multiplier is not 1e18, and works once it is scheduled back to 1e18', async function () {
      const { dsToken, master, issuer } = await scaledUIFixture();
      const first = BigInt(await time.latest()) + DELAY;
      await dsToken.connect(issuer).setUIMultiplier(TWO, first);
      await time.increaseTo(first);
      await expect(dsToken.connect(master).setScaledUIAmountMode(false)).to.be.revertedWith('UI multiplier must be 1e18 with no pending update');

      const second = first + DELAY;
      await dsToken.connect(issuer).setUIMultiplier(ONE, second);
      await time.increaseTo(second);
      await dsToken.connect(master).setScaledUIAmountMode(false);
      expect(await dsToken.scaledUIAmountEnabled()).to.equal(false);
    });

    it('freezes the rebasing multiplier while enabled', async function () {
      const { rebasingProvider, master } = await scaledUIFixture();
      await expect(rebasingProvider.connect(master).setMultiplier(TWO)).to.be.revertedWith('Multiplier is frozen in scaled UI mode');
      expect(await rebasingProvider.multiplier()).to.equal(ONE);
    });

    it('deploy-all rejects a non-default rebasing multiplier unless --token-mode REBASING', async function () {
      const base = { name: 'X', symbol: 'X', decimals: 2, compliance: 'PERMISSIONLESS', registryType: 'STUB', multiplier: TWO.toString() };
      await expect(hre.run('deploy-all', base)).to.be.rejectedWith(/--multiplier must be 1e18/);
      await expect(hre.run('deploy-all', { ...base, tokenMode: 'SCALED_UI' })).to.be.rejectedWith(/--multiplier must be 1e18/);
      const { rebasingProvider } = await hre.run('deploy-all', { ...base, tokenMode: 'REBASING' });
      expect(await rebasingProvider.multiplier()).to.equal(TWO);
    });

    it('deploy-all rejects an unknown token mode', async function () {
      await expect(
        hre.run('deploy-all', { name: 'X', symbol: 'X', decimals: 2, tokenMode: 'SPLIT' }),
      ).to.be.rejectedWith(/--token-mode must be REBASING or SCALED_UI/);
    });
  });

  describe('REBASING mode: ERC-8056 functions are inert', function () {
    const calls: Array<[string, (t: any, s: any) => Promise<unknown>]> = [
      ['uiMultiplier', (t) => t.uiMultiplier()],
      ['newUIMultiplier', (t) => t.newUIMultiplier()],
      ['effectiveAt', (t) => t.effectiveAt()],
      ['toUIAmount', (t) => t.toUIAmount(1)],
      ['fromUIAmount', (t) => t.fromUIAmount(1)],
      ['balanceOfUI', (t) => t.balanceOfUI(ethers.ZeroAddress)],
      ['totalSupplyUI', (t) => t.totalSupplyUI()],
      ['setUIMultiplier', (t, s) => t.connect(s).setUIMultiplier(TWO, 10n ** 12n)],
      ['cancelUIMultiplierUpdate', (t, s) => t.connect(s).cancelUIMultiplierUpdate()],
    ];
    for (const [name, call] of calls) {
      it(`${name} reverts`, async function () {
        const { dsToken, master } = await rebasingFixture();
        await expect(call(dsToken, master)).to.be.revertedWith('Scaled UI amount not enabled');
      });
    }
  });

  describe('Scheduling a multiplier update', function () {
    it('issuer schedules a 2:1 split; pending getters reflect it and uiMultiplier stays 1.0 until effectiveAt', async function () {
      const { dsToken, issuer } = await scaledUIFixture();
      const effectiveAt = BigInt(await time.latest()) + DELAY;
      await expect(dsToken.connect(issuer).setUIMultiplier(TWO, effectiveAt))
        .to.emit(dsToken, 'UIMultiplierUpdated').withArgs(ONE, TWO, effectiveAt);
      expect(await dsToken.uiMultiplier()).to.equal(ONE);
      expect(await dsToken.newUIMultiplier()).to.equal(TWO);
      expect(await dsToken.effectiveAt()).to.equal(effectiveAt);
    });

    it('master can schedule too', async function () {
      const { dsToken, master } = await scaledUIFixture();
      const effectiveAt = BigInt(await time.latest()) + DELAY;
      await dsToken.connect(master).setUIMultiplier(TWO, effectiveAt);
      expect(await dsToken.newUIMultiplier()).to.equal(TWO);
    });

    it('reverts for an unauthorized caller', async function () {
      const { dsToken, unauthorized } = await scaledUIFixture();
      const effectiveAt = BigInt(await time.latest()) + DELAY;
      await expect(dsToken.connect(unauthorized).setUIMultiplier(TWO, effectiveAt)).to.be.revertedWith('Insufficient trust level');
    });

    it('reverts for a zero multiplier', async function () {
      const { dsToken, issuer } = await scaledUIFixture();
      const effectiveAt = BigInt(await time.latest()) + DELAY;
      await expect(dsToken.connect(issuer).setUIMultiplier(0, effectiveAt)).to.be.revertedWith('Multiplier out of range');
    });

    it('reverts for a multiplier typed without its 18 decimals', async function () {
      const { dsToken, issuer } = await scaledUIFixture();
      const effectiveAt = BigInt(await time.latest()) + DELAY;
      await expect(dsToken.connect(issuer).setUIMultiplier(2, effectiveAt)).to.be.revertedWith('Multiplier out of range');
    });

    it('reverts for a multiplier above the upper bound', async function () {
      const { dsToken, issuer } = await scaledUIFixture();
      const effectiveAt = BigInt(await time.latest()) + DELAY;
      await expect(dsToken.connect(issuer).setUIMultiplier(10n ** 25n, effectiveAt)).to.be.revertedWith('Multiplier out of range');
    });

    it('reverts when effectiveAt is not in the future', async function () {
      const { dsToken, issuer } = await scaledUIFixture();
      const now = BigInt(await time.latest());
      // The next block's timestamp is now + 1, so now + 1 is "not in the future" for the tx.
      await time.setNextBlockTimestamp(now + 1n);
      await expect(dsToken.connect(issuer).setUIMultiplier(TWO, now + 1n)).to.be.revertedWith('Effective At must be in the future');
    });

    it('switches to the new multiplier exactly at effectiveAt (boundary is inclusive)', async function () {
      const { dsToken, issuer } = await scaledUIFixture();
      const effectiveAt = BigInt(await time.latest()) + DELAY;
      await dsToken.connect(issuer).setUIMultiplier(TWO, effectiveAt);

      await time.increaseTo(effectiveAt - 1n);
      expect(await dsToken.uiMultiplier()).to.equal(ONE);

      await time.increaseTo(effectiveAt);
      expect(await dsToken.uiMultiplier()).to.equal(TWO);
      // Pending getters keep reporting the applied update, as in the EIP reference implementation.
      expect(await dsToken.newUIMultiplier()).to.equal(TWO);
      expect(await dsToken.effectiveAt()).to.equal(effectiveAt);
    });

    it('a second schedule after the first took effect uses the applied value as the old multiplier', async function () {
      const { dsToken, issuer } = await scaledUIFixture();
      const first = BigInt(await time.latest()) + DELAY;
      await dsToken.connect(issuer).setUIMultiplier(TWO, first);
      await time.increaseTo(first);

      const second = first + DELAY;
      const tx = dsToken.connect(issuer).setUIMultiplier(ONE_THIRD, second);
      await expect(tx).to.emit(dsToken, 'UIMultiplierUpdated').withArgs(TWO, ONE_THIRD, second);
      await expect(tx).to.not.emit(dsToken, 'UIMultiplierUpdateCancelled');
      expect(await dsToken.uiMultiplier()).to.equal(TWO);
      await time.increaseTo(second);
      expect(await dsToken.uiMultiplier()).to.equal(ONE_THIRD);
    });

    it('superseding a pending update emits UIMultiplierUpdateCancelled then UIMultiplierUpdated', async function () {
      const { dsToken, issuer } = await scaledUIFixture();
      const first = BigInt(await time.latest()) + DELAY;
      await dsToken.connect(issuer).setUIMultiplier(TWO, first);

      const second = first + DELAY;
      const tx = await dsToken.connect(issuer).setUIMultiplier(ONE_THIRD, second);
      await expect(tx).to.emit(dsToken, 'UIMultiplierUpdateCancelled').withArgs(TWO, first);
      await expect(tx).to.emit(dsToken, 'UIMultiplierUpdated').withArgs(ONE, ONE_THIRD, second);

      const receipt = await tx.wait();
      const names = receipt!.logs.map((l: any) => { try { return dsToken.interface.parseLog(l)?.name; } catch { return undefined; } }).filter(Boolean);
      expect(names).to.deep.equal(['UIMultiplierUpdateCancelled', 'UIMultiplierUpdated']);

      // The superseded value never applies.
      await time.increaseTo(first);
      expect(await dsToken.uiMultiplier()).to.equal(ONE);
      await time.increaseTo(second);
      expect(await dsToken.uiMultiplier()).to.equal(ONE_THIRD);
    });
  });

  describe('Cancelling a pending update', function () {
    it('issuer cancels; the current multiplier stays and nothing is pending', async function () {
      const { dsToken, issuer } = await scaledUIFixture();
      const effectiveAt = BigInt(await time.latest()) + DELAY;
      await dsToken.connect(issuer).setUIMultiplier(TWO, effectiveAt);

      await expect(dsToken.connect(issuer).cancelUIMultiplierUpdate())
        .to.emit(dsToken, 'UIMultiplierUpdateCancelled').withArgs(TWO, effectiveAt);
      expect(await dsToken.uiMultiplier()).to.equal(ONE);
      expect(await dsToken.newUIMultiplier()).to.equal(ONE);
      expect(await dsToken.effectiveAt()).to.equal(0);

      await time.increaseTo(effectiveAt);
      expect(await dsToken.uiMultiplier()).to.equal(ONE);
    });

    it('reverts when nothing is pending', async function () {
      const { dsToken, issuer } = await scaledUIFixture();
      await expect(dsToken.connect(issuer).cancelUIMultiplierUpdate()).to.be.revertedWith('No pending update to cancel');
    });

    it('reverts once the update has taken effect', async function () {
      const { dsToken, issuer } = await scaledUIFixture();
      const effectiveAt = BigInt(await time.latest()) + DELAY;
      await dsToken.connect(issuer).setUIMultiplier(TWO, effectiveAt);
      await time.increaseTo(effectiveAt);
      await expect(dsToken.connect(issuer).cancelUIMultiplierUpdate()).to.be.revertedWith('No pending update to cancel');
    });

    it('reverts for an unauthorized caller', async function () {
      const { dsToken, issuer, unauthorized } = await scaledUIFixture();
      const effectiveAt = BigInt(await time.latest()) + DELAY;
      await dsToken.connect(issuer).setUIMultiplier(TWO, effectiveAt);
      await expect(dsToken.connect(unauthorized).cancelUIMultiplierUpdate()).to.be.revertedWith('Insufficient trust level');
    });
  });

  describe('Raw amounts are untouched by the multiplier', function () {
    it('balanceOf, totalSupply, Transfer and transfers stay raw across a 2:1 split', async function () {
      const { dsToken, issuer, holderA, holderB } = await scaledUIFixture();
      await dsToken.connect(issuer).issueTokens(holderA, 1_000);
      const effectiveAt = BigInt(await time.latest()) + DELAY;
      await dsToken.connect(issuer).setUIMultiplier(TWO, effectiveAt);
      await time.increaseTo(effectiveAt);

      expect(await dsToken.balanceOf(holderA)).to.equal(1_000);
      expect(await dsToken.totalSupply()).to.equal(1_000);
      expect(await dsToken.balanceOfUI(holderA)).to.equal(2_000);
      expect(await dsToken.totalSupplyUI()).to.equal(2_000);

      await expect(dsToken.connect(holderA).transfer(holderB, 300))
        .to.emit(dsToken, 'Transfer').withArgs(holderA.address, holderB.address, 300);
      expect(await dsToken.balanceOf(holderA)).to.equal(700);
      expect(await dsToken.balanceOf(holderB)).to.equal(300);
      expect(await dsToken.balanceOfUI(holderA)).to.equal(1_400);
      expect(await dsToken.balanceOfUI(holderB)).to.equal(600);
    });

    it('does not emit TransferWithUIAmount', async function () {
      const { dsToken, issuer, holderA, holderB } = await scaledUIFixture();
      await dsToken.connect(issuer).issueTokens(holderA, 10);
      const tx = await dsToken.connect(holderA).transfer(holderB, 1);
      const receipt = await tx.wait();
      const names = receipt!.logs.map((l: any) => { try { return dsToken.interface.parseLog(l)?.name; } catch { return undefined; } });
      expect(names).to.not.include('TransferWithUIAmount');
    });
  });

  describe('Conversions round down', function () {
    for (const decimals of [2, 6, 18]) {
      it(`${decimals} decimals: toUIAmount / fromUIAmount floor, round trip never exceeds the input, sum(balanceOfUI) <= totalSupplyUI`, async function () {
        const { dsToken, issuer, holderA, holderB } = await scaledUIFixture(decimals);
        const unit = 10n ** BigInt(decimals);
        const a = 7n * unit + 1n; // odd amounts so the 1:3 reverse split is inexact
        const b = 5n * unit + 2n;
        await dsToken.connect(issuer).issueTokens(holderA, a);
        await dsToken.connect(issuer).issueTokens(holderB, b);

        const effectiveAt = BigInt(await time.latest()) + DELAY;
        await dsToken.connect(issuer).setUIMultiplier(ONE_THIRD, effectiveAt);
        await time.increaseTo(effectiveAt);

        expect(await dsToken.toUIAmount(a)).to.equal(floorMulDiv(a, ONE_THIRD, ONE));
        expect(await dsToken.balanceOfUI(holderA)).to.equal(floorMulDiv(a, ONE_THIRD, ONE));
        expect(await dsToken.balanceOfUI(holderB)).to.equal(floorMulDiv(b, ONE_THIRD, ONE));
        expect(await dsToken.totalSupplyUI()).to.equal(floorMulDiv(a + b, ONE_THIRD, ONE));

        const uiA = await dsToken.balanceOfUI(holderA);
        const uiB = await dsToken.balanceOfUI(holderB);
        expect(uiA + uiB).to.be.at.most(await dsToken.totalSupplyUI());

        // UI → raw floors too: a user typing their displayed balance never asks for more than they hold.
        const rawBack = await dsToken.fromUIAmount(uiA);
        expect(rawBack).to.equal(floorMulDiv(uiA, ONE, ONE_THIRD));
        expect(rawBack).to.be.at.most(a);
        expect(await dsToken.fromUIAmount(0)).to.equal(0);
        expect(await dsToken.toUIAmount(0)).to.equal(0);
      });
    }

    it('handles amounts near uint256 max without overflow (mulDiv)', async function () {
      const { dsToken, issuer } = await scaledUIFixture();
      const effectiveAt = BigInt(await time.latest()) + DELAY;
      await dsToken.connect(issuer).setUIMultiplier(TWO, effectiveAt);
      await time.increaseTo(effectiveAt);
      const big = (2n ** 256n - 1n) / 2n;
      expect(await dsToken.toUIAmount(big)).to.equal(floorMulDiv(big, TWO, ONE));
      expect(await dsToken.fromUIAmount(big)).to.equal(floorMulDiv(big, ONE, TWO));
    });
  });
});
