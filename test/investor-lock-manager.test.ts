import hre from 'hardhat';
import { expect } from 'chai';
import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { deployDSTokenRegulated, deployDSTokenPermissionless, INVESTORS, DAYS } from './utils/fixture';

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

  // ─── BC-2188: empty investor ID guard ────────────────────────────────────────

  describe('Empty investor ID guard (Permissionless / StubRegistryService)', function () {
    it('issueTokensCustom with manual lock silently skips the lock under Permissionless', async function () {
      // Under StubRegistryService getInvestor() always returns "" — createLock must skip writing
      // to investorsLocks[""] rather than silently polluting the shared bucket or reverting.
      const { dsToken, lockManager } = await loadFixture(deployDSTokenPermissionless);
      const [, , user] = await hre.ethers.getSigners();
      const userAddress = await user.getAddress();
      const releaseTime = (await time.latest()) + 30 * DAYS;

      await expect(
        dsToken.issueTokensCustom(userAddress, 100, await time.latest(), 1, 'lock', releaseTime)
      ).to.not.be.reverted;

      // Token was issued but no lock record was written — shared "" bucket stays empty
      expect(await dsToken.balanceOf(userAddress)).to.equal(100);
      expect(await lockManager.lockCountForInvestor('')).to.equal(0);
    });

    it('30 issueTokensCustom-with-lock calls do not exhaust any cap under Permissionless', async function () {
      // Regression for BC-2188: before the fix, 30 such calls would exhaust investorsLocks[""]
      // and permanently DoS all further issuances with locks.
      const { dsToken, lockManager } = await loadFixture(deployDSTokenPermissionless);
      const signers = await hre.ethers.getSigners();
      const releaseTime = (await time.latest()) + 30 * DAYS;

      for (let i = 0; i < 30; i++) {
        const recipient = await signers[(i % 5) + 2].getAddress();
        await expect(
          dsToken.issueTokensCustom(recipient, 10, await time.latest(), 1, `lock-${i}`, releaseTime)
        ).to.not.be.reverted;
      }

      expect(await lockManager.lockCountForInvestor('')).to.equal(0);
    });

    it('issueTokensCustom without manual lock still works under Permissionless', async function () {
      const { dsToken } = await loadFixture(deployDSTokenPermissionless);
      const [, , user] = await hre.ethers.getSigners();
      const userAddress = await user.getAddress();
      await expect(
        dsToken.issueTokensCustom(userAddress, 100, await time.latest(), 0, '', 0)
      ).to.not.be.reverted;
      expect(await dsToken.balanceOf(userAddress)).to.equal(100);
    });

    it('createLock skips silently for platform wallet under Regulated (empty investor ID)', async function () {
      // Platform wallets are not registered investors — getInvestor returns "".
      // The lock write must be skipped rather than polluting investorsLocks[""].
      const { dsToken, lockManager, walletManager } = await loadFixture(deployDSTokenRegulated);
      const [, platformWallet] = await hre.ethers.getSigners();
      const platformWalletAddress = await platformWallet.getAddress();
      await walletManager.addPlatformWallet(platformWalletAddress);
      const releaseTime = (await time.latest()) + 30 * DAYS;

      await expect(
        dsToken.issueTokensCustom(platformWalletAddress, 100, await time.latest(), 100, 'lock', releaseTime)
      ).to.not.be.reverted;
      expect(await lockManager.lockCountForInvestor('')).to.equal(0);
    });

    it('createLockForInvestor works normally with a non-empty investor ID (Regulated)', async function () {
      // Confirms the guard does not affect the Regulated model where investor IDs are real strings.
      const { lockManager, registryService } = await loadFixture(deployDSTokenRegulated);
      await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
      const releaseTime = (await time.latest()) + 30 * DAYS;
      await expect(
        lockManager.createLockForInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, 100, 0, 'reason', releaseTime)
      ).to.not.be.reverted;
      expect(await lockManager.lockCountForInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).to.equal(1);
    });
  });
});
