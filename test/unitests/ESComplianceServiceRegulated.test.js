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

contract('ESComplianceServiceRegulated', function([owner]) {
  before(async () => {
    this.storage = await EternalStorage.new();

    this.tokenMock = await TokenMock.new();
    this.registryServiceMock = await RegistryServiceMock.new();
    this.walletManagerMock = await WalletManagerMock.new();
    this.complianceService = await ESComplianceServiceRegulated.new(
      this.storage.address,
      'ESComplianceServiceRegulated'
    );
    this.complianceConfiguration = await ComplianceConfigurationMock.new();

    await utils.addAdminRules(this.storage, [this.complianceService.address]);

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
        this.complianceConfiguration.address,
        this.registryServiceMock.address,
        this.tokenMock.address,
      ]
    );

    await this.complianceConfiguration.setCountryCompliance('USA', 1);
  });

  describe('adjustInvestorCountsAfterCountryChange', () => {
    it('Should revert due to not registry call', async () => {
      await assertRevert(
        this.complianceService.adjustInvestorCountsAfterCountryChange(
          '',
          '',
          ''
        )
      );
    });

    it('Should increase US investors count when setting a country for a US investor', async () => {
      let usInvestorsCount = await this.complianceService.getUSInvestorsCount();

      assert.equal(usInvestorsCount.toNumber(), 0);

      await this.tokenMock.setInvestorBalance(investorId1, 500);

      await this.complianceService.adjustInvestorCountsAfterCountryChange.call(
        investorId1,
        'USA',
        '',
        {from: this.registryServiceMock.address}
      );

      usInvestorsCount = await this.complianceService.getUSInvestorsCount();

      assert.equal(usInvestorsCount.toNumber(), 1);
    });
  });
});
