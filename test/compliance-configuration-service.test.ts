import { expect } from 'chai';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { deployDSTokenRegulated, INVESTORS } from './utils/fixture';

describe('Compliance Configuration Service Unit Tests', function() {
  describe('Compliance Configuration Service Unit Tests', function() {
    it('Should set all rules and emit events correctly', async function() {
      const { complianceConfigurationService } = await loadFixture(deployDSTokenRegulated);

      await expect(complianceConfigurationService.setAll(
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
        [true, true, true, true, true]
      )).to.emit(complianceConfigurationService, 'DSComplianceUIntRuleSet').withArgs('totalInvestorsLimit', 0, 1)
        .to.emit(complianceConfigurationService, 'DSComplianceUIntRuleSet').withArgs('minUSTokens', 0, 2)
        .to.emit(complianceConfigurationService, 'DSComplianceUIntRuleSet').withArgs('minEUTokens', 0, 3)
        .to.emit(complianceConfigurationService, 'DSComplianceUIntRuleSet').withArgs('usInvestorsLimit', 0, 4)
        .to.emit(complianceConfigurationService, 'DSComplianceUIntRuleSet').withArgs('usAccreditedInvestorsLimit', 0, 5)
        .to.emit(complianceConfigurationService, 'DSComplianceUIntRuleSet').withArgs('nonAccreditedInvestorsLimit', 0, 6)
        .to.emit(complianceConfigurationService, 'DSComplianceUIntRuleSet').withArgs('maxUSInvestorsPercentage', 0, 7)
        .to.emit(complianceConfigurationService, 'DSComplianceUIntRuleSet').withArgs('blockFlowbackEndTime', 0, 8)
        .to.emit(complianceConfigurationService, 'DSComplianceUIntRuleSet').withArgs('nonUSLockPeriod', 0, 9)
        .to.emit(complianceConfigurationService, 'DSComplianceUIntRuleSet').withArgs('minimumTotalInvestors', 0, 10)
        .to.emit(complianceConfigurationService, 'DSComplianceUIntRuleSet').withArgs('minimumHoldingsPerInvestor', 0, 11)
        .to.emit(complianceConfigurationService, 'DSComplianceUIntRuleSet').withArgs('maximumHoldingsPerInvestor', 0, 12)
        .to.emit(complianceConfigurationService, 'DSComplianceUIntRuleSet').withArgs('euRetailInvestorsLimit', 0, 13)
        .to.emit(complianceConfigurationService, 'DSComplianceUIntRuleSet').withArgs('usLockPeriod', 0, 14)
        .to.emit(complianceConfigurationService, 'DSComplianceUIntRuleSet').withArgs('jpInvestorsLimit', 0, 15)
        .to.emit(complianceConfigurationService, 'DSComplianceBoolRuleSet').withArgs('forceFullTransfer', false, true)
        .to.emit(complianceConfigurationService, 'DSComplianceBoolRuleSet').withArgs('forceAccredited', false, true)
        .to.emit(complianceConfigurationService, 'DSComplianceBoolRuleSet').withArgs('forceAccreditedUS', false, true)
        .to.emit(complianceConfigurationService, 'DSComplianceBoolRuleSet').withArgs('worldWideForceFullTransfer', false, true)
        .to.emit(complianceConfigurationService, 'DSComplianceBoolRuleSet').withArgs('disallowBackDating', false, true);

      const result = await complianceConfigurationService.getAll();

      expect(result[0]).to.deep.equal([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
      expect(result[1]).to.deep.equal([true, true, true, true, true]);
    });
  });

  describe('setCountryCompliance', function() {
    it('Should set country compliance correctly', async function() {
      const { complianceConfigurationService } = await loadFixture(deployDSTokenRegulated);
      await expect(complianceConfigurationService.setCountryCompliance(INVESTORS.Country.USA, INVESTORS.Compliance.US))
        .to.emit(complianceConfigurationService, 'DSComplianceStringToUIntMapRuleSet').withArgs(
          'countryCompliance',
          INVESTORS.Country.USA,
          INVESTORS.Compliance.NONE,
          INVESTORS.Compliance.US
        );
    });

    it('Should set countries compliance in bulk mode correctly', async function () {
      const { complianceConfigurationService } = await loadFixture(deployDSTokenRegulated);
      await expect(complianceConfigurationService.setCountriesCompliance(
        [INVESTORS.Country.SPAIN, INVESTORS.Country.GERMANY, INVESTORS.Country.CHINA, INVESTORS.Country.JAPAN],
        [INVESTORS.Compliance.EU, INVESTORS.Compliance.EU, INVESTORS.Compliance.FORBIDDEN, INVESTORS.Compliance.JP],
      )).to.emit(complianceConfigurationService, 'DSComplianceStringToUIntMapRuleSet').withArgs('countryCompliance', INVESTORS.Country.SPAIN, INVESTORS.Compliance.NONE, INVESTORS.Compliance.EU)
        .to.emit(complianceConfigurationService, 'DSComplianceStringToUIntMapRuleSet').withArgs('countryCompliance', INVESTORS.Country.GERMANY, INVESTORS.Compliance.NONE, INVESTORS.Compliance.EU)
        .to.emit(complianceConfigurationService, 'DSComplianceStringToUIntMapRuleSet').withArgs('countryCompliance', INVESTORS.Country.CHINA, INVESTORS.Compliance.NONE, INVESTORS.Compliance.FORBIDDEN)
        .to.emit(complianceConfigurationService, 'DSComplianceStringToUIntMapRuleSet').withArgs('countryCompliance', INVESTORS.Country.JAPAN, INVESTORS.Compliance.NONE, INVESTORS.Compliance.JP)
    });

    it('Should set countries compliance in bulk mode correctly', async function () {
      const { complianceConfigurationService } = await loadFixture(deployDSTokenRegulated);
      await expect(complianceConfigurationService.setCountriesCompliance(
        [INVESTORS.Country.SPAIN, INVESTORS.Country.GERMANY, INVESTORS.Country.CHINA, INVESTORS.Country.JAPAN],
        [INVESTORS.Compliance.EU, INVESTORS.Compliance.EU],
      )).revertedWith('Wrong length of parameters');
    });
  });

  describe('setDisallowBackDating', function () {
    it('Should set disallowBackDating compliance correctly', async function () {
      const { complianceConfigurationService } = await loadFixture(deployDSTokenRegulated);
      let disallowBackDating = await complianceConfigurationService.getDisallowBackDating();
      expect(disallowBackDating).equal(false);
      await complianceConfigurationService.setDisallowBackDating(true);
      disallowBackDating = await complianceConfigurationService.getDisallowBackDating();
      expect(disallowBackDating).equal(true);
    });
  });
});
