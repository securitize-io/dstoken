import hre from 'hardhat';
import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { deployDSTokenRegulated, INVESTORS, TBE } from './utils/fixture';
import { assertCounters, getCountersDelta, setCounters } from './utils/test-helper';
import { expect } from 'chai';

describe('Omnibus TBE Controller Unit Tests', function() {
  describe('Creation', function() {
    it('Should fail when trying to initialize twice', async function() {
      const { omnibusTBEController } = await loadFixture(deployDSTokenRegulated);
      await expect(omnibusTBEController.initialize(TBE, false)).revertedWithCustomError(omnibusTBEController, 'InvalidInitialization');
    });

    it('Should get version correctly', async function() {
      const { omnibusTBEController } = await loadFixture(deployDSTokenRegulated);
      expect( await omnibusTBEController.getInitializedVersion()).to.equal(1);
    });

    it('Should get implementation address correctly', async function() {
      const { omnibusTBEController } = await loadFixture(deployDSTokenRegulated);
      expect( await omnibusTBEController.getImplementationAddress()).to.be.exist;
    });
  });

  describe('Bulk issuance', function() {
    it('Should bulk issue tokens correctly', async function() {
      const {
        omnibusTBEController,
        complianceService,
        complianceConfigurationService,
        dsToken
      } = await loadFixture(deployDSTokenRegulated);

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
      } = await loadFixture(deployDSTokenRegulated);

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
      } = await loadFixture(deployDSTokenRegulated);

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
      } = await loadFixture(deployDSTokenRegulated);

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
    it('Should bulk burn tokens correctly without decrement counters', async function() {
      const {
        omnibusTBEController,
        complianceService,
        complianceConfigurationService,
        dsToken
      } = await loadFixture(deployDSTokenRegulated);

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
  });

  describe('Bulk transfer', function() {
    it('Should bulk transfer tokens from omnibus to wallet correctly', async function() {
      const [investor1, investor2] = await hre.ethers.getSigners();
      const {
        omnibusTBEController,
        complianceService,
        dsToken,
        registryService
      } = await loadFixture(deployDSTokenRegulated);

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

    it('Should not bulk transfer tokens from omnibus to wallet if omnibus has no balance', async function() {
      const [investor1, investor2] = await hre.ethers.getSigners();
      const tokenValues = ['500', '500'];
      const investorWallets = [investor1, investor2];
      const { omnibusTBEController, dsToken } = await loadFixture(deployDSTokenRegulated);

      expect(await dsToken.balanceOf(TBE)).to.equal(0);
      await expect(omnibusTBEController.bulkTransfer(investorWallets, tokenValues)).to.revertedWith('Not enough tokens');
    });

    it('Should not bulk transfer tokens if token value array length does not match wallet array length', async function() {
      const [investor1, investor2] = await hre.ethers.getSigners();
      const tokenValues = ['500', '500', '500'];
      const investorWallets = [investor1, investor2];
      const { omnibusTBEController, dsToken } = await loadFixture(deployDSTokenRegulated);

      expect(await dsToken.balanceOf(TBE)).to.equal(0);
      await expect(omnibusTBEController.bulkTransfer(investorWallets, tokenValues)).to.revertedWith('Wallets and values lengths do not match');
    });

    it('should bulk transfer tokens without removing counters (not anymore because of partial transfers)', async function() {
      const [investor1] = await hre.ethers.getSigners();
      const {
        omnibusTBEController,
        complianceService,
        dsToken,
        registryService
      } = await loadFixture(deployDSTokenRegulated);

      await registryService.registerInvestor(
        INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
        INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1
      );
      await registryService.addWallet(
        investor1,
        INVESTORS.INVESTOR_ID.INVESTOR_ID_1
      );

      await dsToken.issueTokens(investor1, 200);

      const value = 1000;
      const tokenValues = ['500'];
      const investorWallets = [investor1];
      const txCounters = {
        totalInvestorsCount: 5,
        accreditedInvestorsCount: 5,
        usTotalInvestorsCount: 4,
        usAccreditedInvestorsCount: 1,
        jpTotalInvestorsCount: 0
      };

      // It does not create a delta anymore because of partial issuances and transfers
      const txDeltaCounters = {
        totalInvestorsCount: 0,
        accreditedInvestorsCount: 0,
        usTotalInvestorsCount: 0,
        usAccreditedInvestorsCount: 0,
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

      await getCountersDelta(txDeltaCounters);
      await assertCounters(complianceService);
      expect(await dsToken.balanceOf(TBE)).to.equal(500);
      expect(await dsToken.balanceOf(investor1)).to.equal(700);
    });
  });

  describe('Internal TBE Transfer', function() {
    it('Should correctly reflect an internal TBE transfer', async function() {
      const {
        omnibusTBEController,
        complianceService,
        dsToken
      } = await loadFixture(deployDSTokenRegulated);

      const value = 1000;
      const txCounters = {
        totalInvestorsCount: 2,
        accreditedInvestorsCount: 2,
        usTotalInvestorsCount: 1,
        usAccreditedInvestorsCount: 1,
        jpTotalInvestorsCount: 0
      };

      const negativeCounters = {
        totalInvestorsCount: -1,
        accreditedInvestorsCount: -1,
        usTotalInvestorsCount: -1,
        usAccreditedInvestorsCount: -1,
        jpTotalInvestorsCount: 0
      };

      await setCounters(txCounters, complianceService);

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
      )).to.emit(dsToken, 'OmnibusTBEOperation').withArgs(TBE, 2, 2, 1, 1, 0);

      await expect(omnibusTBEController.internalTBETransfer(
        'this_is_externalID',
        negativeCounters.totalInvestorsCount,
        negativeCounters.accreditedInvestorsCount,
        negativeCounters.usAccreditedInvestorsCount,
        negativeCounters.usTotalInvestorsCount,
        negativeCounters.jpTotalInvestorsCount,
        [],
        []
      )).to.emit(dsToken, 'OmnibusTBETransfer').withArgs(TBE, 'this_is_externalID');

      await assertCounters(complianceService);
    });
  });
});
