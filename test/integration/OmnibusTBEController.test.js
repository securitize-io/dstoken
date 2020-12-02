const deployContracts = require('../utils').deployContracts;
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
      [omnibusWallet]
    );
    await this.trustService.setRole(this.omnibusTBEController1.address, role.ISSUER);
    await this.walletManager.addPlatformWallet(omnibusWallet);
    await this.token.setDSService(services.OMNIBUS_TBE_CONTROLLER, this.omnibusTBEController1.address);
    await this.complianceService.setDSService(services.OMNIBUS_TBE_CONTROLLER, this.omnibusTBEController1.address);

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

      await setCounters(txCounters);

      // WHEN
      await this.omnibusTBEController1
        .bulkIssuance(value, issuanceTime, txCounters.totalInvestorsCount, txCounters.accreditedInvestorsCount,
          txCounters.usAccreditedInvestorsCount, txCounters.usTotalInvestorsCount,
          txCounters.jpTotalInvestorsCount, await toHex(euRetailCountries), euRetailCountryCounts);

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
  });
  describe('Bulk burn', function () {
    it('should bulk burn tokens correctly', async function () {
      // GIVEN
      const value = 1000;
      const issuanceTime = 15495894;
      const txCounters = {
        totalInvestorsCount: 50,
        accreditedInvestorsCount: 40,
        usTotalInvestorsCount: 30,
        usAccreditedInvestorsCount: 30,
        jpTotalInvestorsCount: 0,
      };

      await setCounters(txCounters);

      const burnValue = 500;
      const txBurnCounters = {
        totalInvestorsCount: 25,
        accreditedInvestorsCount: 20,
        usTotalInvestorsCount: 15,
        usAccreditedInvestorsCount: 15,
        jpTotalInvestorsCount: 0,
      };

      // WHEN
      await this.omnibusTBEController1
        .bulkIssuance(value, issuanceTime, txCounters.totalInvestorsCount, txCounters.accreditedInvestorsCount,
          txCounters.usAccreditedInvestorsCount, txCounters.usTotalInvestorsCount,
          txCounters.jpTotalInvestorsCount, await toHex(euRetailCountries), euRetailCountryCounts);

      await this.omnibusTBEController1
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
        totalInvestorsCount: 50,
        accreditedInvestorsCount: 40,
        usTotalInvestorsCount: 30,
        usAccreditedInvestorsCount: 30,
        jpTotalInvestorsCount: 0,
      };

      euRetailCountries.push('ES');
      euRetailCountryCounts.push(2);

      await setCounters(txCounters);

      // WHEN
      await this.omnibusTBEController1
        .bulkIssuance(value, issuanceTime, txCounters.totalInvestorsCount, txCounters.accreditedInvestorsCount,
          txCounters.usAccreditedInvestorsCount, txCounters.usTotalInvestorsCount,
          txCounters.jpTotalInvestorsCount, await toHex(euRetailCountries), euRetailCountryCounts);

      await this.token.approve(this.omnibusTBEController1.address, value, { from: omnibusWallet });

      await this.omnibusTBEController1
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
      await this.token.approve(this.omnibusTBEController1.address, value, { from: omnibusWallet });

      // THEN
      await assertRevert(this.omnibusTBEController1
        .bulkTransfer(investorWallets, tokenValues));
    });
    it('should not bulk transfer tokens if token value array length does not match wallet array length',
      async function () {
        // GIVEN
        const value = 1000;
        const tokenValues = ['500'];
        const investorWallets = [investorWallet1, investorWallet2];
        const txCounters = {
          totalInvestorsCount: 50,
          accreditedInvestorsCount: 40,
          usTotalInvestorsCount: 30,
          usAccreditedInvestorsCount: 30,
          jpTotalInvestorsCount: 0,
        };
        euRetailCountries.push('ES');
        euRetailCountryCounts.push(2);

        await setCounters(txCounters);

        // WHEN
        await this.omnibusTBEController1
          .bulkIssuance(value, issuanceTime, txCounters.totalInvestorsCount, txCounters.accreditedInvestorsCount,
            txCounters.usAccreditedInvestorsCount, txCounters.usTotalInvestorsCount,
            txCounters.jpTotalInvestorsCount, await toHex(euRetailCountries), euRetailCountryCounts);

        await this.token.approve(this.omnibusTBEController1.address, value, { from: omnibusWallet });

        // THEN
        await assertRevert(this.omnibusTBEController1
          .bulkTransfer(investorWallets, tokenValues));
      });
  });
  describe('Adjust counters', function () {
    it('should adjust counters with positive value correctly', async function () {
      // GIVEN
      const txCounters = {
        totalInvestorsCount: 30,
        accreditedInvestorsCount: 20,
        usTotalInvestorsCount: 15,
        usAccreditedInvestorsCount: 15,
        jpTotalInvestorsCount: 0,
      };

      await setCounters(txCounters);

      // WHEN
      await this.omnibusTBEController1
        .adjustCounters(txCounters.totalInvestorsCount, txCounters.accreditedInvestorsCount,
          txCounters.usAccreditedInvestorsCount, txCounters.usTotalInvestorsCount,
          txCounters.jpTotalInvestorsCount, [], []);

      // THEN
      await assertCounters(this);
    });

    it('should adjust counters with negative value correctly', async function () {
      // GIVEN
      const value = 1000;
      const issuanceTime = 15495894;
      const txCounters = {
        totalInvestorsCount: 30,
        accreditedInvestorsCount: 20,
        usTotalInvestorsCount: 15,
        usAccreditedInvestorsCount: 15,
        jpTotalInvestorsCount: 0,
      };

      const negativeCounters = {
        totalInvestorsCount: -15,
        accreditedInvestorsCount: -10,
        usTotalInvestorsCount: -7,
        usAccreditedInvestorsCount: -7,
        jpTotalInvestorsCount: 0,
      };

      await setCounters(txCounters);

      // WHEN
      await this.omnibusTBEController1
        .bulkIssuance(value, issuanceTime, txCounters.totalInvestorsCount, txCounters.accreditedInvestorsCount,
          txCounters.usAccreditedInvestorsCount, txCounters.usTotalInvestorsCount,
          txCounters.jpTotalInvestorsCount, await toHex(euRetailCountries), euRetailCountryCounts);

      await this.omnibusTBEController1
        .adjustCounters(negativeCounters.totalInvestorsCount, negativeCounters.accreditedInvestorsCount,
          negativeCounters.usAccreditedInvestorsCount, negativeCounters.usTotalInvestorsCount,
          negativeCounters.jpTotalInvestorsCount, [], []);

      await getCountersDelta(negativeCounters);

      // THEN
      await assertCounters(this);
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
    counters[key] = Math.abs(counters[key] - Math.abs(txCounters[key]));
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
