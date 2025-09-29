import hre from 'hardhat';
import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { deployDSTokenRegulated, INVESTORS } from './utils/fixture';
import { DSConstants } from '../utils/globals';

describe('Lock Manager Unit Tests', function() {
  describe('Creation', function() {
    it('Should fail when trying to initialize twice', async function() {
      const { lockManager } = await loadFixture(deployDSTokenRegulated);
      await expect(lockManager.initialize()).revertedWithCustomError(lockManager, 'InvalidInitialization');
    });

    it('Should get version correctly', async function() {
      const { lockManager } = await loadFixture(deployDSTokenRegulated);
      expect( await lockManager.getInitializedVersion()).to.equal(1);
    });

    it('Should get implementation address correctly', async function() {
      const { lockManager } = await loadFixture(deployDSTokenRegulated);
      expect( await lockManager.getImplementationAddress()).to.be.exist;
    });

    it('SHOULD fail when trying to initialize implementation contract directly', async () => {
      const implementation = await hre.ethers.deployContract('LockManager');
      await expect(implementation.initialize()).to.revertedWithCustomError(implementation, 'UUPSUnauthorizedCallContext');
    });
  });

  describe('Add Manual Lock Record', function() {
    it('Should revert due to valueLocked = 0', async function() {
      const [ investor ] = await hre.ethers.getSigners();
      const { lockManager } = await loadFixture(deployDSTokenRegulated);
      await expect(lockManager.addManualLockRecord(
        investor,
        0,
        'reason',
        await time.latest()
      )).to.revertedWith('Value is zero');
    });

    it('Should revert due to release time < now && > 0', async function() {
      const [ investor ] = await hre.ethers.getSigners();
      const { lockManager } = await loadFixture(deployDSTokenRegulated);
      await expect(lockManager.addManualLockRecord(
        investor,
        100,
        'reason',
        await time.latest() - 1000
      )).to.revertedWith('Release time is in the past');
    });

    it('Should revert when trying to Add ManualLock Record with NONE permissions', async function() {
      const [ investor, unauthorizedWallet ] = await hre.ethers.getSigners();
      const { lockManager } = await loadFixture(deployDSTokenRegulated);
      const lockManagerFromUnauthorizedWallet = await lockManager.connect(unauthorizedWallet);
      await expect(lockManagerFromUnauthorizedWallet.addManualLockRecord(
        investor,
        0,
        'reason',
        await time.latest() + 1000
      )).to.revertedWith('Insufficient trust level');
    });

    it('Should revert when trying to Add ManualLock Record with EXCHANGE permissions', async function() {
      const [ investor, exchangeWallet ] = await hre.ethers.getSigners();
      const { lockManager, trustService } = await loadFixture(deployDSTokenRegulated);
      await trustService.setRole(exchangeWallet, DSConstants.roles.EXCHANGE);
      const lockManagerFromExchangeWallet = await lockManager.connect(exchangeWallet);
      await expect(lockManagerFromExchangeWallet.addManualLockRecord(
        investor,
        0,
        'reason',
        await time.latest() + 1000
      )).to.revertedWith('Insufficient trust level');
    });

    it('Should revert when trying to Add ManualLock Record with ISSUER permissions', async function() {
      const [ investor, issuerWallet ] = await hre.ethers.getSigners();
      const { lockManager, trustService } = await loadFixture(deployDSTokenRegulated);
      await trustService.setRole(issuerWallet, DSConstants.roles.ISSUER);
      const lockManagerFromIssuerWallet = await lockManager.connect(issuerWallet);
      await expect(lockManagerFromIssuerWallet.addManualLockRecord(
        investor,
        0,
        'reason',
        await time.latest() + 1000
      )).to.revertedWith('Insufficient trust level');
    });

    it('Should add ManualLock Record with TRANSFER_AGENT permissions', async function() {
      const [ investor, taWallet ] = await hre.ethers.getSigners();
      const { lockManager, trustService, dsToken, tokenIssuer } = await loadFixture(deployDSTokenRegulated);
      await trustService.setRole(taWallet, DSConstants.roles.TRANSFER_AGENT);
      const lockManagerFromTAWallet = await lockManager.connect(taWallet);

      await tokenIssuer.issueTokens(
        INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
        investor,
        [ 100, 1 ],
        'a',
        [],
        [],
        INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
        'US',
        [ 0, 0, 0 ],
        [ 0, 0, 0 ]
      );

      expect(await dsToken.balanceOf(investor)).to.equal(100);

      await lockManagerFromTAWallet.addManualLockRecord(
        investor,
        100,
        'reason',
        await time.latest() + 1000
      );

      expect(await lockManager.lockCount(investor)).to.equal(1);
      expect(await lockManager.getTransferableTokens(investor, await time.latest())).to.equal(0);
    });
  });

  describe('Remove Lock Record:', function() {
    it('Should revert due to lockIndex > lastLockNumber', async function() {
      const [ investor ] = await hre.ethers.getSigners();
      const { lockManager } = await loadFixture(deployDSTokenRegulated);
      await lockManager.addManualLockRecord(
        investor,
        100,
        'reason',
        await time.latest() + 1000
      );

      expect(await lockManager.lockCount(investor)).to.equal(1);
      await expect(lockManager.removeLockRecord(investor, 2)).to.revertedWith('Index is greater than the number of locks');
    });

    it('Should revert when trying to Remove ManualLock Record with NONE permissions', async function() {
      const [ investor, unauthorizedWallet ] = await hre.ethers.getSigners();
      const { lockManager } = await loadFixture(deployDSTokenRegulated);
      await lockManager.addManualLockRecord(
        investor,
        100,
        'reason',
        await time.latest() + 1000
      );
      expect(await lockManager.lockCount(investor)).to.equal(1);
      const lockManagerFromUnauthorizedWallet = await lockManager.connect(unauthorizedWallet);
      await expect(lockManagerFromUnauthorizedWallet.removeLockRecord(investor, 0)).to.revertedWith('Insufficient trust level');
    });

    it('Should revert when trying to Remove ManualLock Record with EXCHANGE permissions', async function() {
      const [ investor, exchangeWallet ] = await hre.ethers.getSigners();
      const { lockManager, trustService } = await loadFixture(deployDSTokenRegulated);
      await trustService.setRole(exchangeWallet, DSConstants.roles.EXCHANGE);
      await lockManager.addManualLockRecord(
        investor,
        100,
        'reason',
        await time.latest() + 1000
      );
      expect(await lockManager.lockCount(investor)).to.equal(1);
      const lockManagerFromExchangeWallet = await lockManager.connect(exchangeWallet);
      await expect(lockManagerFromExchangeWallet.removeLockRecord(investor, 0)).to.revertedWith('Insufficient trust level');
    });

    it('Should revert when trying to Remove ManualLock Record with ISSUER permissions', async function() {
      const [ investor, issuerWallet ] = await hre.ethers.getSigners();
      const { lockManager, trustService } = await loadFixture(deployDSTokenRegulated);
      await trustService.setRole(issuerWallet, DSConstants.roles.ISSUER);
      await lockManager.addManualLockRecord(
        investor,
        100,
        'reason',
        await time.latest() + 1000
      );
      expect(await lockManager.lockCount(investor)).to.equal(1);
      const lockManagerFromIssuerWallet = await lockManager.connect(issuerWallet);
      await expect(lockManagerFromIssuerWallet.removeLockRecord(investor, 0)).to.revertedWith('Insufficient trust level');
    });

    it('Should remove ManualLock Record with TRANFER_AGENT permissions', async function() {
      const [ investor, taWallet ] = await hre.ethers.getSigners();
      const { lockManager, trustService, dsToken, tokenIssuer } = await loadFixture(deployDSTokenRegulated);
      await trustService.setRole(taWallet, DSConstants.roles.TRANSFER_AGENT);
      const lockManagerFromTAWallet = await lockManager.connect(taWallet);

      await tokenIssuer.issueTokens(
        INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
        investor,
        [ 100, 1 ],
        'a',
        [],
        [],
        INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
        'US',
        [ 0, 0, 0 ],
        [ 0, 0, 0 ]
      );

      expect(await dsToken.balanceOf(investor)).to.equal(100);

      await lockManagerFromTAWallet.addManualLockRecord(
        investor,
        100,
        'reason',
        await time.latest() + 1000
      );

      expect(await lockManager.lockCount(investor)).to.equal(1);
      expect(await lockManager.getTransferableTokens(investor, await time.latest())).to.equal(0);

      await lockManagerFromTAWallet.removeLockRecord(investor, 0);
      expect(await lockManager.lockCount(investor)).to.equal(0);
    });
  });

  describe('Lock Count:', function() {
    it('Should return 0', async function() {
      const [ investor ] = await hre.ethers.getSigners();
      const { lockManager } = await loadFixture(deployDSTokenRegulated);
      expect(await lockManager.lockCount(investor)).to.equal(0);
    });

    it('Should return 1', async function() {
      const [ investor ] = await hre.ethers.getSigners();
      const { lockManager } = await loadFixture(deployDSTokenRegulated);
      await lockManager.addManualLockRecord(
        investor,
        100,
        'reason',
        await time.latest() + 1000
      );
      expect(await lockManager.lockCount(investor)).to.equal(1);
    });
  });

  describe('Lock info:', function () {
    it('Should revert due to lockIndex > lastLockNumber', async function () {
      const [ investor ] = await hre.ethers.getSigners();
      const { lockManager } = await loadFixture(deployDSTokenRegulated);
      await lockManager.addManualLockRecord(
        investor,
        100,
        'reason',
        await time.latest() + 1000
      );
      await expect(lockManager.lockInfo(investor, 1)).to.revertedWith('Index is greater than the number of locks')
    });

    it('Should check lock info', async function () {
      const [ investor ] = await hre.ethers.getSigners();
      const { lockManager } = await loadFixture(deployDSTokenRegulated);
      const releaseTime = await time.latest() + 1000;
      await lockManager.addManualLockRecord(
        investor,
        100,
        'reason',
        releaseTime
      );
      expect(await lockManager.lockCount(investor)).to.equal(1);
      const info = await lockManager.lockInfo(investor, 0);
      expect(info[0]).to.equal(0);
      expect(info[1]).to.equal('reason');
      expect(info[2]).to.equal(100);
      expect(info[3]).to.equal(releaseTime);
    });
  });

  describe('Get Transferable Tokens:', function () {
    it('Should revert due to time = 0', async function () {
      const [ investor ] = await hre.ethers.getSigners();
      const { lockManager } = await loadFixture(deployDSTokenRegulated);
      await expect(lockManager.getTransferableTokens(investor, 0)).to.revertedWith('Time must be greater than zero');
    });

    it('Should return 0 because tokens will be locked', async function () {
      const [ investor ] = await hre.ethers.getSigners();
      const { lockManager, tokenIssuer } = await loadFixture(deployDSTokenRegulated);
      const releaseTime = await time.latest() + 1000;

      await tokenIssuer.issueTokens(
        INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
        investor,
        [ 100, 1 ],
        'a',
        [],
        [],
        INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
        'US',
        [ 0, 0, 0 ],
        [ 0, 0, 0 ]
      );

      await lockManager.addManualLockRecord(
        investor,
        100,
        'reason',
        releaseTime
      );
      expect(await lockManager.getTransferableTokens(investor, releaseTime - 100)).to.equal(0);
    });

    it('Should return 100 because tokens will be unlocked', async function () {
      const [ investor ] = await hre.ethers.getSigners();
      const { lockManager, tokenIssuer } = await loadFixture(deployDSTokenRegulated);
      const releaseTime = await time.latest() + 1000;

      await tokenIssuer.issueTokens(
        INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
        investor,
        [ 100, 1 ],
        'a',
        [],
        [],
        INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
        'US',
        [ 0, 0, 0 ],
        [ 0, 0, 0 ]
      );

      await lockManager.addManualLockRecord(
        investor,
        100,
        'reason',
        releaseTime
      );
      expect(await lockManager.getTransferableTokens(investor, releaseTime + 100)).to.equal(100);
    });

    it('Should return correct values when tokens will be locked with multiple locks', async function () {
      const [ investor ] = await hre.ethers.getSigners();
      const { lockManager, tokenIssuer } = await loadFixture(deployDSTokenRegulated);
      const releaseTime = await time.latest() + 1000;

      await tokenIssuer.issueTokens(
        INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
        investor,
        [ 300, 1 ],
        'a',
        [],
        [],
        INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
        'US',
        [ 0, 0, 0 ],
        [ 0, 0, 0 ]
      );

      await lockManager.addManualLockRecord(
        investor,
        100,
        'reason',
        releaseTime + 100
      );

      await lockManager.addManualLockRecord(
        investor,
        100,
        'reason',
        releaseTime + 200
      );

      expect(await lockManager.getTransferableTokens(investor, await time.latest())).to.equal(100);
      expect(await lockManager.getTransferableTokens(investor, releaseTime + 101)).to.equal(200);
      expect(await lockManager.getTransferableTokens(investor, releaseTime + 201)).to.equal(300);
    });
  });
});
