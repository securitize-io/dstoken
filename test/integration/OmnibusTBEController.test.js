const deployContracts = require('../utils').deployContracts;
const fixtures = require('../fixtures');
const globals = require('../../utils/globals');
const lockManagerType = globals.lockManagerType;
const role = globals.roles;
const compliance = fixtures.Compliance;
const services = require('../../utils/globals').services;

async function assertCounters (testObject, expectedValues) {
  const totalInvestorsCount = await testObject.complianceService.getTotalInvestorsCount();
  const usInvestorsCount = await testObject.complianceService.getUSInvestorsCount();
  const accreditedInvestorsCount = await testObject.complianceService.getAccreditedInvestorsCount();
  const usAccreditedInvestorsCount = await testObject.complianceService.getUSAccreditedInvestorsCount();
  const jpTotalInvestorsCount = await testObject.complianceService.getJPInvestorsCount();

  assert.equal(
    totalInvestorsCount.toNumber(),
    expectedValues.totalInvestorsCount
  );
  assert.equal(usInvestorsCount.toNumber(),
    expectedValues.usTotalInvestorsCount);
  assert.equal(
    accreditedInvestorsCount.toNumber(),
    expectedValues.accreditedInvestorsCount
  );
  assert.equal(
    usAccreditedInvestorsCount.toNumber(),
    expectedValues.usAccreditedInvestorsCount
  );
  assert.equal(
    jpTotalInvestorsCount.toNumber(),
    expectedValues.jpTotalInvestorsCount
  );
}
async function assertCountryCounters (testObject, countryName, expectedCounter) {
  const euRetailCountryCounter = await testObject.complianceService.getEURetailInvestorsCount.call(
    countryName
  );

  assert.equal(
    euRetailCountryCounter.toNumber(),
    expectedCounter,
  );
}

let value = 0;
let time = 15495894;
let counters = {};
let euRetailCountries = [];
let euRetailCountryCounts = [];
contract.only('OmnibusTBEController', ([
  omnibusWallet,
]) => {
  before(async function () {
    await deployContracts(
      this,
      artifacts,
      compliance.NORMAL,
      lockManagerType.INVESTOR,
      [omnibusWallet]
    );
    await this.trustService.setRole(this.omnibusTBEController1.address, role.ISSUER);
    await this.walletManager.addPlatformWallet(omnibusWallet);
    await this.token.setDSService(services.OMNIBUS_TBE_CONTROLLER, this.omnibusTBEController1.address);
    await this.complianceService.setDSService(services.OMNIBUS_TBE_CONTROLLER, this.omnibusTBEController1.address);
  });

  beforeEach(async function () {
    await this.complianceService.setTotalInvestorsCount(0);
    await this.complianceService.setUSInvestorsCount(0);
    await this.complianceService.setUSAccreditedInvestorsCount(0);
    await this.complianceService.setAccreditedInvestorsCount(0);
    await this.complianceService.setJPInvestorsCount(0);
  });

  describe('Bulk issuance', function () {
    it('should bulk issue tokens correctly', async function () {
      // GIVEN
      await initializeValues();

      // WHEN
      await this.omnibusTBEController1
        .bulkIssuance(value, time, counters.totalInvestorsCount, counters.accreditedInvestorsCount,
          counters.usAccreditedInvestorsCount, counters.usTotalInvestorsCount,
          counters.jpTotalInvestorsCount, toHex(euRetailCountries), euRetailCountryCounts);

      // THEN
      await assertCounters(this, counters);

      for (let i = 0; i < euRetailCountries.length; i++) {
        await assertCountryCounters(this, euRetailCountries[i], euRetailCountryCounts[i]);
        // Reset counters after assertion
        await this.complianceService.setEURetailInvestorsCount(euRetailCountries[i], 0);
      }
    });
  });
  describe('Bulk burn', function () {
    it('should bulk burn tokens correctly', async function () {
      // GIVEN
      await initializeValues();

      // WHEN
      await this.omnibusTBEController1
        .bulkIssuance(value, time, counters.totalInvestorsCount, counters.accreditedInvestorsCount,
          counters.usAccreditedInvestorsCount, counters.usTotalInvestorsCount,
          counters.jpTotalInvestorsCount, toHex(euRetailCountries), euRetailCountryCounts);

      value = 500;
      counters.totalInvestorsCount = 40;
      counters.accreditedInvestorsCount = 10;
      counters.usTotalInvestorsCount = 20;
      counters.usAccreditedInvestorsCount = 10;
      counters.jpTotalInvestorsCount = 0;

      await this.omnibusTBEController1
        .bulkBurn(value, counters.totalInvestorsCount, counters.accreditedInvestorsCount,
          counters.usAccreditedInvestorsCount, counters.usTotalInvestorsCount,
          counters.jpTotalInvestorsCount, [], []);

      const delta = {
        totalInvestorsCount: 10,
        accreditedInvestorsCount: 30,
        usTotalInvestorsCount: 10,
        usAccreditedInvestorsCount: 20,
        jpTotalInvestorsCount: 0,
      };

      // THEN
      await assertCounters(this, delta);
    });
  });
});

function toHex (countries) {
  return countries.map(country => web3.utils.asciiToHex(country));
}
async function initializeValues () {
  value = 1000;
  counters.totalInvestorsCount = 50;
  counters.accreditedInvestorsCount = 40;
  counters.usTotalInvestorsCount = 30;
  counters.usAccreditedInvestorsCount = 30;
  counters.jpTotalInvestorsCount = 0;
  euRetailCountries.push('ES');
  euRetailCountryCounts.push(2);
};
