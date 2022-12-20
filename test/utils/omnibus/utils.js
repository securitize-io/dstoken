const globals = require('../../../utils/globals');
const fixtures = require('../../fixtures');
const services = globals.services;

const counters = fixtures.Counters;

async function setOmnibusTBEServicesDependencies (testObject) {
  await testObject.token.setDSService(services.OMNIBUS_TBE_CONTROLLER, testObject.omnibusTBEController.address);
  await testObject.complianceService
    .setDSService(services.OMNIBUS_TBE_CONTROLLER, testObject.omnibusTBEController.address);
  await testObject.omnibusTBEController
    .setDSService(services.COMPLIANCE_SERVICE, testObject.complianceService.address);
  await testObject.omnibusTBEController
    .setDSService(services.DS_TOKEN, testObject.token.address);
  await testObject.omnibusTBEController
    .setDSService(services.TRUST_SERVICE, testObject.trustService.address);
  await testObject.omnibusTBEController
    .setDSService(services.COMPLIANCE_CONFIGURATION_SERVICE, testObject.complianceConfiguration.address);
}
async function resetCounters (testObject) {
  await testObject.complianceConfiguration.setTotalInvestorsLimit(10);
  await testObject.complianceConfiguration.setUSAccreditedInvestorsLimit(10);
  await testObject.complianceConfiguration.setUSInvestorsLimit(10);
  await testObject.complianceConfiguration.setJPInvestorsLimit(10);
  await testObject.complianceConfiguration.setNonAccreditedInvestorsLimit(10);

  await testObject.complianceService.setTotalInvestorsCount(0);
  await testObject.complianceService.setUSInvestorsCount(0);
  await testObject.complianceService.setUSAccreditedInvestorsCount(0);
  await testObject.complianceService.setAccreditedInvestorsCount(0);
  await testObject.complianceService.setJPInvestorsCount(0);

  Object.keys(counters).forEach(key => {
    counters[key] = 0;
  });
}
async function setCounters (txCounters, testObject) {
  const currentCounters = await getCounters(testObject);
  Object.keys(txCounters).forEach(key => {
    counters[key] = txCounters[key] + currentCounters[key];
  });
}
async function getCountersDelta (txCounters) {
  Object.keys(txCounters).forEach(key => {
    counters[key] = Math.abs(counters[key] - Math.abs(txCounters[key]));
  });
}
async function toHex (countries) {
  return countries.map(country => web3.utils.asciiToHex(country));
}
async function assertCounters (testObject) {
  const currentCounters = await getCounters(testObject);
  assert.equal(
    currentCounters.totalInvestorsCount,
    counters.totalInvestorsCount,
  );
  assert.equal(
    currentCounters.usTotalInvestorsCount,
    counters.usTotalInvestorsCount);
  assert.equal(
    currentCounters.accreditedInvestorsCount,
    counters.accreditedInvestorsCount,
  );
  assert.equal(
    currentCounters.usAccreditedInvestorsCount,
    counters.usAccreditedInvestorsCount,
  );
  assert.equal(
    currentCounters.jpTotalInvestorsCount,
    counters.jpTotalInvestorsCount,
  );
}
async function assertCountryCounters (testObject, countryName, expectedCounter) {
  const euRetailCountryCounter = await testObject.complianceService.getEURetailInvestorsCount.call(
    countryName,
  );

  assert.equal(
    euRetailCountryCounter.toNumber(),
    expectedCounter,
  );
}
async function getCounters (testObject) {
  const totalInvestorsCount = await testObject.complianceService.getTotalInvestorsCount();
  const usInvestorsCount = await testObject.complianceService.getUSInvestorsCount();
  const accreditedInvestorsCount = await testObject.complianceService.getAccreditedInvestorsCount();
  const usAccreditedInvestorsCount = await testObject.complianceService.getUSAccreditedInvestorsCount();
  const jpTotalInvestorsCount = await testObject.complianceService.getJPInvestorsCount();

  return {
    totalInvestorsCount: totalInvestorsCount.toNumber(),
    usTotalInvestorsCount: usInvestorsCount.toNumber(),
    accreditedInvestorsCount: accreditedInvestorsCount.toNumber(),
    usAccreditedInvestorsCount: usAccreditedInvestorsCount.toNumber(),
    jpTotalInvestorsCount: jpTotalInvestorsCount.toNumber(),
  };
}

async function assertEvent (contract, expectedEvent, expectedParams) {
  const events = await contract.getPastEvents('allEvents');

  const event = events.find(event => event.event == expectedEvent);

  if (!event) {
    assert.fail(`Event ${expectedEvent} not found`);
  }
  for (const key of Object.keys(expectedParams)) {
    assert.equal(event.returnValues[key], expectedParams[key]);
  }
}

module.exports = {
  setOmnibusTBEServicesDependencies,
  resetCounters,
  setCounters,
  getCountersDelta,
  toHex,
  assertCounters,
  assertCountryCounters,
  assertEvent,
};
