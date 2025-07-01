import hre from 'hardhat';
import { expect } from 'chai';
import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { deployDSTokenPartitioned, INVESTORS } from './utils/fixture';
import { registerInvestor } from './utils/test-helper';
import { DSConstants } from '../utils/globals';

describe.skip('Investor Lock Partitioned Unit Tests', function() {
  describe('Creation', function() {
    it('Should fail when trying to initialize twice', async function() {
      const { lockManager } = await loadFixture(deployDSTokenPartitioned);
      await expect(lockManager.initialize()).revertedWithCustomError(lockManager, 'InvalidInitialization');
    });

    it('Should get version correctly', async function() {
      const { lockManager } = await loadFixture(deployDSTokenPartitioned);
      expect(await lockManager.getInitializedVersion()).to.equal(1);
    });

    it('Should get implementation address correctly', async function() {
      const { lockManager } = await loadFixture(deployDSTokenPartitioned);
      expect(await lockManager.getImplementationAddress()).to.be.exist;
    });
  });

  describe('Add Manual Lock Record', function() {
    it('should revert when not specifying partition', async function() {
      const [investor] = await hre.ethers.getSigners();
      const { lockManager, registryService } = await loadFixture(deployDSTokenPartitioned);

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);

      await expect(lockManager['addManualLockRecord(address,uint256,string,uint256)'](investor, 100, 'Test', (await time.latest()) + 1000))
        .revertedWith('Must specify partition');
    });

    it('Should revert due to valueLocked = 0', async function() {
      const [investor] = await hre.ethers.getSigners();
      const { lockManager, dsToken, registryService } = await loadFixture(deployDSTokenPartitioned);

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await dsToken.issueTokensCustom(investor, 500, await time.latest(), 0, 'TEST', 0);
      const partition = await dsToken.partitionOf(investor, 0);

      await expect(lockManager['addManualLockRecord(address,uint256,string,uint256,bytes32)'](
        investor,
        0,
        'reason',
        await time.latest(),
        partition
      )).to.revertedWith('Value is zero');
    });

    it('Should revert due to release time < now && > 0', async function() {
      const [investor] = await hre.ethers.getSigners();
      const { lockManager, dsToken, registryService } = await loadFixture(deployDSTokenPartitioned);

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await dsToken.issueTokensCustom(investor, 500, await time.latest(), 0, 'TEST', 0);
      const partition = await dsToken.partitionOf(investor, 0);

      await expect(lockManager['addManualLockRecord(address,uint256,string,uint256,bytes32)'](
        investor,
        100,
        'reason',
        await time.latest(),
        partition
      )).to.revertedWith('Release time is in the past');
    });

    it('Should revert when trying to Add ManualLock Record with NONE permissions', async function() {
      const [investor, unauthorizedWallet] = await hre.ethers.getSigners();
      const { lockManager, dsToken, registryService } = await loadFixture(deployDSTokenPartitioned);

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await dsToken.issueTokensCustom(investor, 500, await time.latest(), 0, 'TEST', 0);
      const partition = await dsToken.partitionOf(investor, 0);

      const lockManagerFromUnauthorizedWallet = await lockManager.connect(unauthorizedWallet);
      await expect(lockManagerFromUnauthorizedWallet['addManualLockRecord(address,uint256,string,uint256,bytes32)'](
        investor,
        100,
        'reason',
        await time.latest() + 1000,
        partition
      )).to.revertedWith('Insufficient trust level');
    });

    it('Should revert when trying to Add ManualLock Record with EXCHANGE permissions', async function() {
      const [investor, exchange] = await hre.ethers.getSigners();
      const { lockManager, dsToken, registryService, trustService } = await loadFixture(deployDSTokenPartitioned);

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await dsToken.issueTokensCustom(investor, 500, await time.latest(), 0, 'TEST', 0);
      const partition = await dsToken.partitionOf(investor, 0);

      await trustService.setRole(exchange, DSConstants.roles.EXCHANGE);
      const lockManagerFromUnauthorizedWallet = await lockManager.connect(exchange);
      await expect(lockManagerFromUnauthorizedWallet['addManualLockRecord(address,uint256,string,uint256,bytes32)'](
        investor,
        100,
        'reason',
        await time.latest() + 1000,
        partition
      )).to.revertedWith('Insufficient trust level');
    });

    it('Should revert when trying to Add ManualLock Record with ISSUER permissions', async function() {
      const [investor, issuer] = await hre.ethers.getSigners();
      const { lockManager, dsToken, registryService, trustService } = await loadFixture(deployDSTokenPartitioned);

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await dsToken.issueTokensCustom(investor, 500, await time.latest(), 0, 'TEST', 0);
      const partition = await dsToken.partitionOf(investor, 0);

      await trustService.setRole(issuer, DSConstants.roles.EXCHANGE);
      const lockManagerFromUnauthorizedWallet = await lockManager.connect(issuer);
      await expect(lockManagerFromUnauthorizedWallet['addManualLockRecord(address,uint256,string,uint256,bytes32)'](
        investor,
        100,
        'reason',
        await time.latest() + 1000,
        partition
      )).to.revertedWith('Insufficient trust level');
    });

    it('Trying to Add ManualLock Record with roles.TRANSFER_AGENT permissions - should pass', async function() {
      const [investor, transgerAgent] = await hre.ethers.getSigners();
      const { lockManager, dsToken, registryService, trustService } = await loadFixture(deployDSTokenPartitioned);

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await dsToken.issueTokensCustom(investor, 500, await time.latest(), 0, 'TEST', 0);
      const partition = await dsToken.partitionOf(investor, 0);

      await trustService.setRole(transgerAgent, DSConstants.roles.TRANSFER_AGENT);
      const lockManagerFromTAWallet = await lockManager.connect(transgerAgent);
      await lockManagerFromTAWallet['addManualLockRecord(address,uint256,string,uint256,bytes32)'](
        investor,
        100,
        'reason',
        await time.latest() + 1000,
        partition
      );

      expect(await lockManager['lockCount(address,bytes32)'](investor, partition)).to.equal(1);
      expect(await lockManager.getTransferableTokens(investor, await time.latest())).to.equal(400);
    });
  });

  describe('RemoveLockRecord', function() {
    it('Should revert when not specifying partition', async function() {
      const [investor] = await hre.ethers.getSigners();
      const { lockManager, registryService } = await loadFixture(deployDSTokenPartitioned);

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);

      await expect(lockManager['removeLockRecord(address,uint256)'](investor, 2))
        .revertedWith('Must specify partition');
    });

    it('Should revert due to lockIndex > lastLockNumber', async function() {
      const [investor] = await hre.ethers.getSigners();
      const { lockManager, dsToken, registryService } = await loadFixture(deployDSTokenPartitioned);

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await dsToken.issueTokensCustom(investor, 500, await time.latest(), 0, 'TEST', 0);
      const partition = await dsToken.partitionOf(investor, 0);

      await lockManager['addManualLockRecord(address,uint256,string,uint256,bytes32)'](
        investor,
        100,
        'reason',
        await time.latest() + 1000,
        partition
      );

      expect(await lockManager['lockCount(address,bytes32)'](investor, partition)).to.equal(1);
      await expect(lockManager['removeLockRecord(address,uint256,bytes32)'](investor, 2, partition)).revertedWith('Index is greater than the number of locks');
    });

    it('Should revert when trying to Remove ManualLock Record with NONE permissions', async function() {
      const [investor, unauthorizedWallet] = await hre.ethers.getSigners();
      const { lockManager, dsToken, registryService } = await loadFixture(deployDSTokenPartitioned);

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await dsToken.issueTokensCustom(investor, 500, await time.latest(), 0, 'TEST', 0);
      const partition = await dsToken.partitionOf(investor, 0);

      await lockManager['addManualLockRecord(address,uint256,string,uint256,bytes32)'](
        investor,
        100,
        'reason',
        await time.latest() + 1000,
        partition
      );

      const lockManagerFromUnauthorizedWallet = await lockManager.connect(unauthorizedWallet);
      await expect(lockManagerFromUnauthorizedWallet['removeLockRecord(address,uint256,bytes32)'](investor, 0, partition)).revertedWith('Insufficient trust level');
    });

    it('Should revert when trying to Remove ManualLock Record with EXCHANGE permissions', async function() {
      const [investor, exchange] = await hre.ethers.getSigners();
      const { lockManager, dsToken, registryService, trustService } = await loadFixture(deployDSTokenPartitioned);

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await dsToken.issueTokensCustom(investor, 500, await time.latest(), 0, 'TEST', 0);
      const partition = await dsToken.partitionOf(investor, 0);

      await lockManager['addManualLockRecord(address,uint256,string,uint256,bytes32)'](
        investor,
        100,
        'reason',
        await time.latest() + 1000,
        partition
      );

      await trustService.setRole(exchange, DSConstants.roles.EXCHANGE);
      const lockManagerFromUnauthorizedWallet = await lockManager.connect(exchange);
      await expect(lockManagerFromUnauthorizedWallet['removeLockRecord(address,uint256,bytes32)'](investor, 0, partition)).revertedWith('Insufficient trust level');
    });

    it('Should revert when trying to Remove ManualLock Record with ISSUER permissions', async function() {
      const [investor, issuer] = await hre.ethers.getSigners();
      const { lockManager, dsToken, registryService, trustService } = await loadFixture(deployDSTokenPartitioned);

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await dsToken.issueTokensCustom(investor, 500, await time.latest(), 0, 'TEST', 0);
      const partition = await dsToken.partitionOf(investor, 0);

      await lockManager['addManualLockRecord(address,uint256,string,uint256,bytes32)'](
        investor,
        100,
        'reason',
        await time.latest() + 1000,
        partition
      );

      await trustService.setRole(issuer, DSConstants.roles.ISSUER);
      const lockManagerFromUnauthorizedWallet = await lockManager.connect(issuer);
      await expect(lockManagerFromUnauthorizedWallet['removeLockRecord(address,uint256,bytes32)'](investor, 0, partition)).revertedWith('Insufficient trust level');
    });

    it('Should remove ManualLock Record with TRANFER_AGENT permissions', async function() {
      const [investor, transferAgent] = await hre.ethers.getSigners();
      const { lockManager, dsToken, registryService, trustService } = await loadFixture(deployDSTokenPartitioned);

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await dsToken.issueTokensCustom(investor, 500, await time.latest(), 0, 'TEST', 0);
      const partition = await dsToken.partitionOf(investor, 0);

      await lockManager['addManualLockRecord(address,uint256,string,uint256,bytes32)'](
        investor,
        100,
        'reason',
        await time.latest() + 1000,
        partition
      );
      expect(await lockManager.getTransferableTokens(investor, await time.latest())).to.equal(400);

      await trustService.setRole(transferAgent, DSConstants.roles.TRANSFER_AGENT);
      const lockManagerFromTAWallet = await lockManager.connect(transferAgent);
      await lockManagerFromTAWallet['removeLockRecord(address,uint256,bytes32)'](investor, 0, partition);
      expect(await lockManager['lockCount(address,bytes32)'](investor, partition)).to.equal(0);
      expect(await lockManager.getTransferableTokens(investor, await time.latest())).to.equal(500);
    });
  });

  describe('Investor Full Lock', function() {
    it('Should lock an unlocked investor', async function() {
      const { lockManager, registryService } = await loadFixture(deployDSTokenPartitioned);

      await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.INVESTOR_ID.INVESTOR_ID_1);

      expect(await lockManager.isInvestorLocked(INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).equal(false);
      await expect(lockManager.lockInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).emit(lockManager, 'InvestorFullyLocked').withArgs(INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
      expect(await lockManager.isInvestorLocked(INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).equal(true);
    });

    it('Should not lock an investor if already locked', async function() {
      const { lockManager, registryService } = await loadFixture(deployDSTokenPartitioned);
      await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
      await lockManager.lockInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
      await expect(lockManager.lockInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).revertedWith('Investor is already locked');
    });

    it('Should unlock an investor', async function() {
      const { lockManager, registryService } = await loadFixture(deployDSTokenPartitioned);
      await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
      await lockManager.lockInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
      expect(await lockManager.isInvestorLocked(INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).equal(true);
      await expect(lockManager.unlockInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).emit(lockManager, 'InvestorFullyUnlocked').withArgs(INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
    });

    it('Should not unlock an investor if already locked', async function() {
      const { lockManager, registryService } = await loadFixture(deployDSTokenPartitioned);
      await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
      await lockManager.lockInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
      await lockManager.unlockInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
      await expect(lockManager.unlockInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).revertedWith('Investor is not locked');
    });

    it('Should return 0 transferable tokens if an investor is locked', async function() {
      const [investor] = await hre.ethers.getSigners();
      const { lockManager, registryService, dsToken } = await loadFixture(deployDSTokenPartitioned);
      await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
      await registryService.addWallet(investor, INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
      await dsToken.issueTokens(investor, 100);

      expect(await lockManager.getTransferableTokens(investor, await time.latest())).equal(100);
      await lockManager.lockInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
      expect(await lockManager.getTransferableTokens(investor, await time.latest())).equal(0);
      await lockManager.unlockInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
      expect(await lockManager.getTransferableTokens(investor, await time.latest())).equal(100);
    });
  });
});
