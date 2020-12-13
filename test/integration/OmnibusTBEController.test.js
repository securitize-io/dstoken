const deployContracts = require('../utils/index').deployContracts;
const assertRevert = require('../utils/assertRevert');
const fixtures = require('../fixtures');
const globals = require('../../utils/globals');

const services = globals.services;
const lockManagerType = globals.lockManagerType;
const role = globals.roles;

const compliance = fixtures.Compliance;
const investorId = fixtures.InvestorId;

let counters = fixtures.Counters;
let euRetailCountries = [];
let euRetailCountryCounts = [];
const issuanceTime = 15495894;

contract.only('OmnibusTBEController', ([
  omnibusWallet,
  investorWallet1,
  investorWallet2,
]) => {
  before(async function () {
    await deployContracts(
      this,
      artifacts,
      compliance.NORMAL,
      lockManagerType.INVESTOR,
      undefined,
      false,
      omnibusWallet
    );
    await setServicesDependencies(this);
    await this.trustService.setRole(this.omnibusTBEController.address, role.ISSUER);
    await this.walletManager.addPlatformWallet(omnibusWallet);

    await this.registryService.registerInvestor(
      investorId.GENERAL_INVESTOR_ID_1,
      investorId.GENERAL_INVESTOR_COLLISION_HASH_2
    );
    await this.registryService.addWallet(
      investorWallet1,
      investorId.GENERAL_INVESTOR_ID_1
    );
    await this.registryService.registerInvestor(
      investorId.GENERAL_INVESTOR_ID_2,
      investorId.GENERAL_INVESTOR_COLLISION_HASH_2
    );
    await this.registryService.addWallet(
      investorWallet2,
      investorId.GENERAL_INVESTOR_ID_2
    );

    await resetCounters(this);
  });

  beforeEach(async function () {
    await resetCounters(this);
    const currentBalance = await this.token.balanceOf(omnibusWallet);
    if (currentBalance.toNumber() > 0) {
      await this.token.burn(omnibusWallet, currentBalance, '');
    }
  });

  describe('Bulk issuance', function () {
    it('should bulk issue tokens correctly', async function () {
      // GIVEN
      await this.complianceService.setTotalInvestorsCount(1);
      await this.complianceConfiguration.setNonAccreditedInvestorsLimit(1);
      const value = 1000;
      const txCounters = {
        totalInvestorsCount: 1,
        accreditedInvestorsCount: 1,
        usTotalInvestorsCount: 0,
        usAccreditedInvestorsCount: 0,
        jpTotalInvestorsCount: 0,
      };

      await setCounters(txCounters, this);

      // WHEN
      await this.omnibusTBEController
        .bulkIssuance(value, issuanceTime, txCounters.totalInvestorsCount, txCounters.accreditedInvestorsCount,
          txCounters.usAccreditedInvestorsCount, txCounters.usTotalInvestorsCount,
          txCounters.jpTotalInvestorsCount, [], []);

      // THEN
      await assertCounters(this);

      const currentBalance = await this.token.balanceOf(omnibusWallet);
      await assert.equal(
        currentBalance,
        1000
      );

      for (let i = 0; i < euRetailCountries.length; i++) {
        await assertCountryCounters(this, euRetailCountries[i], euRetailCountryCounts[i]);
        // Reset counters after assertion
        await this.complianceService.setEURetailInvestorsCount(euRetailCountries[i], 0);
      }
    });
    it('should not bulk issue tokens if it exceeds counter', async function () {
      // GIVEN
      await this.complianceService.setTotalInvestorsCount(1);
      await this.complianceConfiguration.setNonAccreditedInvestorsLimit(1);
      const value = 1000;
      const txCounters = {
        totalInvestorsCount: 1,
        accreditedInvestorsCount: 0,
        usTotalInvestorsCount: 0,
        usAccreditedInvestorsCount: 0,
        jpTotalInvestorsCount: 0,
      };

      await setCounters(txCounters, this);

      // THEN
      await assertRevert(this.omnibusTBEController
        .bulkIssuance(value, issuanceTime, txCounters.totalInvestorsCount, txCounters.accreditedInvestorsCount,
          txCounters.usAccreditedInvestorsCount, txCounters.usTotalInvestorsCount,
          txCounters.jpTotalInvestorsCount, [], []));
    });
  });
  describe('Bulk burn', function () {
    it('should bulk burn tokens correctly', async function () {
      // GIVEN
      const value = 1000;
      const txCounters = {
        totalInvestorsCount: 6,
        accreditedInvestorsCount: 5,
        usTotalInvestorsCount: 4,
        usAccreditedInvestorsCount: 1,
        jpTotalInvestorsCount: 0,
      };

      await setCounters(txCounters, this);

      const burnValue = 500;
      const txBurnCounters = {
        totalInvestorsCount: 1,
        accreditedInvestorsCount: 1,
        usTotalInvestorsCount: 0,
        usAccreditedInvestorsCount: 0,
        jpTotalInvestorsCount: 0,
      };

      // WHEN
      await this.omnibusTBEController
        .bulkIssuance(value, issuanceTime, txCounters.totalInvestorsCount, txCounters.accreditedInvestorsCount,
          txCounters.usAccreditedInvestorsCount, txCounters.usTotalInvestorsCount,
          txCounters.jpTotalInvestorsCount, await toHex(euRetailCountries), euRetailCountryCounts);

      await this.omnibusTBEController
        .bulkBurn(burnValue, txBurnCounters.totalInvestorsCount, txBurnCounters.accreditedInvestorsCount,
          txBurnCounters.usAccreditedInvestorsCount, txBurnCounters.usTotalInvestorsCount,
          txBurnCounters.jpTotalInvestorsCount, [], []);

      await getCountersDelta(txBurnCounters);

      // THEN
      await assertCounters(this);

      const currentBalance = await this.token.balanceOf(omnibusWallet);
      await assert.equal(
        currentBalance,
        500
      );
    });
  });
  describe('Bulk transfer', function () {
    it('should bulk transfer tokens from omnibus to wallet correctly', async function () {
      // GIVEN
      const value = 1000;
      const tokenValues = ['500', '500'];
      const investorWallets = [investorWallet1, investorWallet2];
      const txCounters = {
        totalInvestorsCount: 5,
        accreditedInvestorsCount: 5,
        usTotalInvestorsCount: 4,
        usAccreditedInvestorsCount: 1,
        jpTotalInvestorsCount: 0,
      };

      euRetailCountries.push('ES');
      euRetailCountryCounts.push(2);

      await setCounters(txCounters, this);

      // WHEN
      await this.omnibusTBEController
        .bulkIssuance(value, issuanceTime, txCounters.totalInvestorsCount, txCounters.accreditedInvestorsCount,
          txCounters.usAccreditedInvestorsCount, txCounters.usTotalInvestorsCount,
          txCounters.jpTotalInvestorsCount, await toHex(euRetailCountries), euRetailCountryCounts);

      await this.token.approve(this.omnibusTBEController.address, value, { from: omnibusWallet });

      await this.omnibusTBEController
        .bulkTransfer(investorWallets, tokenValues);

      // THEN
      const omnibusCurrentBalance = await this.token.balanceOf(omnibusWallet);
      assert.equal(
        omnibusCurrentBalance.toNumber(),
        0
      );
      const investorWallet1CurrentBalance = await this.token.balanceOf(investorWallet1);
      assert.equal(
        investorWallet1CurrentBalance.toNumber(),
        500
      );
      const investorWallet2CurrentBalance = await this.token.balanceOf(investorWallet2);
      assert.equal(
        investorWallet2CurrentBalance.toNumber(),
        500
      );
    });
    it('should not bulk transfer tokens from omnibus to wallet if omnibus has no balance', async function () {
      // GIVEN
      const value = 1000;
      const tokenValues = ['500', '500'];
      const investorWallets = [investorWallet1, investorWallet2];
      const currentOmnibusBalance = await this.token.balanceOf(omnibusWallet);
      assert.equal(
        currentOmnibusBalance.toNumber(),
        0
      );
      // WHEN
      await this.token.approve(this.omnibusTBEController.address, value, { from: omnibusWallet });

      // THEN
      await assertRevert(this.omnibusTBEController
        .bulkTransfer(investorWallets, tokenValues));
    });
    it('should not bulk transfer tokens if token value array length does not match wallet array length',
      async function () {
        // GIVEN
        const value = 1000;
        const tokenValues = ['500'];
        const investorWallets = [investorWallet1, investorWallet2];
        const txCounters = {
          totalInvestorsCount: 5,
          accreditedInvestorsCount: 5,
          usTotalInvestorsCount: 4,
          usAccreditedInvestorsCount: 1,
          jpTotalInvestorsCount: 0,
        };

        euRetailCountries.push('ES');
        euRetailCountryCounts.push(2);

        await setCounters(txCounters, this);

        // WHEN
        await this.omnibusTBEController
          .bulkIssuance(value, issuanceTime, txCounters.totalInvestorsCount, txCounters.accreditedInvestorsCount,
            txCounters.usAccreditedInvestorsCount, txCounters.usTotalInvestorsCount,
            txCounters.jpTotalInvestorsCount, await toHex(euRetailCountries), euRetailCountryCounts);

        await this.token.approve(this.omnibusTBEController.address, value, { from: omnibusWallet });

        // THEN
        await assertRevert(this.omnibusTBEController
          .bulkTransfer(investorWallets, tokenValues));
      });
  });
  describe('Adjust counters', function () {
    it('should adjust counters with positive value correctly', async function () {
      // GIVEN
      const txCounters = {
        totalInvestorsCount: 5,
        accreditedInvestorsCount: 5,
        usTotalInvestorsCount: 4,
        usAccreditedInvestorsCount: 1,
        jpTotalInvestorsCount: 0,
      };

      await setCounters(txCounters, this);

      // WHEN
      await this.omnibusTBEController
        .adjustCounters(txCounters.totalInvestorsCount, txCounters.accreditedInvestorsCount,
          txCounters.usAccreditedInvestorsCount, txCounters.usTotalInvestorsCount,
          txCounters.jpTotalInvestorsCount, [], []);

      // THEN
      await assertCounters(this);
    });
    it('should adjust counters with negative value correctly', async function () {
      // GIVEN
      const value = 1000;
      const txCounters = {
        totalInvestorsCount: 6,
        accreditedInvestorsCount: 5,
        usTotalInvestorsCount: 4,
        usAccreditedInvestorsCount: 1,
        jpTotalInvestorsCount: 0,
      };

      const negativeCounters = {
        totalInvestorsCount: -1,
        accreditedInvestorsCount: -1,
        usTotalInvestorsCount: -1,
        usAccreditedInvestorsCount: -1,
        jpTotalInvestorsCount: 0,
      };

      await setCounters(txCounters, this);

      // WHEN
      await this.omnibusTBEController
        .bulkIssuance(value, issuanceTime, txCounters.totalInvestorsCount, txCounters.accreditedInvestorsCount,
          txCounters.usAccreditedInvestorsCount, txCounters.usTotalInvestorsCount,
          txCounters.jpTotalInvestorsCount, await toHex(euRetailCountries), euRetailCountryCounts);

      await this.omnibusTBEController
        .adjustCounters(negativeCounters.totalInvestorsCount, negativeCounters.accreditedInvestorsCount,
          negativeCounters.usAccreditedInvestorsCount, negativeCounters.usTotalInvestorsCount,
          negativeCounters.jpTotalInvestorsCount, [], []);

      await getCountersDelta(negativeCounters);

      // THEN
      await assertCounters(this);
    });
  });
});
async function setServicesDependencies (testObject) {
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
async function toHex (countries) {
  return countries.map(country => web3.utils.asciiToHex(country));
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

  euRetailCountries = [];
  euRetailCountryCounts = [];
  Object.keys(counters).forEach(key => {
    counters[key] = 0;
  });
}
async function setCounters (txCounters, testObject) {
  const currentCounters = await getCounters(testObject);
  console.log(currentCounters);
  Object.keys(txCounters).forEach(key => {
    counters[key] = txCounters[key] + currentCounters[key];
  });
}
async function getCountersDelta (txCounters) {
  Object.keys(txCounters).forEach(key => {
    counters[key] = Math.abs(counters[key] - Math.abs(txCounters[key]));
  });
}
async function getCounters (testObject) {
  const totalInvestorsCount = await testObject.complianceService.getTotalInvestorsCount();
  const usInvestorsCount = await testObject.complianceService.getUSInvestorsCount();
  const accreditedInvestorsCount = await testObject.complianceService.getAccreditedInvestorsCount();
  const usAccreditedInvestorsCount = await testObject.complianceService.getUSAccreditedInvestorsCount();
  const jpTotalInvestorsCount = await testObject.complianceService.getJPInvestorsCount();

  return {
    totalInvestorsCount: totalInvestorsCount.toNumber(),
    usInvestorsCount: usInvestorsCount.toNumber(),
    accreditedInvestorsCount: accreditedInvestorsCount.toNumber(),
    usAccreditedInvestorsCount: usAccreditedInvestorsCount.toNumber(),
    jpTotalInvestorsCount: jpTotalInvestorsCount.toNumber(),
  };
}
async function assertCounters (testObject) {
  const currentCounters = await getCounters(testObject);
  assert.equal(
    currentCounters.totalInvestorsCount,
    counters.totalInvestorsCount
  );
  assert.equal(
    currentCounters.usInvestorsCount,
    counters.usTotalInvestorsCount);
  assert.equal(
    currentCounters.accreditedInvestorsCount,
    counters.accreditedInvestorsCount
  );
  assert.equal(
    currentCounters.usAccreditedInvestorsCount,
    counters.usAccreditedInvestorsCount
  );
  assert.equal(
    currentCounters.jpTotalInvestorsCount,
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
