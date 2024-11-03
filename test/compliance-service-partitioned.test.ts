import hre from 'hardhat';
import { expect } from 'chai';
import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { deployDSTokenPartitioned, INVESTORS } from './utils/fixture';
import { registerInvestor } from './utils/test-helper';
import { DSConstants } from '../utils/globals';

describe('Compliance Service Partitioned Unit Tests', function() {
  describe('Creation', function() {
    it('Should fail when trying to initialize twice', async function() {
      const { complianceService } = await loadFixture(deployDSTokenPartitioned);
      await expect(complianceService.initialize()).revertedWithCustomError(complianceService, 'InvalidInitialization');
    });

    it('Should get version correctly', async function() {
      const { complianceService } = await loadFixture(deployDSTokenPartitioned);
      expect( await complianceService.getInitializedVersion()).to.equal(1);
    });

    it('Should get implementation address correctly', async function() {
      const { complianceService } = await loadFixture(deployDSTokenPartitioned);
      expect( await complianceService.getImplementationAddress()).to.be.exist;
    });
  });

  describe('Pre transfer check', function() {
    it('Pre transfer check with paused', async function() {
      const [wallet, wallet2] = await hre.ethers.getSigners();
      const { dsToken, registryService, complianceService } = await loadFixture(deployDSTokenPartitioned);

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, wallet, registryService);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, wallet2, registryService);

      await dsToken.setCap(1000);
      await dsToken.issueTokens(wallet, 100);
      await dsToken.pause();

      const res = await complianceService.preTransferCheck(wallet, wallet2, 10);
      expect(res[0]).equal(10);
      expect(res[1]).equal('Token paused');
    });

    it('Pre transfer check with not enough tokens', async function() {
      const [wallet, wallet2] = await hre.ethers.getSigners();
      const { registryService, complianceService } = await loadFixture(deployDSTokenPartitioned);

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, wallet, registryService);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, wallet2, registryService);

      const res = await complianceService.preTransferCheck(wallet, wallet2, 10);
      expect(res[0]).equal(15);
      expect(res[1]).equal('Not enough tokens');
    });

    it('Pre transfer check when transfer to platform special wallet', async function() {
      const [wallet, wallet2] = await hre.ethers.getSigners();
      const { registryService, complianceService, walletManager, dsToken } = await loadFixture(deployDSTokenPartitioned);

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, wallet, registryService);
      await walletManager.addIssuerWallet(wallet2);

      await dsToken.setCap(1000);
      await dsToken.issueTokens(wallet, 100);

      const res = await complianceService.preTransferCheck(wallet, wallet2, 10);
      expect(res[0]).equal(20);
      expect(res[1]).equal('Wallet not in registry service');
    });

    it('Pre transfer check with tokens locked', async function() {
      const [wallet, wallet2] = await hre.ethers.getSigners();
      const { registryService, complianceService, dsToken, lockManager } = await loadFixture(deployDSTokenPartitioned);

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, wallet, registryService);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, wallet2, registryService);

      await dsToken.setCap(1000);
      await dsToken.issueTokens(wallet, 100);

      const partition = await dsToken.partitionOf(wallet, 0);
      await lockManager['addManualLockRecord(address,uint256,string,uint256,bytes32)'](wallet, 95, '', await time.latest() + 1000, partition);

      const res = await complianceService.preTransferCheck(wallet, wallet2, 10);
      expect(res[0]).equal(16);
      expect(res[1]).equal('Tokens locked');
    });

    it('Pre transfer check with tokens locked for 1 year (For Us investors)', async function() {
      const [wallet, wallet2] = await hre.ethers.getSigners();
      const {
        dsToken,
        registryService,
        complianceConfigurationService,
        complianceService
      } = await loadFixture(deployDSTokenPartitioned);

      await complianceConfigurationService.setAll(
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 150, INVESTORS.Time.YEARS, 0, 0],
        [true, false, false, false, false]
      );

      await complianceConfigurationService.setCountryCompliance(INVESTORS.Country.USA, INVESTORS.Compliance.US);

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, wallet, registryService);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, wallet2, registryService);

      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, INVESTORS.Country.USA);

      await dsToken.setCap(1000);
      await dsToken.issueTokens(wallet, 100);

      const res = await complianceService.preTransferCheck(wallet, wallet2, 10);
      expect(res[0]).equal(32);
      expect(res[1]).equal('Under lock-up');
    });

    it('Pre transfer check with force accredited', async function() {
      const [wallet, wallet2] = await hre.ethers.getSigners();
      const {
        dsToken,
        registryService,
        complianceConfigurationService,
        complianceService
      } = await loadFixture(deployDSTokenPartitioned);

      await complianceConfigurationService.setAll(
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 150, INVESTORS.Time.YEARS, 0, 0],
        [true, false, false, false, false]
      );

      await complianceConfigurationService.setCountryCompliance(INVESTORS.Country.USA, INVESTORS.Compliance.US);
      await complianceConfigurationService.setCountryCompliance(INVESTORS.Country.FRANCE, INVESTORS.Compliance.EU);

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, wallet, registryService);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, wallet2, registryService);

      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, INVESTORS.Country.FRANCE);

      await dsToken.setCap(1000);
      await dsToken.issueTokens(wallet2, 100);

      await complianceConfigurationService.setBlockFlowbackEndTime(1);
      await complianceConfigurationService.setForceAccredited(true);

      const res = await complianceService.preTransferCheck(wallet2, wallet, 10);
      expect(res[0]).equal(61);
      expect(res[1]).equal('Only accredited');
    });

    it('Pre transfer check with US force accredited', async function() {
      const [wallet, wallet2] = await hre.ethers.getSigners();
      const {
        dsToken,
        registryService,
        complianceConfigurationService,
        complianceService
      } = await loadFixture(deployDSTokenPartitioned);

      await complianceConfigurationService.setAll(
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 150, INVESTORS.Time.YEARS, 0, 0],
        [true, false, false, false, false]
      );

      await complianceConfigurationService.setCountryCompliance(INVESTORS.Country.USA, INVESTORS.Compliance.US);
      await complianceConfigurationService.setCountryCompliance(INVESTORS.Country.FRANCE, INVESTORS.Compliance.EU);

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, wallet, registryService);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, wallet2, registryService);

      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, INVESTORS.Country.FRANCE);

      await dsToken.setCap(1000);
      await dsToken.issueTokens(wallet2, 100);

      await complianceConfigurationService.setBlockFlowbackEndTime(1);
      await complianceConfigurationService.setForceAccreditedUS(true);

      const res = await complianceService.preTransferCheck(wallet2, wallet, 10);
      expect(res[0]).equal(62);
      expect(res[1]).equal('Only us accredited');
    });

    it('Pre transfer check for full transfer - should return code 50', async function () {
      const [wallet, wallet2] = await hre.ethers.getSigners();
      const { dsToken, registryService, complianceConfigurationService, complianceService } = await loadFixture(deployDSTokenPartitioned);

      await complianceConfigurationService.setAll(
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 150, INVESTORS.Time.YEARS, 0, 0],
        [true, false, false, false, false]
      );

      await complianceConfigurationService.setCountryCompliance(INVESTORS.Country.USA, INVESTORS.Compliance.US);

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, wallet, registryService);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, wallet2, registryService);

      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, INVESTORS.Country.USA);

      await dsToken.setCap(1000);
      await dsToken.issueTokens(wallet, 100);
      await time.increase(370 * INVESTORS.Time.DAYS);

      const res = await complianceService.preTransferCheck(wallet, wallet2, 10);
      expect(res[0]).equal(50);
      expect(res[1]).equal('Only full transfer');
    });

    it('Pre transfer check with world wide force full transfer', async function () {
      const [wallet, wallet2] = await hre.ethers.getSigners();
      const { dsToken, registryService, complianceConfigurationService, complianceService } = await loadFixture(deployDSTokenPartitioned);

      await complianceConfigurationService.setAll(
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 150, INVESTORS.Time.YEARS, 0, 0],
        [true, false, false, false, false]
      );

      await complianceConfigurationService.setCountryCompliance(INVESTORS.Country.FRANCE, INVESTORS.Compliance.EU);
      await complianceConfigurationService.setCountryCompliance(INVESTORS.Country.GERMANY, INVESTORS.Compliance.EU);

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, wallet, registryService);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, wallet2, registryService);

      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.GERMANY);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, INVESTORS.Country.FRANCE);

      await dsToken.setCap(1000);
      await dsToken.issueTokens(wallet, 100);
      await time.increase(370 * INVESTORS.Time.DAYS);
      await complianceConfigurationService.setForceFullTransfer(false);
      await complianceConfigurationService.setWorldWideForceFullTransfer(true);

      const res = await complianceService.preTransferCheck(wallet, wallet2, 100);
      expect(res[0]).equal(0);
      expect(res[1]).equal('Valid');
    });

    it('Pre transfer check from nonUs investor to US - should return code 25', async function () {
      const [wallet, wallet2] = await hre.ethers.getSigners();
      const { dsToken, registryService, complianceConfigurationService, complianceService } = await loadFixture(deployDSTokenPartitioned);

      await complianceConfigurationService.setAll(
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 150, INVESTORS.Time.YEARS, 0, 0],
        [true, false, false, false, false]
      );

      await complianceConfigurationService.setCountryCompliance(INVESTORS.Country.USA, INVESTORS.Compliance.US);
      await complianceConfigurationService.setCountryCompliance(INVESTORS.Country.FRANCE, INVESTORS.Compliance.EU);
      await complianceConfigurationService.setBlockFlowbackEndTime(200);

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, wallet, registryService);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, wallet2, registryService);

      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.FRANCE);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, INVESTORS.Country.USA);

      await dsToken.setCap(1000);
      await dsToken.issueTokens(wallet, 100);

      const res = await complianceService.preTransferCheck(wallet, wallet2, 10);
      expect(res[0]).equal(25);
      expect(res[1]).equal('Flowback');
    });

    it('should not transfer tokens to an investor if japan investor limit is reached', async function () {
      const [wallet, wallet2] = await hre.ethers.getSigners();
      const { dsToken, registryService, complianceConfigurationService, complianceService } = await loadFixture(deployDSTokenPartitioned);

      await complianceConfigurationService.setAll(
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 150, INVESTORS.Time.YEARS, 1, 0],
        [true, false, false, false, false]
      );

      await complianceConfigurationService.setCountryCompliance(INVESTORS.Country.JAPAN, INVESTORS.Compliance.JP);

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, wallet, registryService);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, wallet2, registryService);

      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.JAPAN);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, INVESTORS.Country.JAPAN);

      await dsToken.setCap(1000);
      await dsToken.issueTokens(wallet, 100);

      const res = await complianceService.preTransferCheck(wallet, wallet2, 10);
      expect(res[0]).equal(40);
      expect(res[1]).equal('Max investors in category');
    });

    it('should NOT allow a partial transfer when below minimumHoldingsPerInvestor rule set', async function () {
      const [wallet, wallet2] = await hre.ethers.getSigners();
      const { dsToken, registryService, complianceConfigurationService, complianceService } = await loadFixture(deployDSTokenPartitioned);

      await complianceConfigurationService.setAll(
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 150, INVESTORS.Time.YEARS, 1, 0],
        [true, false, false, false, false]
      );

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, wallet, registryService);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, wallet2, registryService);

      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.JAPAN);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, INVESTORS.Country.JAPAN);

      await complianceConfigurationService.setMinimumHoldingsPerInvestor(50);

      await dsToken.setCap(1000);
      await dsToken.issueTokens(wallet, 100);

      const res = await complianceService.preTransferCheck(wallet, wallet2, 99);
      expect(res[0]).equal(51);
      expect(res[1]).equal('Amount of tokens under min');
    });
  });

  describe('Check whitelisted', function () {
    it('should be false when address is issuer', async function () {
      const [owner, issuer] = await hre.ethers.getSigners();
      const { trustService, complianceService } = await loadFixture(deployDSTokenPartitioned);
      await trustService.setRole(issuer, DSConstants.roles.ISSUER);
      expect(await complianceService.checkWhitelisted(issuer)).equal(false);
    });

    it('should be false when address is exchange', async function () {
      const [owner, exchange] = await hre.ethers.getSigners();
      const { trustService, complianceService } = await loadFixture(deployDSTokenPartitioned);
      await trustService.setRole(exchange, DSConstants.roles.EXCHANGE);
      expect(await complianceService.checkWhitelisted(exchange)).equal(false);
    });

    it('should be true when address is investor', async function () {
      const [owner, investor] = await hre.ethers.getSigners();
      const { registryService, complianceService } = await loadFixture(deployDSTokenPartitioned);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      expect(await complianceService.checkWhitelisted(investor)).equal(true);
    });

    it('should be true when address is platform', async function () {
      const [owner, platform] = await hre.ethers.getSigners();
      const { walletManager, complianceService } = await loadFixture(deployDSTokenPartitioned);
      await walletManager.addPlatformWallet(platform)
      expect(await complianceService.checkWhitelisted(platform)).equal(true);
    });
  });
});
