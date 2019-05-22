const assertRevert = require('../helpers/assertRevert');
const utils = require('../utils');
const services = require('../utils/globals').services;
const RegistryServiceMock = artifacts.require('RegistryServiceMock');
const TokenMock = artifacts.require('TokenMock');
const WalletManagerMock = artifacts.require('WalletManagerMock');
const ComplianceConfigurationMock = artifacts.require(
  'ComplianceConfigurationMock'
);
const EternalStorage = artifacts.require('DSEternalStorageVersioned');
const ESComplianceServiceRegulated = artifacts.require(
  'ESComplianceServiceRegulatedVersioned'
);

const investorId1 = 'id1';

contract('ESComplianceServiceRegulated', function([owner, wallet1]) {
  before(async () => {
    this.storage = await EternalStorage.new();

    this.tokenMock = await TokenMock.new();
    this.registryServiceMock = await RegistryServiceMock.new();
    this.walletManagerMock = await WalletManagerMock.new();
    this.complianceService = await ESComplianceServiceRegulated.new(
      this.storage.address,
      'ESComplianceServiceRegulated'
    );
    this.complianceConfigurationMock = await ComplianceConfigurationMock.new();

    await utils.addWriteRoles(this.storage, [this.complianceService.address]);

    await utils.setServicesDependencies(
      this.complianceService,
      [
        // services.TRUST_SERVICE,
        services.WALLET_MANAGER,
        // services.LOCK_MANAGER,
        services.COMPLIANCE_CONFIGURATION_SERVICE,
        services.REGISTRY_SERVICE,
        services.DS_TOKEN,
      ],
      [
        // this.trustService.address,
        this.walletManagerMock.address,
        // this.lockManager.address,
        this.complianceConfigurationMock.address,
        this.registryServiceMock.address,
        this.tokenMock.address,
      ]
    );

    await this.registryServiceMock.setDSService(
      services.COMPLIANCE_SERVICE,
      this.complianceService.address
    );
    await this.complianceConfigurationMock.setCountryCompliance('USA', 1);
    await this.complianceConfigurationMock.setCountryCompliance('France', 2);
  });
  describe('Tests', () => {
    beforeEach(async () => {
      await this.complianceService.setUSInvestorsCount(0);
      await this.complianceService.setUSAccreditedInvestorsCount(0);
      await this.complianceService.setEuRetailInvestorsCount('France', 0);
      await this.tokenMock.setInvestorBalance(investorId1, 0);
      await this.registryServiceMock.setCountry(investorId1, '');
    });

    describe('adjustInvestorCountsAfterCountryChange', () => {
      it('Should revert due to not registry calling the function', async () => {
        await assertRevert(
          this.complianceService.adjustInvestorCountsAfterCountryChange(
            '',
            '',
            ''
          )
        );
      });

      it('Should keep the US investors count the same when the balance of the investor is 0', async () => {
        await this.registryServiceMock.setCountry(investorId1, 'USA');
        usInvestorsCount = await this.complianceService.getUSInvestorsCount();
        assert.equal(usInvestorsCount.toNumber(), 0);
      });

      it('Should increase US investors count when setting a country for a US investor', async () => {
        let usInvestorsCount = await this.complianceService.getUSInvestorsCount();
        let accreditedUSInvestorsCount = await this.complianceService.getUSAccreditedInvestorsCount();
        assert.equal(usInvestorsCount.toNumber(), 0);
        assert.equal(accreditedUSInvestorsCount.toNumber(), 0);
        await this.tokenMock.setInvestorBalance(investorId1, 500);
        await this.registryServiceMock.setCountry(investorId1, 'USA');
        usInvestorsCount = await this.complianceService.getUSInvestorsCount();
        accreditedUSInvestorsCount = await this.complianceService.getUSAccreditedInvestorsCount();
        assert.equal(usInvestorsCount.toNumber(), 1);
        assert.equal(accreditedUSInvestorsCount.toNumber(), 1);
      });

      it('Should increate EU investors count and decrease US investors count when changing country to EU from US', async () => {
        await this.tokenMock.setInvestorBalance(investorId1, 500);
        await this.registryServiceMock.setCountry(investorId1, 'USA');
        let usInvestorsCount = await this.complianceService.getUSInvestorsCount();
        assert.equal(usInvestorsCount.toNumber(), 1);

        await this.registryServiceMock.setCountry(investorId1, 'France');
        let euInvestorsCount = await this.complianceService.getEURetailInvestorsCount(
          'France'
        );
        usInvestorsCount = await this.complianceService.getUSInvestorsCount();
        assert.equal(euInvestorsCount.toNumber(), 1);
        assert.equal(usInvestorsCount.toNumber(), 0);
      });

      it('Should only increase US investors count and not US retail investors count when accreditation status is APPROVED', async () => {
        await this.tokenMock.setInvestorBalance(investorId1, 500);
        await this.registryServiceMock.setAttribute(investorId1, 2, 1, 0, '');
        await this.registryServiceMock.setCountry(investorId1, 'USA');
        let usInvestorsCount = await this.complianceService.getUSInvestorsCount();
        let accreditedUSInvestorsCount = await this.complianceService.getUSAccreditedInvestorsCount();
        assert.equal(usInvestorsCount.toNumber(), 1);
        assert.equal(accreditedUSInvestorsCount.toNumber(), 0);
      });

      it('Should not increase EU investors count when accreditation status is APPROVED', async () => {
        await this.tokenMock.setInvestorBalance(investorId1, 500);
        await this.registryServiceMock.setAttribute(investorId1, 4, 1, 0, '');
        await this.registryServiceMock.setCountry(investorId1, 'France');
        let euInvestorsCount = await this.complianceService.getEURetailInvestorsCount(
          'France'
        );
        assert.equal(euInvestorsCount.toNumber(), 0);
      });
    });
  });
});
