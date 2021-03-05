const deployContracts = require('../utils/index').deployContracts;
const globals = require('../../utils/globals');
const fixtures = require('../fixtures');
const { setOmnibusTBEServicesDependencies, resetCounters, setCounters,
  getCountersDelta, toHex, assertCounters, assertCountryCounters } =
    require('../utils/omnibus/utils');

const lockManagerType = globals.lockManagerType;
const role = globals.roles;
const compliance = globals.complianceType;

const investorId = fixtures.InvestorId;

let euRetailCountries = [];
let euRetailCountryCounts = [];
const issuanceTime = 15495894;

contract('OmnibusTBEControllerPartitioned', ([
  omnibusWallet,
  investorWallet1,
  investorWallet2,
]) => {
  before(async function () {
    await deployContracts(
      this,
      artifacts,
      compliance.PARTITIONED,
      lockManagerType.PARTITIONED,
      undefined,
      true,
      omnibusWallet
    );
    await setOmnibusTBEServicesDependencies(this);
    await this.trustService.setRole(this.omnibusTBEController.address, role.ISSUER);

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
      const partition = await this.token.partitionOf(omnibusWallet, 0);
      await this.token.burnByPartition(omnibusWallet, currentBalance, '', partition);
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

      euRetailCountries.push('EU');
      euRetailCountryCounts.push('1');

      await setCounters(txCounters, this);

      // WHEN
      await this.omnibusTBEController
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

      await euRetailCountries.forEach((country, index) => {
        assertCountryCounters(this, country, euRetailCountryCounts[index]);
        // Reset counters after assertion
        this.complianceService.setEURetailInvestorsCount(country, 0);
        euRetailCountries = [];
        euRetailCountryCounts = [];
      });
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
      await assertCounters(this);

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

      // Reset balance
      const partition1 = await this.token.partitionOf(investorWallet1, 0);
      const partition2 = await this.token.partitionOf(investorWallet2, 0);

      await this.token.burnByPartition(investorWallet1, 500, '', partition1);
      await this.token.burnByPartition(investorWallet2, 500, '', partition2);

      // Reset counters
      await euRetailCountries.forEach((country, index) => {
        this.complianceService.setEURetailInvestorsCount(country, 0);
        euRetailCountries = [];
        euRetailCountryCounts = [];
      });
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
