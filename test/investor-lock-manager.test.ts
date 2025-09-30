import hre from 'hardhat';
import { expect } from 'chai';
import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { deployDSTokenRegulated, INVESTORS } from './utils/fixture';

describe('Investor Lock Unit Tests', function() {
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
      const implementation = await hre.ethers.deployContract('InvestorLockManager');
      await expect(implementation.initialize()).to.revertedWithCustomError(implementation, 'UUPSUnauthorizedCallContext');
    });
  });

  describe('Investor Full Lock', function () {
    it('Should lock an unlocked investor', async function() {
      const { lockManager, registryService } = await loadFixture(deployDSTokenRegulated);

      await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.INVESTOR_ID.INVESTOR_ID_1);

      expect(await lockManager.isInvestorLocked(INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).equal(false);
      await expect(lockManager.lockInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).emit(lockManager, 'InvestorFullyLocked').withArgs(INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
      expect(await lockManager.isInvestorLocked(INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).equal(true);
    });

    it('Should not lock an investor if already locked', async function () {
      const { lockManager, registryService } = await loadFixture(deployDSTokenRegulated);
      await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
      await lockManager.lockInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
      await expect(lockManager.lockInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).revertedWith('Investor is already locked')
    });

    it('Should unlock an investor', async function () {
      const { lockManager, registryService } = await loadFixture(deployDSTokenRegulated);
      await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
      await lockManager.lockInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
      expect(await lockManager.isInvestorLocked(INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).equal(true);
      await expect(lockManager.unlockInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).emit(lockManager, 'InvestorFullyUnlocked').withArgs(INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
    });

    it('Should not unlock an investor if already locked', async function () {
      const { lockManager, registryService } = await loadFixture(deployDSTokenRegulated);
      await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
      await lockManager.lockInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
      await lockManager.unlockInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
      await expect(lockManager.unlockInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).revertedWith('Investor is not locked')
    });

    it('Should return 0 transferable tokens if an investor is locked', async function () {
      const [ investor ] = await hre.ethers.getSigners();
      const { lockManager, registryService, dsToken } = await loadFixture(deployDSTokenRegulated);
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
