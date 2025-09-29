import { expect } from 'chai';
import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { deployDSTokenRegulated, INVESTORS } from './utils/fixture';
import hre from 'hardhat';
import { DSConstants } from '../utils/globals';

describe('Bulk operator', () => {
  const deployFixture = async () => {
    const { dsToken, bulkOperator, trustService, registryService } = await deployDSTokenRegulated();
    const [owner,
      investor1,
      investor2,
      investor3,
      investor4] = await hre.ethers.getSigners();
    await registryService.registerInvestor(
      INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
      INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1);
    await registryService.registerInvestor(
      INVESTORS.INVESTOR_ID.INVESTOR_ID_2,
      INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_2);
    await registryService.addWallet(
      investor1.address,
      INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
    await registryService.addWallet(investor2.address, INVESTORS.INVESTOR_ID.INVESTOR_ID_2);
    const registerAndIssuanceUS = {
      id: INVESTORS.INVESTOR_ID.US_INVESTOR_ID,
      to: investor3.address,
      issuanceValues: [200, 1],
      reason: 'unit test',
      locksValues: [],
      lockReleaseTimes: [],
      country: INVESTORS.Country.USA,
      attributeValues: [1, 1, 1],
      attributeExpirations: [0, 0, 0],
    };
    const registerAndIssuanceUS2 = {
      id: INVESTORS.INVESTOR_ID.US_INVESTOR_ID_2,
      to: investor4.address,
      issuanceValues: [200, 1],
      reason: 'unit test',
      locksValues: [],
      lockReleaseTimes: [],
      country: INVESTORS.Country.USA,
      attributeValues: [1, 1, 1],
      attributeExpirations: [0, 0, 0],
    };
    return {
      dsToken,
      bulkOperator,
      owner,
      investor1,
      investor2,
      trustService,
      registryService,
      registerAndIssuanceUS,
      registerAndIssuanceUS2,
    };
  };

  describe('Bulk Operator', () => {
    describe('Initial setup', () => {
      it('SHOULD contract be initialized', async () => {
        const { bulkOperator } = await loadFixture(deployFixture);
        expect(bulkOperator.target).to.not.be.undefined;
        expect(await bulkOperator.getInitializedVersion()).to.be.equal(1);
        expect(await bulkOperator.getVersion()).to.be.equal(2);
      });
      it('SHOULD fail when trying to initialize twice', async () => {
        const { bulkOperator, dsToken } = await loadFixture(deployFixture);
        await expect(bulkOperator.initialize(dsToken.target))
          .to.revertedWithCustomError(bulkOperator, 'InvalidInitialization');
      });
      it('SHOULD fail when trying to initialize implementation contract directly', async () => {
        const implementation = await hre.ethers.deployContract('BulkOperator');
        await expect(implementation.initialize(hre.ethers.ZeroAddress))
          .to.revertedWithCustomError(implementation, 'InvalidInitialization');
      });
    });
    describe('BulkOperator pause methods', () => {
      it('SHOULD pause the contract', async () => {
        const { bulkOperator } = await loadFixture(deployFixture);
        expect(await bulkOperator.paused()).to.be.false;
        await bulkOperator.pause();
        expect(await bulkOperator.paused()).to.be.true;
      });
      it('SHOULD fail when trying to pause a paused contract', async () => {
        const { bulkOperator } = await loadFixture(deployFixture);
        expect(await bulkOperator.paused()).to.be.false;
        await bulkOperator.pause();
        await expect(bulkOperator.pause()).to.be.reverted;
      });
      it('SHOULD unpause the contract', async () => {
        const { bulkOperator } = await loadFixture(deployFixture);
        expect(await bulkOperator.paused()).to.be.false;
        await bulkOperator.pause();
        expect(await bulkOperator.paused()).to.be.true;
        await bulkOperator.unpause();
        expect(await bulkOperator.paused()).to.be.false;
      });
      it('SHOULD fail when trying to pause the contract with an unauthorized wallet', async () => {
        const { bulkOperator } = await loadFixture(deployFixture);
        const [_, unauthorizedWallet] = await hre.ethers.getSigners();
        expect(await bulkOperator.paused()).to.be.false;
        await expect(bulkOperator.connect(unauthorizedWallet).pause())
          .to.revertedWithCustomError(bulkOperator, 'OwnableUnauthorizedAccount');
      });
      it('SHOULD fail when trying to unpause the contract with an unauthorized wallet', async () => {
        const { bulkOperator } = await loadFixture(deployFixture);
        const [_, unauthorizedWallet] = await hre.ethers.getSigners();
        expect(await bulkOperator.paused()).to.be.false;
        await bulkOperator.pause();
        expect(await bulkOperator.paused()).to.be.true;
        await expect(bulkOperator.connect(unauthorizedWallet).pause())
          .to.revertedWithCustomError(bulkOperator, 'OwnableUnauthorizedAccount');
      });
    });
    describe('bulkOperator bulkIssuance method', () => {
      it('SHOULD fail if contract is paused', async () => {
        const { bulkOperator, investor1 } = await loadFixture(deployFixture);
        await bulkOperator.pause();
        await expect(bulkOperator.bulkIssuance([investor1.address], [1], time.latestBlock()))
          .to.revertedWithCustomError(bulkOperator, 'EnforcedPause');
      });
      it('SHOULD fail when sender is not Issuer', async () => {
        const { bulkOperator, investor1 } = await loadFixture(deployFixture);
        await expect(bulkOperator.connect(investor1).bulkIssuance([investor1.address], [1], time.latestBlock()))
          .to.revertedWith('Insufficient trust level');
      });

      it('SHOULD fail when contract is not Issuer', async () => {
        const { dsToken, investor1, trustService } = await loadFixture(deployFixture);
        const wrongBulk = await hre.run('deploy-bulk-operator', { dsToken: dsToken.target });
        await wrongBulk.setDSService(DSConstants.services.TRUST_SERVICE, trustService.getAddress());
        await expect(wrongBulk.bulkIssuance([investor1.address], [1], time.latestBlock()))
          .to.revertedWith('Insufficient trust level');
      });
      it('SHOULD fail when addresses and values length mismatch', async () => {
        const { bulkOperator, investor1 } = await loadFixture(deployFixture);
        await expect(bulkOperator.bulkIssuance([investor1.address], [], time.latestBlock()))
          .to.revertedWith('Addresses and values length mismatch');
      });
      it('SHOULD do a bulkIssuance successfully', async () => {
        const { dsToken, bulkOperator, investor1, investor2 } = await loadFixture(deployFixture);
        expect(await dsToken.balanceOfInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).to.equal(0);
        expect(await dsToken.balanceOfInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2)).to.equal(0);
        await bulkOperator.bulkIssuance([investor1.address, investor2.address], [1, 2], time.latestBlock());
        expect(await dsToken.balanceOfInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).to.equal(1);
        expect(await dsToken.balanceOfInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2)).to.equal(2);
      });
    });
    describe('bulkOperator bulkRegisterAndIssuance method', () => {
      it('SHOULD fail if contract is paused', async () => {
        const { bulkOperator } = await loadFixture(deployFixture);
        await bulkOperator.pause();
        await expect(bulkOperator.bulkRegisterAndIssuance([]))
          .to.revertedWithCustomError(bulkOperator, 'EnforcedPause');
      });
      it('SHOULD fail when sender is not Issuer', async () => {
        const { bulkOperator, investor1, registerAndIssuanceUS } = await loadFixture(deployFixture);
        await expect(bulkOperator.connect(investor1).bulkRegisterAndIssuance([registerAndIssuanceUS]))
          .to.revertedWith('Insufficient trust level');
      });
      it('SHOULD fail when contract is not Issuer', async () => {
        const { dsToken, trustService, registerAndIssuanceUS } = await loadFixture(deployFixture);
        const wrongBulk = await hre.run('deploy-bulk-operator', { dsToken: dsToken.target });
        await wrongBulk.setDSService(DSConstants.services.TRUST_SERVICE, trustService.getAddress());
        await expect(wrongBulk.bulkRegisterAndIssuance([registerAndIssuanceUS]))
          .to.reverted;
      });
      it('SHOULD do a bulk register and issuance successfully', async () => {
        const {
          bulkOperator,
          dsToken,
          registryService,
          registerAndIssuanceUS,
          registerAndIssuanceUS2,
        } = await loadFixture(deployFixture);
        await bulkOperator.bulkRegisterAndIssuance([registerAndIssuanceUS, registerAndIssuanceUS2]);
        const id = await registryService.getInvestor(registerAndIssuanceUS.to);
        expect(id).to.be.equal(registerAndIssuanceUS.id);
        const investorBalance = await dsToken.balanceOfInvestor(registerAndIssuanceUS.id);
        expect(investorBalance).to.be.equal(registerAndIssuanceUS.issuanceValues[0]);
        const id2 = await registryService.getInvestor(registerAndIssuanceUS2.to);
        expect(id2).to.be.equal(registerAndIssuanceUS2.id);
        const investorBalance2 = await dsToken.balanceOfInvestor(registerAndIssuanceUS2.id);
        expect(investorBalance2).to.be.equal(registerAndIssuanceUS2.issuanceValues[0]);
      });
    });
    describe('bulkOperator burnToken method', () => {
      it('SHOULD fail if contract is paused', async () => {
        const { bulkOperator, registerAndIssuanceUS2 } = await loadFixture(deployFixture);
        await bulkOperator.pause();
        await expect(bulkOperator.bulkBurn([registerAndIssuanceUS2.to], [1]))
          .to.revertedWithCustomError(bulkOperator, 'EnforcedPause');
      });
      it('SHOULD fail when sender is not Issuer', async () => {
        const { bulkOperator, investor1, registerAndIssuanceUS } = await loadFixture(deployFixture);
        await expect(bulkOperator.connect(investor1).bulkBurn([registerAndIssuanceUS.to], [1]))
          .to.revertedWith('Insufficient trust level');
      });
      it('SHOULD fail when contract is not Issuer', async () => {
        const { dsToken, trustService, registerAndIssuanceUS } = await loadFixture(deployFixture);
        const wrongBulk = await hre.run('deploy-bulk-operator', { dsToken: dsToken.target });
        await wrongBulk.setDSService(DSConstants.services.TRUST_SERVICE, trustService.getAddress());
        await expect(wrongBulk.bulkBurn([registerAndIssuanceUS.to], [1]))
          .to.reverted;
      });
      it('SHOULD fail when addresses and values length mismatch', async () => {
        const { bulkOperator, registerAndIssuanceUS2 } = await loadFixture(deployFixture);
        await expect(bulkOperator.bulkBurn([registerAndIssuanceUS2.to], []))
          .to.revertedWith('Addresses and values length mismatch');
      });
      it('SHOULD do a Bulk Burn successfully', async () => {
        const { dsToken, bulkOperator, investor1, investor2 } = await loadFixture(deployFixture);
        expect(await dsToken.balanceOfInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).to.equal(0);
        expect(await dsToken.balanceOfInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2)).to.equal(0);
        await bulkOperator.bulkIssuance([investor1.address, investor2.address], [100, 200], time.latestBlock());
        expect(await dsToken.balanceOfInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).to.equal(100);
        expect(await dsToken.balanceOfInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2)).to.equal(200);
        await bulkOperator.bulkBurn([investor1.address, investor2.address], [100, 200]);
        expect(await dsToken.balanceOfInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).to.equal(0);
        expect(await dsToken.balanceOfInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2)).to.equal(0);
      });
    });
  });
});
