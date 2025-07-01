import hre from 'hardhat';
import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { deployDSTokenPartitioned, INVESTORS, TBE } from './utils/fixture';
import { assertCounters, getCountersDelta, setCounters } from './utils/test-helper';
import { expect } from 'chai';

describe.skip('Omnibus TBE Controller Partitioned Unit Tests', function() {
  describe('Creation', function() {
    it('Should fail when trying to initialize twice', async function() {
      const { omnibusTBEController } = await loadFixture(deployDSTokenPartitioned);
      await expect(omnibusTBEController.initialize(TBE, false)).revertedWithCustomError(omnibusTBEController, 'InvalidInitialization');
    });

    it('Should get version correctly', async function() {
      const { omnibusTBEController } = await loadFixture(deployDSTokenPartitioned);
      expect(await omnibusTBEController.getInitializedVersion()).to.equal(1);
    });

    it('Should get implementation address correctly', async function() {
      const { omnibusTBEController } = await loadFixture(deployDSTokenPartitioned);
      expect(await omnibusTBEController.getImplementationAddress()).to.be.exist;
    });
  });

  describe('Bulk issuance', function() {
    it('Should bulk issue tokens correctly', async function() {
      const {
        omnibusTBEController,
        complianceService,
        complianceConfigurationService,
        dsToken
      } = await loadFixture(deployDSTokenPartitioned);

      await complianceService.setTotalInvestorsCount(1);
      await complianceConfigurationService.setNonAccreditedInvestorsLimit(1);
      const value = 1000;
      const txCounters = {
        totalInvestorsCount: 1,
        accreditedInvestorsCount: 1,
        usTotalInvestorsCount: 0,
        usAccreditedInvestorsCount: 0,
        jpTotalInvestorsCount: 0
      };

      const euRetailCountries = [hre.ethers.zeroPadBytes(hre.ethers.toUtf8Bytes('EU'), 32)];
      const euRetailCountryCounts = ['1'];

      await setCounters(txCounters, complianceService);

      await expect(omnibusTBEController.bulkIssuance(
        value,
        await time.latest(),
        txCounters.totalInvestorsCount,
        txCounters.accreditedInvestorsCount,
        txCounters.usAccreditedInvestorsCount,
        txCounters.usTotalInvestorsCount,
        txCounters.jpTotalInvestorsCount,
        euRetailCountries,
        euRetailCountryCounts
      )).to.emit(dsToken, 'OmnibusTBEOperation').withArgs(TBE, 1, 1, 0, 0, 0);

      await assertCounters(complianceService);
      expect(await dsToken.balanceOf(TBE)).to.equal(value);
    });

    it('Should bulk issue tokens correctly w/o countries array', async function() {
      const {
        omnibusTBEController,
        complianceService,
        complianceConfigurationService,
        dsToken
      } = await loadFixture(deployDSTokenPartitioned);

      await complianceService.setTotalInvestorsCount(1);
      await complianceConfigurationService.setNonAccreditedInvestorsLimit(1);
      const value = 1000;
      const txCounters = {
        totalInvestorsCount: 1,
        accreditedInvestorsCount: 1,
        usTotalInvestorsCount: 0,
        usAccreditedInvestorsCount: 0,
        jpTotalInvestorsCount: 0
      };

      await setCounters(txCounters, complianceService);

      await expect(omnibusTBEController.bulkIssuance(
        value,
        await time.latest(),
        txCounters.totalInvestorsCount,
        txCounters.accreditedInvestorsCount,
        txCounters.usAccreditedInvestorsCount,
        txCounters.usTotalInvestorsCount,
        txCounters.jpTotalInvestorsCount,
        [],
        []
      )).to.emit(dsToken, 'OmnibusTBEOperation').withArgs(TBE, 1, 1, 0, 0, 0);

      await assertCounters(complianceService);
      expect(await dsToken.balanceOf(TBE)).to.equal(value);
    });

    it('Should not bulk issue tokens if it exceeds counter', async function() {
      const {
        omnibusTBEController,
        complianceService,
        complianceConfigurationService
      } = await loadFixture(deployDSTokenPartitioned);

      await complianceService.setTotalInvestorsCount(1);
      await complianceConfigurationService.setNonAccreditedInvestorsLimit(1);
      const value = 1000;
      const txCounters = {
        totalInvestorsCount: 1,
        accreditedInvestorsCount: 0,
        usTotalInvestorsCount: 0,
        usAccreditedInvestorsCount: 0,
        jpTotalInvestorsCount: 0
      };

      await setCounters(txCounters, complianceService);

      await expect(omnibusTBEController.bulkIssuance(
        value,
        await time.latest(),
        txCounters.totalInvestorsCount,
        txCounters.accreditedInvestorsCount,
        txCounters.usAccreditedInvestorsCount,
        txCounters.usTotalInvestorsCount,
        txCounters.jpTotalInvestorsCount,
        [],
        []
      )).to.revertedWith('Max investors in category');
    });

    it('Should not bulk issue tokens if countries array does not match with country counters array', async function() {
      const {
        omnibusTBEController,
        complianceService,
        complianceConfigurationService
      } = await loadFixture(deployDSTokenPartitioned);

      await complianceService.setTotalInvestorsCount(1);
      await complianceConfigurationService.setNonAccreditedInvestorsLimit(1);
      const value = 1000;
      const txCounters = {
        totalInvestorsCount: 1,
        accreditedInvestorsCount: 1,
        usTotalInvestorsCount: 0,
        usAccreditedInvestorsCount: 0,
        jpTotalInvestorsCount: 0
      };

      await setCounters(txCounters, complianceService);

      const euRetailCountries = [hre.ethers.zeroPadBytes(hre.ethers.toUtf8Bytes('EU'), 32)];
      const euRetailCountryCounts = [];

      await expect(omnibusTBEController.bulkIssuance(
        value,
        await time.latest(),
        txCounters.totalInvestorsCount,
        txCounters.accreditedInvestorsCount,
        txCounters.usAccreditedInvestorsCount,
        txCounters.usTotalInvestorsCount,
        txCounters.jpTotalInvestorsCount,
        euRetailCountries,
        euRetailCountryCounts
      )).to.revertedWith('EU Retail countries arrays do not match');
    });
  });

  describe('Bulk burn', function() {
    it('Should bulk burn tokens correctly', async function() {
      const {
        omnibusTBEController,
        complianceService,
        complianceConfigurationService,
        dsToken
      } = await loadFixture(deployDSTokenPartitioned);

      await complianceService.setTotalInvestorsCount(1);
      await complianceConfigurationService.setNonAccreditedInvestorsLimit(1);
      const value = 1000;
      const txCounters = {
        totalInvestorsCount: 5,
        accreditedInvestorsCount: 5,
        usTotalInvestorsCount: 4,
        usAccreditedInvestorsCount: 1,
        jpTotalInvestorsCount: 0
      };

      await setCounters(txCounters, complianceService);

      const burnValue = 500;
      const txBurnCounters = {
        totalInvestorsCount: 1,
        accreditedInvestorsCount: 1,
        usTotalInvestorsCount: 0,
        usAccreditedInvestorsCount: 0,
        jpTotalInvestorsCount: 0
      };

      await omnibusTBEController.bulkIssuance(
        value,
        await time.latest(),
        txCounters.totalInvestorsCount,
        txCounters.accreditedInvestorsCount,
        txCounters.usAccreditedInvestorsCount,
        txCounters.usTotalInvestorsCount,
        txCounters.jpTotalInvestorsCount,
        [],
        []
      );

      await assertCounters(complianceService);

      await expect(omnibusTBEController.bulkBurn(
        burnValue,
        txBurnCounters.totalInvestorsCount,
        txBurnCounters.accreditedInvestorsCount,
        txBurnCounters.usAccreditedInvestorsCount,
        txBurnCounters.usTotalInvestorsCount,
        txBurnCounters.jpTotalInvestorsCount,
        [],
        []
      )).to.emit(dsToken, 'OmnibusTBEOperation').withArgs(TBE, 1, 1, 0, 0, 0);

      expect(await dsToken.balanceOf(TBE)).to.equal(500);
    });

    it('Should bulk burn tokens correctly from multiple partitions', async function() {
      const {
        omnibusTBEController,
        complianceService,
        complianceConfigurationService,
        dsToken
      } = await loadFixture(deployDSTokenPartitioned);

      await complianceService.setTotalInvestorsCount(1);
      await complianceConfigurationService.setNonAccreditedInvestorsLimit(1);
      const txCounters = {
        totalInvestorsCount: 5,
        accreditedInvestorsCount: 5,
        usTotalInvestorsCount: 4,
        usAccreditedInvestorsCount: 1,
        jpTotalInvestorsCount: 0
      };

      await setCounters(txCounters, complianceService);

      const txBurnCounters = {
        totalInvestorsCount: 1,
        accreditedInvestorsCount: 1,
        usTotalInvestorsCount: 0,
        usAccreditedInvestorsCount: 0,
        jpTotalInvestorsCount: 0
      };

      const issuanceTime = await time.latest();

      await omnibusTBEController.bulkIssuance(
        100,
        issuanceTime + 1,
        txCounters.totalInvestorsCount,
        txCounters.accreditedInvestorsCount,
        txCounters.usAccreditedInvestorsCount,
        txCounters.usTotalInvestorsCount,
        txCounters.jpTotalInvestorsCount,
        [],
        []
      );

      await omnibusTBEController.bulkIssuance(
        200,
        issuanceTime + 2,
        txCounters.totalInvestorsCount,
        txCounters.accreditedInvestorsCount,
        txCounters.usAccreditedInvestorsCount,
        txCounters.usTotalInvestorsCount,
        txCounters.jpTotalInvestorsCount,
        [],
        []
      );

      await omnibusTBEController.bulkIssuance(
        300,
        issuanceTime + 3,
        txCounters.totalInvestorsCount,
        txCounters.accreditedInvestorsCount,
        txCounters.usAccreditedInvestorsCount,
        txCounters.usTotalInvestorsCount,
        txCounters.jpTotalInvestorsCount,
        [],
        []
      );

      expect(await dsToken.balanceOf(TBE)).to.equal(600);
      expect(await dsToken.partitionCountOf(TBE)).to.equal(3);

      const part1 = await dsToken.partitionOf(TBE, 0);
      const part2 = await dsToken.partitionOf(TBE, 1);
      const part3 = await dsToken.partitionOf(TBE, 2);

      expect(await dsToken.balanceOfByPartition(TBE, part1)).to.equal(100);
      expect(await dsToken.balanceOfByPartition(TBE, part2)).to.equal(200);
      expect(await dsToken.balanceOfByPartition(TBE, part3)).to.equal(300);

      await omnibusTBEController.bulkBurn(
        150,
        txBurnCounters.totalInvestorsCount,
        txBurnCounters.accreditedInvestorsCount,
        txBurnCounters.usAccreditedInvestorsCount,
        txBurnCounters.usTotalInvestorsCount,
        txBurnCounters.jpTotalInvestorsCount,
        [],
        []
      );

      expect(await dsToken.partitionCountOf(TBE)).to.equal(2);

      await omnibusTBEController.bulkBurn(
        450,
        txBurnCounters.totalInvestorsCount,
        txBurnCounters.accreditedInvestorsCount,
        txBurnCounters.usAccreditedInvestorsCount,
        txBurnCounters.usTotalInvestorsCount,
        txBurnCounters.jpTotalInvestorsCount,
        [],
        []
      );

      expect(await dsToken.balanceOf(TBE)).to.equal(0);
    });

    it('Should fail to burn tokens if there are not enough of them in partitions', async function() {
      const {
        omnibusTBEController,
        complianceService,
        complianceConfigurationService,
        dsToken
      } = await loadFixture(deployDSTokenPartitioned);

      await complianceService.setTotalInvestorsCount(1);
      await complianceConfigurationService.setNonAccreditedInvestorsLimit(1);
      const txCounters = {
        totalInvestorsCount: 5,
        accreditedInvestorsCount: 5,
        usTotalInvestorsCount: 4,
        usAccreditedInvestorsCount: 1,
        jpTotalInvestorsCount: 0
      };

      await setCounters(txCounters, complianceService);

      const txBurnCounters = {
        totalInvestorsCount: 1,
        accreditedInvestorsCount: 1,
        usTotalInvestorsCount: 0,
        usAccreditedInvestorsCount: 0,
        jpTotalInvestorsCount: 0
      };

      const issuanceTime = await time.latest();

      await omnibusTBEController.bulkIssuance(
        100,
        issuanceTime + 1,
        txCounters.totalInvestorsCount,
        txCounters.accreditedInvestorsCount,
        txCounters.usAccreditedInvestorsCount,
        txCounters.usTotalInvestorsCount,
        txCounters.jpTotalInvestorsCount,
        [],
        []
      );

      await omnibusTBEController.bulkIssuance(
        200,
        issuanceTime + 2,
        txCounters.totalInvestorsCount,
        txCounters.accreditedInvestorsCount,
        txCounters.usAccreditedInvestorsCount,
        txCounters.usTotalInvestorsCount,
        txCounters.jpTotalInvestorsCount,
        [],
        []
      );

      await omnibusTBEController.bulkIssuance(
        300,
        issuanceTime + 3,
        txCounters.totalInvestorsCount,
        txCounters.accreditedInvestorsCount,
        txCounters.usAccreditedInvestorsCount,
        txCounters.usTotalInvestorsCount,
        txCounters.jpTotalInvestorsCount,
        [],
        []
      );

      expect(await dsToken.balanceOf(TBE)).to.equal(600);
      expect(await dsToken.partitionCountOf(TBE)).to.equal(3);

      const part1 = await dsToken.partitionOf(TBE, 0);
      const part2 = await dsToken.partitionOf(TBE, 1);
      const part3 = await dsToken.partitionOf(TBE, 2);

      expect(await dsToken.balanceOfByPartition(TBE, part1)).to.equal(100);
      expect(await dsToken.balanceOfByPartition(TBE, part2)).to.equal(200);
      expect(await dsToken.balanceOfByPartition(TBE, part3)).to.equal(300);

      await expect(omnibusTBEController.bulkBurn(
        800,
        txBurnCounters.totalInvestorsCount,
        txBurnCounters.accreditedInvestorsCount,
        txBurnCounters.usAccreditedInvestorsCount,
        txBurnCounters.usTotalInvestorsCount,
        txBurnCounters.jpTotalInvestorsCount,
        [],
        []
      )).revertedWith('Not enough tokens in partitions to burn the required value');

      expect(await dsToken.partitionCountOf(TBE)).to.equal(3);
    });

    it('Should burn tokens from first partition if enough tokens present', async function() {
      const {
        omnibusTBEController,
        complianceService,
        complianceConfigurationService,
        dsToken
      } = await loadFixture(deployDSTokenPartitioned);

      await complianceService.setTotalInvestorsCount(1);
      await complianceConfigurationService.setNonAccreditedInvestorsLimit(1);
      const txCounters = {
        totalInvestorsCount: 5,
        accreditedInvestorsCount: 5,
        usTotalInvestorsCount: 4,
        usAccreditedInvestorsCount: 1,
        jpTotalInvestorsCount: 0
      };

      await setCounters(txCounters, complianceService);

      const txBurnCounters = {
        totalInvestorsCount: 1,
        accreditedInvestorsCount: 1,
        usTotalInvestorsCount: 0,
        usAccreditedInvestorsCount: 0,
        jpTotalInvestorsCount: 0
      };

      const issuanceTime = await time.latest();

      await omnibusTBEController.bulkIssuance(
        100,
        issuanceTime + 1,
        txCounters.totalInvestorsCount,
        txCounters.accreditedInvestorsCount,
        txCounters.usAccreditedInvestorsCount,
        txCounters.usTotalInvestorsCount,
        txCounters.jpTotalInvestorsCount,
        [],
        []
      );

      await omnibusTBEController.bulkIssuance(
        200,
        issuanceTime + 2,
        txCounters.totalInvestorsCount,
        txCounters.accreditedInvestorsCount,
        txCounters.usAccreditedInvestorsCount,
        txCounters.usTotalInvestorsCount,
        txCounters.jpTotalInvestorsCount,
        [],
        []
      );

      await omnibusTBEController.bulkIssuance(
        300,
        issuanceTime + 3,
        txCounters.totalInvestorsCount,
        txCounters.accreditedInvestorsCount,
        txCounters.usAccreditedInvestorsCount,
        txCounters.usTotalInvestorsCount,
        txCounters.jpTotalInvestorsCount,
        [],
        []
      );

      expect(await dsToken.balanceOf(TBE)).to.equal(600);
      expect(await dsToken.partitionCountOf(TBE)).to.equal(3);

      const part1 = await dsToken.partitionOf(TBE, 0);
      const part2 = await dsToken.partitionOf(TBE, 1);
      const part3 = await dsToken.partitionOf(TBE, 2);

      expect(await dsToken.balanceOfByPartition(TBE, part1)).to.equal(100);
      expect(await dsToken.balanceOfByPartition(TBE, part2)).to.equal(200);
      expect(await dsToken.balanceOfByPartition(TBE, part3)).to.equal(300);

      await omnibusTBEController.bulkBurn(
        50,
        txBurnCounters.totalInvestorsCount,
        txBurnCounters.accreditedInvestorsCount,
        txBurnCounters.usAccreditedInvestorsCount,
        txBurnCounters.usTotalInvestorsCount,
        txBurnCounters.jpTotalInvestorsCount,
        [],
        []
      );

      expect(await dsToken.partitionCountOf(TBE)).to.equal(3);

      await omnibusTBEController.bulkBurn(
        550,
        txBurnCounters.totalInvestorsCount,
        txBurnCounters.accreditedInvestorsCount,
        txBurnCounters.usAccreditedInvestorsCount,
        txBurnCounters.usTotalInvestorsCount,
        txBurnCounters.jpTotalInvestorsCount,
        [],
        []
      );

      expect(await dsToken.balanceOf(TBE)).to.equal(0);
    });
  });

  describe('Bulk transfer', function() {
    it('Should bulk transfer tokens from omnibus to wallet correctly', async function() {
      const [investor1, investor2] = await hre.ethers.getSigners();
      const {
        omnibusTBEController,
        complianceService,
        dsToken,
        registryService
      } = await loadFixture(deployDSTokenPartitioned);

      await registryService.registerInvestor(
        INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
        INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1
      );
      await registryService.addWallet(
        investor1,
        INVESTORS.INVESTOR_ID.INVESTOR_ID_1
      );
      await registryService.registerInvestor(
        INVESTORS.INVESTOR_ID.INVESTOR_ID_2,
        INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_2
      );
      await registryService.addWallet(
        investor2,
        INVESTORS.INVESTOR_ID.INVESTOR_ID_2
      );

      const value = 1000;
      const tokenValues = ['500', '500'];
      const investorWallets = [investor1, investor2];
      const txCounters = {
        totalInvestorsCount: 5,
        accreditedInvestorsCount: 5,
        usTotalInvestorsCount: 4,
        usAccreditedInvestorsCount: 1,
        jpTotalInvestorsCount: 0
      };
      const euRetailCountries = [hre.ethers.zeroPadBytes(hre.ethers.toUtf8Bytes('EU'), 32)];
      const euRetailCountryCounts = ['2'];

      await setCounters(txCounters, complianceService);

      await omnibusTBEController.bulkIssuance(
        value,
        await time.latest(),
        txCounters.totalInvestorsCount,
        txCounters.accreditedInvestorsCount,
        txCounters.usAccreditedInvestorsCount,
        txCounters.usTotalInvestorsCount,
        txCounters.jpTotalInvestorsCount,
        euRetailCountries,
        euRetailCountryCounts
      );

      await omnibusTBEController.bulkTransfer(investorWallets, tokenValues);
      await assertCounters(complianceService);
      expect(await dsToken.balanceOf(TBE)).to.equal(0);
      expect(await dsToken.balanceOf(investor1)).to.equal(500);
      expect(await dsToken.balanceOf(investor2)).to.equal(500);
    });
  });
});
