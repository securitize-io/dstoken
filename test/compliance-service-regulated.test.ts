import hre from 'hardhat';
import { expect } from 'chai';
import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { deployDSTokenRegulated, INVESTORS } from './utils/fixture';
import { registerInvestor } from './utils/test-helper';
import { DSConstants } from '../utils/globals';

describe('Compliance Service Regulated Unit Tests', function() {

  describe('Validate issuance(recordIssuance):', function() {
    it('Should revert due to not token call', async function() {
      const [wallet] = await hre.ethers.getSigners();
      const { complianceService, dsToken } = await loadFixture(deployDSTokenRegulated);

      await dsToken.setCap(1000);
      await expect(complianceService.validateIssuance(wallet, 100, await time.latest())).revertedWith('This function can only called by the associated token');
    });

    it('Should issue tokens', async function() {
      const [wallet] = await hre.ethers.getSigners();
      const { dsToken, registryService } = await loadFixture(deployDSTokenRegulated);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, wallet, registryService);

      await dsToken.setCap(1000);
      await dsToken.issueTokens(wallet, 100);
      expect(await dsToken.balanceOf(wallet)).equal(100);
    });

    it('Should issue tokens even when the token is paused', async function() {
      const [wallet] = await hre.ethers.getSigners();
      const { dsToken, registryService } = await loadFixture(deployDSTokenRegulated);

      await dsToken.pause();
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, wallet, registryService);

      await dsToken.setCap(1000);
      await dsToken.issueTokens(wallet, 100);
      expect(await dsToken.balanceOf(wallet)).equal(100);
    });
  });

  describe('Validate(recordTransfer)', function() {
    it('Should revert due to Wallet Not In Registry Service when destination is special wallet', async function() {
      const [wallet, issuerWallet] = await hre.ethers.getSigners();
      const { dsToken, registryService, walletManager, trustService } = await loadFixture(deployDSTokenRegulated);

      await trustService.setRole(issuerWallet, DSConstants.roles.ISSUER);
      await walletManager.addIssuerWallet(issuerWallet);

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, wallet, registryService);
      await dsToken.setCap(1000);
      await dsToken.issueTokens(wallet, 100);
      await expect(dsToken.transfer(issuerWallet, 100)).revertedWith('Wallet not in registry service');
    });

    it('Should revert due to Wallet Not In Registry Service', async function() {
      const [wallet, wallet2] = await hre.ethers.getSigners();
      const { dsToken, registryService } = await loadFixture(deployDSTokenRegulated);

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, wallet, registryService);
      await dsToken.setCap(1000);
      await dsToken.issueTokens(wallet, 100);
      await expect(dsToken.transfer(wallet2, 100)).revertedWith('Wallet not in registry service');
    });

    it('Should revert due to Wallet has not enough tokens', async function() {
      const [wallet, wallet2] = await hre.ethers.getSigners();
      const { dsToken, registryService } = await loadFixture(deployDSTokenRegulated);

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, wallet, registryService);
      await dsToken.setCap(1000);
      await expect(dsToken.transfer(wallet2, 100)).revertedWith('Not enough tokens');
    });

    it('Pre transfer check with tokens locked', async function() {
      const [wallet, wallet2] = await hre.ethers.getSigners();
      const { dsToken, registryService, lockManager } = await loadFixture(deployDSTokenRegulated);

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, wallet, registryService);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, wallet2, registryService);

      await dsToken.setCap(1000);
      await dsToken.issueTokens(wallet, 100);

      await lockManager.addManualLockRecord(wallet, 95, '', await time.latest() + 1000);
      await expect(dsToken.transfer(wallet2, 100)).revertedWith('Tokens locked');
    });

    it('Should NOT decrease total investors value when transfer tokens', async function() {
      const [wallet, wallet2] = await hre.ethers.getSigners();
      const { dsToken, registryService, complianceService } = await loadFixture(deployDSTokenRegulated);
      expect(await complianceService.getTotalInvestorsCount()).equal(0);

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, wallet, registryService);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, wallet2, registryService);

      await dsToken.setCap(1000);
      await dsToken.issueTokens(wallet, 100);
      await dsToken.issueTokens(wallet2, 100);

      expect(await complianceService.getTotalInvestorsCount()).equal(2);
      await dsToken.transfer(wallet2, 100);
      expect(await complianceService.getTotalInvestorsCount()).equal(2);
    });

    it('Should increase total investors value when transfer tokens', async function() {
      const [wallet, wallet2] = await hre.ethers.getSigners();
      const { dsToken, registryService, complianceService } = await loadFixture(deployDSTokenRegulated);
      expect(await complianceService.getTotalInvestorsCount()).equal(0);

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, wallet, registryService);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, wallet2, registryService);

      await dsToken.setCap(1000);
      await dsToken.issueTokens(wallet, 100);

      expect(await complianceService.getTotalInvestorsCount()).equal(1);
      await dsToken.transfer(wallet2, 100);
      expect(await complianceService.getTotalInvestorsCount()).equal(2);
    });

    it('Should not be able to transfer tokens because of 1 year lock for US investors', async function() {
      const [wallet, wallet2] = await hre.ethers.getSigners();
      const { dsToken, registryService, complianceConfigurationService } = await loadFixture(deployDSTokenRegulated);

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
      const tokenFromInvestor = await dsToken.connect(wallet);
      await expect(tokenFromInvestor.transfer(wallet2, 100)).revertedWith('Under lock-up');
    });

    it('Should not be able to transfer tokens due to full transfer enabled', async function() {
      const [wallet, wallet2] = await hre.ethers.getSigners();
      const { dsToken, registryService, complianceConfigurationService } = await loadFixture(deployDSTokenRegulated);

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
      const tokenFromInvestor = await dsToken.connect(wallet);
      await time.increase(370 * INVESTORS.Time.DAYS);
      await expect(tokenFromInvestor.transfer(wallet2, 50)).revertedWith('Only full transfer');
    });

    it('Should be able to transfer tokens before 1 year to platform account', async function() {
      const [wallet, wallet2] = await hre.ethers.getSigners();
      const {
        dsToken,
        registryService,
        complianceConfigurationService,
        walletManager
      } = await loadFixture(deployDSTokenRegulated);

      await walletManager.addPlatformWallet(wallet2);

      await complianceConfigurationService.setAll(
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 150, INVESTORS.Time.YEARS, 0, 0],
        [true, false, false, false, false]
      );

      await complianceConfigurationService.setCountryCompliance(INVESTORS.Country.USA, INVESTORS.Compliance.US);

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, wallet, registryService);

      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);

      await dsToken.setCap(1000);
      await dsToken.issueTokens(wallet, 100);
      const tokenFromInvestor = await dsToken.connect(wallet);
      await tokenFromInvestor.transfer(wallet2, 100);
      expect(await dsToken.balanceOf(wallet)).equal(0);
      expect(await dsToken.balanceOf(wallet2)).equal(100);
    });

    it('Should prevent chinese investors', async function() {
      const [wallet, wallet2] = await hre.ethers.getSigners();
      const { dsToken, registryService, complianceConfigurationService } = await loadFixture(deployDSTokenRegulated);

      await complianceConfigurationService.setCountryCompliance(INVESTORS.Country.CHINA, INVESTORS.Compliance.FORBIDDEN);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, wallet, registryService);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, wallet2, registryService);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, INVESTORS.Country.CHINA);

      await dsToken.setCap(1000);
      await dsToken.issueTokens(wallet, 100);
      await expect(dsToken.transfer(wallet2, 50)).revertedWith('Destination restricted');
    });
  });

  describe('Validate burn', function() {
    it('Should revert due to trying burn tokens for account with NONE permissions', async function() {
      const [owner, unauthorized] = await hre.ethers.getSigners();
      const { dsToken, registryService, complianceConfigurationService } = await loadFixture(deployDSTokenRegulated);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, owner, registryService);
      await dsToken.setCap(1000);
      await dsToken.issueTokens(owner, 100);

      const dsTokenFromUnauthorized = await dsToken.connect(unauthorized);
      await expect(dsTokenFromUnauthorized.burn(owner, 100, 'test')).revertedWith('Insufficient trust level');
    });

    it('Should not decrease total investors value when burn tokens', async function() {
      const [wallet] = await hre.ethers.getSigners();
      const { dsToken, registryService, complianceService } = await loadFixture(deployDSTokenRegulated);
      expect(await complianceService.getTotalInvestorsCount()).equal(0);

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, wallet, registryService);
      await dsToken.setCap(1000);
      await dsToken.issueTokens(wallet, 100);
      expect(await dsToken.balanceOf(wallet)).equal(100);
      expect(await complianceService.getTotalInvestorsCount()).equal(1);
      await dsToken.burn(wallet, 100, 'test');
      expect(await complianceService.getTotalInvestorsCount()).equal(1);
      expect(await dsToken.balanceOf(wallet)).equal(0);
    });
  });

  describe('Validate seize', function() {
    it('Should revert due to trying seize tokens for account with NONE permissions', async function() {
      const [owner, wallet, unauthorized] = await hre.ethers.getSigners();
      const { dsToken, registryService } = await loadFixture(deployDSTokenRegulated);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, owner, registryService);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, wallet, registryService);
      await dsToken.setCap(1000);
      await dsToken.issueTokens(owner, 100);

      const dsTokenFromUnauthorized = await dsToken.connect(unauthorized);
      await expect(dsTokenFromUnauthorized.seize(owner, wallet, 100, 'test')).revertedWith('Insufficient trust level');
    });

    it('Should not decrease total investors value when seizing tokens', async function() {
      const [wallet, wallet2] = await hre.ethers.getSigners();
      const { dsToken, registryService, complianceService, walletManager } = await loadFixture(deployDSTokenRegulated);
      expect(await complianceService.getTotalInvestorsCount()).equal(0);

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, wallet, registryService);
      await dsToken.setCap(1000);
      await dsToken.issueTokens(wallet, 100);
      expect(await dsToken.balanceOf(wallet)).equal(100);
      expect(await complianceService.getTotalInvestorsCount()).equal(1);

      await walletManager.addIssuerWallet(wallet2);
      await dsToken.seize(wallet, wallet2, 100, 'test');

      expect(await complianceService.getTotalInvestorsCount()).equal(1);
      expect(await dsToken.balanceOf(wallet)).equal(0);
    });
  });

  describe('Pre transfer check', function() {
    it('Pre transfer check with paused', async function() {
      const [wallet, wallet2] = await hre.ethers.getSigners();
      const { dsToken, registryService, complianceService } = await loadFixture(deployDSTokenRegulated);

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
      const { registryService, complianceService } = await loadFixture(deployDSTokenRegulated);

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, wallet, registryService);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, wallet2, registryService);

      const res = await complianceService.preTransferCheck(wallet, wallet2, 10);
      expect(res[0]).equal(15);
      expect(res[1]).equal('Not enough tokens');
    });

    it('Pre transfer check when transfer to platform special wallet', async function() {
      const [wallet, wallet2] = await hre.ethers.getSigners();
      const { registryService, complianceService, walletManager, dsToken } = await loadFixture(deployDSTokenRegulated);

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
      const { registryService, complianceService, dsToken, lockManager } = await loadFixture(deployDSTokenRegulated);

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, wallet, registryService);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, wallet2, registryService);

      await dsToken.setCap(1000);
      await dsToken.issueTokens(wallet, 100);

      await lockManager.addManualLockRecord(wallet, 95, '', await time.latest() + 1000);

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
      } = await loadFixture(deployDSTokenRegulated);

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
      } = await loadFixture(deployDSTokenRegulated);

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
      } = await loadFixture(deployDSTokenRegulated);

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
      const { dsToken, registryService, complianceConfigurationService, complianceService } = await loadFixture(deployDSTokenRegulated);

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
      const { dsToken, registryService, complianceConfigurationService, complianceService } = await loadFixture(deployDSTokenRegulated);

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
      const { dsToken, registryService, complianceConfigurationService, complianceService } = await loadFixture(deployDSTokenRegulated);

      await complianceConfigurationService.setAll(
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 150, INVESTORS.Time.YEARS, 0, 0],
        [true, false, false, false, false]
      );

      await complianceConfigurationService.setCountryCompliance(INVESTORS.Country.USA, INVESTORS.Compliance.US);
      await complianceConfigurationService.setCountryCompliance(INVESTORS.Country.FRANCE, INVESTORS.Compliance.EU);

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, wallet, registryService);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, wallet2, registryService);

      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.FRANCE);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, INVESTORS.Country.USA);

      await dsToken.setCap(1000);
      await dsToken.issueTokens(wallet, 100);

      const res = await complianceService.preTransferCheck(wallet, wallet2, 100);
      expect(res[0]).equal(25);
      expect(res[1]).equal('Flowback');
    });

    it('should not transfer tokens to an investor if japan investor limit is reached', async function () {
      const [wallet, wallet2] = await hre.ethers.getSigners();
      const { dsToken, registryService, complianceConfigurationService, complianceService } = await loadFixture(deployDSTokenRegulated);

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
      const { dsToken, registryService, complianceConfigurationService, complianceService } = await loadFixture(deployDSTokenRegulated);

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

  describe('Pre issuance check', function () {
    it('should not issue tokens below the minimum holdings per investor', async function () {
      const [wallet] = await hre.ethers.getSigners();
      const { dsToken, registryService, complianceConfigurationService } = await loadFixture(deployDSTokenRegulated);
      await complianceConfigurationService.setMinimumHoldingsPerInvestor(50);

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, wallet, registryService);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);

      await expect(dsToken.issueTokens(wallet, 10)).revertedWith('Amount of tokens under min');
    });

    it('should not issue tokens above the maximum holdings per investor', async function () {
      const [wallet] = await hre.ethers.getSigners();
      const { dsToken, registryService, complianceConfigurationService } = await loadFixture(deployDSTokenRegulated);
      await complianceConfigurationService.setMaximumHoldingsPerInvestor(300);

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, wallet, registryService);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);

      await expect(dsToken.issueTokens(wallet, 310)).revertedWith('Amount of tokens above max');
    });

    it('should not issue tokens to a new investor if investor limit is exceeded', async function () {
      const [wallet, wallet2] = await hre.ethers.getSigners();
      const { dsToken, registryService, complianceConfigurationService } = await loadFixture(deployDSTokenRegulated);
      await complianceConfigurationService.setTotalInvestorsLimit(1);

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, wallet, registryService);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, wallet2, registryService);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, INVESTORS.Country.USA);

      await dsToken.issueTokens(wallet, 100)
      await expect(dsToken.issueTokens(wallet2, 100)).revertedWith('Max investors in category');
    });

    it('should not issue tokens to a new investor if japan investor limit is exceeded', async function () {
      const [wallet, wallet2] = await hre.ethers.getSigners();
      const { dsToken, registryService, complianceConfigurationService } = await loadFixture(deployDSTokenRegulated);
      await complianceConfigurationService.setJPInvestorsLimit(1);
      await complianceConfigurationService.setCountryCompliance(INVESTORS.Country.JAPAN, INVESTORS.Compliance.JP);

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, wallet, registryService);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.JAPAN);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, wallet2, registryService);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, INVESTORS.Country.JAPAN);

      await dsToken.issueTokens(wallet, 100)
      await expect(dsToken.issueTokens(wallet2, 100)).revertedWith('Max investors in category');
    });

    it('should not issue tokens to a new investor if non accredited limit is exceeded', async function () {
      const [wallet, wallet2] = await hre.ethers.getSigners();
      const { dsToken, registryService, complianceConfigurationService } = await loadFixture(deployDSTokenRegulated);
      await complianceConfigurationService.setNonAccreditedInvestorsLimit(1);

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, wallet, registryService);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.FRANCE);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, wallet2, registryService);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, INVESTORS.Country.GERMANY);

      await dsToken.issueTokens(wallet, 100)
      await expect(dsToken.issueTokens(wallet2, 100)).revertedWith('Max investors in category');
    });

    it('should not issue tokens to a new investor if US investors limit is exceeded', async function () {
      const [wallet, wallet2] = await hre.ethers.getSigners();
      const { dsToken, registryService, complianceConfigurationService } = await loadFixture(deployDSTokenRegulated);
      await complianceConfigurationService.setUSInvestorsLimit(1);
      await complianceConfigurationService.setCountryCompliance(INVESTORS.Country.USA, INVESTORS.Compliance.US);

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, wallet, registryService);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, wallet2, registryService);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, INVESTORS.Country.USA);

      await dsToken.issueTokens(wallet, 100)
      await expect(dsToken.issueTokens(wallet2, 100)).revertedWith('Max investors in category');
    });

    it('should not issue tokens to a new investor if US Accredited investors limit is exceeded', async function () {
      const [wallet, wallet2] = await hre.ethers.getSigners();
      const { dsToken, registryService, complianceConfigurationService } = await loadFixture(deployDSTokenRegulated);
      await complianceConfigurationService.setUSAccreditedInvestorsLimit(1);
      await complianceConfigurationService.setCountryCompliance(INVESTORS.Country.USA, INVESTORS.Compliance.US);

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, wallet, registryService);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, wallet2, registryService);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, INVESTORS.Country.USA);

      await registryService.setAttribute(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, 2, 1, 0, 'abcde')
      await registryService.setAttribute(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, 2, 1, 0, 'abcde');

      await dsToken.issueTokens(wallet, 100)
      await expect(dsToken.issueTokens(wallet2, 100)).revertedWith('Max investors in category');
    });

    it('should not issue tokens to a new investor if EU Retail limit is exceeded', async function () {
      const [wallet, wallet2] = await hre.ethers.getSigners();
      const { dsToken, registryService, complianceConfigurationService } = await loadFixture(deployDSTokenRegulated);
      await complianceConfigurationService.setEURetailInvestorsLimit(1);
      await complianceConfigurationService.setCountryCompliance(INVESTORS.Country.FRANCE, INVESTORS.Compliance.EU);

      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, wallet, registryService);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.FRANCE);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, wallet2, registryService);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, INVESTORS.Country.FRANCE);

      await dsToken.issueTokens(wallet, 100)
      await expect(dsToken.issueTokens(wallet2, 100)).revertedWith('Max investors in category');
    });
  });

  describe('Check whitelisted', function () {
    it('should be false when address is issuer', async function () {
      const [owner, issuer] = await hre.ethers.getSigners();
      const { trustService, complianceService } = await loadFixture(deployDSTokenRegulated);
      await trustService.setRole(issuer, DSConstants.roles.ISSUER);
      expect(await complianceService.checkWhitelisted(issuer)).equal(false);
    });

    it('should be false when address is exchange', async function () {
      const [owner, exchange] = await hre.ethers.getSigners();
      const { trustService, complianceService } = await loadFixture(deployDSTokenRegulated);
      await trustService.setRole(exchange, DSConstants.roles.EXCHANGE);
      expect(await complianceService.checkWhitelisted(exchange)).equal(false);
    });

    it('should be true when address is investor', async function () {
      const [owner, investor] = await hre.ethers.getSigners();
      const { registryService, complianceService } = await loadFixture(deployDSTokenRegulated);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      expect(await complianceService.checkWhitelisted(investor)).equal(true);
    });

    it('should be true when address is platform', async function () {
      const [owner, platform] = await hre.ethers.getSigners();
      const { walletManager, complianceService } = await loadFixture(deployDSTokenRegulated);
      await walletManager.addPlatformWallet(platform)
      expect(await complianceService.checkWhitelisted(platform)).equal(true);
    });
  });

  describe('Check on chain cap / authorized securities', function () {
    it('should not allow to issue tokens above the max authorized securities (on chain cap)', async function () {
      const [owner, investor] = await hre.ethers.getSigners();
      const { registryService, complianceConfigurationService, dsToken } = await loadFixture(deployDSTokenRegulated);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      complianceConfigurationService.setAuthorizedSecurities(10);
      await expect(dsToken.issueTokens(investor, 11)).revertedWith('Max authorized securities exceeded');
    });

    it('should allow to issue tokens up to the max authorized securities', async function () {
      const [owner, investor] = await hre.ethers.getSigners();
      const { registryService, complianceConfigurationService, dsToken } = await loadFixture(deployDSTokenRegulated);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      complianceConfigurationService.setAuthorizedSecurities(10);
      dsToken.issueTokens(investor, 2);
      dsToken.issueTokens(investor, 4);
      dsToken.issueTokens(investor, 4);
    });

    it('should allow to issue any amount of tokens if the authorized securities is 0', async function () {
      const [owner, investor] = await hre.ethers.getSigners();
      const { registryService, complianceConfigurationService, dsToken } = await loadFixture(deployDSTokenRegulated);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      complianceConfigurationService.setAuthorizedSecurities(9);
      dsToken.issueTokens(investor, 200);
      dsToken.issueTokens(investor, 4000);
      dsToken.issueTokens(investor, 400);
    });

  });
});
