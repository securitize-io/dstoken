const deployContracts = require('../utils').deployContracts;
const fixtures = require('../fixtures');
const globals = require('../../utils/globals');
const lockManagerType = globals.lockManagerType;
const role = globals.roles;
const compliance = fixtures.Compliance;
const services = require('../../utils/globals').services;

let time = 15495894;
let counters = fixtures.Counters;
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
    await resetCounters(this);
  });

  describe('Bulk issuance', function () {
    it('should bulk issue tokens correctly', async function () {
      // GIVEN
      const value = 1000;
      const txCounters = {
        totalInvestorsCount: 50,
        accreditedInvestorsCount: 40,
        usTotalInvestorsCount: 30,
        usAccreditedInvestorsCount: 30,
        jpTotalInvestorsCount: 0,
      };

      euRetailCountries.push('ES');
      euRetailCountryCounts.push(2);

      // WHEN
      await this.omnibusTBEController1
        .bulkIssuance(value, time, txCounters.totalInvestorsCount, txCounters.accreditedInvestorsCount,
          txCounters.usAccreditedInvestorsCount, txCounters.usTotalInvestorsCount,
          txCounters.jpTotalInvestorsCount, await toHex(euRetailCountries), euRetailCountryCounts);

      await setCounters(txCounters);

      // THEN
      await assertCounters(this);

      // const currentBalance = await this.token.balanceOf(omnibusWallet);
      // await assert.equal(
      //   currentBalance,
      //   1000
      // );

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
      const value = 1000;
      const txCounters = {
        totalInvestorsCount: 50,
        accreditedInvestorsCount: 40,
        usTotalInvestorsCount: 30,
        usAccreditedInvestorsCount: 30,
        jpTotalInvestorsCount: 0,
      };

      // WHEN
      await this.omnibusTBEController1
        .bulkIssuance(value, time, txCounters.totalInvestorsCount, txCounters.accreditedInvestorsCount,
          txCounters.usAccreditedInvestorsCount, txCounters.usTotalInvestorsCount,
          txCounters.jpTotalInvestorsCount, await toHex(euRetailCountries), euRetailCountryCounts);

      await setCounters(txCounters);

      const burnValue = 500;
      const txBurnCounters = {
        totalInvestorsCount: 25,
        accreditedInvestorsCount: 20,
        usTotalInvestorsCount: 15,
        usAccreditedInvestorsCount: 15,
        jpTotalInvestorsCount: 0,
      };

      await this.omnibusTBEController1
        .bulkBurn(burnValue, txBurnCounters.totalInvestorsCount, txBurnCounters.accreditedInvestorsCount,
          txBurnCounters.usAccreditedInvestorsCount, txBurnCounters.usTotalInvestorsCount,
          txBurnCounters.jpTotalInvestorsCount, [], []);

      await getCountersDelta(txBurnCounters);

      // THEN
      await assertCounters(this);

      // const currentBalance = await this.token.balanceOf(omnibusWallet);
      // // await assert.equal(
      // //   currentBalance,
      // //   500
      // // );
    });
  });
});

async function toHex (countries) {
  return countries.map(country => web3.utils.asciiToHex(country));
}
async function resetCounters (testObject) {
  await testObject.complianceService.setTotalInvestorsCount(0);
  await testObject.complianceService.setUSInvestorsCount(0);
  await testObject.complianceService.setUSAccreditedInvestorsCount(0);
  await testObject.complianceService.setAccreditedInvestorsCount(0);
  await testObject.complianceService.setJPInvestorsCount(0);

  euRetailCountries = [];
  euRetailCountryCounts = [];
  Object.keys(counters).forEach(key => {
    counters[key] = 0;
  });
}
async function setCounters (txCounters) {
  Object.keys(txCounters).forEach(key => {
    counters[key] = txCounters[key];
  });
}
async function getCountersDelta (txCounters) {
  Object.keys(txCounters).forEach(key => {
    counters[key] = Math.abs(counters[key] - txCounters[key]);
  });
}
async function assertCounters (testObject) {
  const totalInvestorsCount = await testObject.complianceService.getTotalInvestorsCount();
  const usInvestorsCount = await testObject.complianceService.getUSInvestorsCount();
  const accreditedInvestorsCount = await testObject.complianceService.getAccreditedInvestorsCount();
  const usAccreditedInvestorsCount = await testObject.complianceService.getUSAccreditedInvestorsCount();
  const jpTotalInvestorsCount = await testObject.complianceService.getJPInvestorsCount();

  assert.equal(
    totalInvestorsCount.toNumber(),
    counters.totalInvestorsCount
  );
  assert.equal(usInvestorsCount.toNumber(),
    counters.usTotalInvestorsCount);
  assert.equal(
    accreditedInvestorsCount.toNumber(),
    counters.accreditedInvestorsCount
  );
  assert.equal(
    usAccreditedInvestorsCount.toNumber(),
    counters.usAccreditedInvestorsCount
  );
  assert.equal(
    jpTotalInvestorsCount.toNumber(),
    counters.jpTotalInvestorsCount
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
