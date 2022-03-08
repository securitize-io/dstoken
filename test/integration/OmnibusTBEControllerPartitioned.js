const deployContracts = require('../utils/index').deployContracts;
const globals = require('../../utils/globals');
const fixtures = require('../fixtures');
const assertRevert = require('../utils/assertRevert');
const { setOmnibusTBEServicesDependencies, resetCounters, setCounters,
  getCountersDelta, toHex, assertCounters, assertCountryCounters, assertEvent
} =
    require('../utils/omnibus/utils');

const lockManagerType = globals.lockManagerType;
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

    it('should bulk burn tokens correctly from multiple partitions', async function () {
      const txBurnCounters = {
        totalInvestorsCount: 0,
        accreditedInvestorsCount: 0,
        usTotalInvestorsCount: 0,
        usAccreditedInvestorsCount: 0,
        jpTotalInvestorsCount: 0,
      };
      const txCounters = {
        totalInvestorsCount: 0,
        accreditedInvestorsCount: 0,
        usTotalInvestorsCount: 0,
        usAccreditedInvestorsCount: 0,
        jpTotalInvestorsCount: 0,
      };

      // WHEN
      await this.omnibusTBEController
        .bulkIssuance(100, issuanceTime, txCounters.totalInvestorsCount, txCounters.accreditedInvestorsCount,
          txCounters.usAccreditedInvestorsCount, txCounters.usTotalInvestorsCount,
          txCounters.jpTotalInvestorsCount, await toHex(euRetailCountries), euRetailCountryCounts);

      await this.omnibusTBEController
        .bulkIssuance(200, issuanceTime + 1, txCounters.totalInvestorsCount, txCounters.accreditedInvestorsCount,
          txCounters.usAccreditedInvestorsCount, txCounters.usTotalInvestorsCount,
          txCounters.jpTotalInvestorsCount, await toHex(euRetailCountries), euRetailCountryCounts);

      await this.omnibusTBEController
        .bulkIssuance(300, issuanceTime + 2, txCounters.totalInvestorsCount, txCounters.accreditedInvestorsCount,
          txCounters.usAccreditedInvestorsCount, txCounters.usTotalInvestorsCount,
          txCounters.jpTotalInvestorsCount, await toHex(euRetailCountries), euRetailCountryCounts);

      let currentBalance = await this.token.balanceOf(omnibusWallet);
      // Check resulting balance
      await assert.equal(
        currentBalance,
        600
      );

      // Check that we have 3 partitions
      let numPartitions = await this.token.partitionCountOf(omnibusWallet);
      assert.equal(numPartitions, 3, 'Not the expected 3 partitions');

      const part1 = await this.token.partitionOf(omnibusWallet, 0);
      const part2 = await this.token.partitionOf(omnibusWallet, 1);
      const part3 = await this.token.partitionOf(omnibusWallet, 2);

      // We have 100 in the first one
      let part1balance = await this.token.balanceOfByPartition(omnibusWallet, part1);
      assert.equal(part1balance, 100);
      // 200 in the second
      let part2balance = await this.token.balanceOfByPartition(omnibusWallet, part2);
      assert.equal(part2balance, 200);
      // 300 in the third
      let part3balance = await this.token.balanceOfByPartition(omnibusWallet, part3);
      assert.equal(part3balance, 300);

      // Burn 150 tokens
      await this.omnibusTBEController
        .bulkBurn(150, txBurnCounters.totalInvestorsCount, txBurnCounters.accreditedInvestorsCount,
          txBurnCounters.usAccreditedInvestorsCount, txBurnCounters.usTotalInvestorsCount,
          txBurnCounters.jpTotalInvestorsCount, [], []);

      // Check that we have 2 partitions
      numPartitions = await this.token.partitionCountOf(omnibusWallet);
      assert.equal(numPartitions, 2, 'Not the expected 2 partitions after first burn');

      // Burn the rest
      await this.omnibusTBEController
        .bulkBurn(450, txBurnCounters.totalInvestorsCount, txBurnCounters.accreditedInvestorsCount,
          txBurnCounters.usAccreditedInvestorsCount, txBurnCounters.usTotalInvestorsCount,
          txBurnCounters.jpTotalInvestorsCount, [], []);

      currentBalance = await this.token.balanceOf(omnibusWallet);
      // Check resulting balance
      await assert.equal(
        currentBalance,
        0
      );
    });

    it('should fail to burn tokens if there are not enough of them in partitions', async function () {
      const txBurnCounters = {
        totalInvestorsCount: 0,
        accreditedInvestorsCount: 0,
        usTotalInvestorsCount: 0,
        usAccreditedInvestorsCount: 0,
        jpTotalInvestorsCount: 0,
      };
      const txCounters = {
        totalInvestorsCount: 0,
        accreditedInvestorsCount: 0,
        usTotalInvestorsCount: 0,
        usAccreditedInvestorsCount: 0,
        jpTotalInvestorsCount: 0,
      };

      // WHEN
      await this.omnibusTBEController
        .bulkIssuance(100, issuanceTime, txCounters.totalInvestorsCount, txCounters.accreditedInvestorsCount,
          txCounters.usAccreditedInvestorsCount, txCounters.usTotalInvestorsCount,
          txCounters.jpTotalInvestorsCount, await toHex(euRetailCountries), euRetailCountryCounts);

      await this.omnibusTBEController
        .bulkIssuance(200, issuanceTime + 1, txCounters.totalInvestorsCount, txCounters.accreditedInvestorsCount,
          txCounters.usAccreditedInvestorsCount, txCounters.usTotalInvestorsCount,
          txCounters.jpTotalInvestorsCount, await toHex(euRetailCountries), euRetailCountryCounts);

      await this.omnibusTBEController
        .bulkIssuance(300, issuanceTime + 2, txCounters.totalInvestorsCount, txCounters.accreditedInvestorsCount,
          txCounters.usAccreditedInvestorsCount, txCounters.usTotalInvestorsCount,
          txCounters.jpTotalInvestorsCount, await toHex(euRetailCountries), euRetailCountryCounts);

      let currentBalance = await this.token.balanceOf(omnibusWallet);
      // Check resulting balance
      await assert.equal(
        currentBalance,
        600
      );

      // Check that we have 3 partitions
      let numPartitions = await this.token.partitionCountOf(omnibusWallet);
      assert.equal(numPartitions, 3, 'Not the expected 3 partitions');

      // Burn 800 tokens
      await assertRevert(this.omnibusTBEController
        .bulkBurn(800, txBurnCounters.totalInvestorsCount, txBurnCounters.accreditedInvestorsCount,
          txBurnCounters.usAccreditedInvestorsCount, txBurnCounters.usTotalInvestorsCount,
          txBurnCounters.jpTotalInvestorsCount, [], []), 'should have failed to burn more tokens than existing');

      // Check that we still have 3 partitions (reverted all actions)
      numPartitions = await this.token.partitionCountOf(omnibusWallet);
      assert.equal(numPartitions, 3, 'Not the expected 3 partitions');

      // Check that we still have 600 tokens in the TBE wallet
      currentBalance = await this.token.balanceOf(omnibusWallet);
      // Check resulting balance
      await assert.equal(
        currentBalance,
        600
      );

      // Cleanup: burn remaining tokens
      await this.omnibusTBEController
        .bulkBurn(600, txBurnCounters.totalInvestorsCount, txBurnCounters.accreditedInvestorsCount,
          txBurnCounters.usAccreditedInvestorsCount, txBurnCounters.usTotalInvestorsCount,
          txBurnCounters.jpTotalInvestorsCount, [], []);
    });

    it('should burn tokens from first partition if enough tokens present', async function () {
      const txCounters = {
        totalInvestorsCount: 0,
        accreditedInvestorsCount: 0,
        usTotalInvestorsCount: 0,
        usAccreditedInvestorsCount: 0,
        jpTotalInvestorsCount: 0,
      };

      const txBurnCounters = {
        totalInvestorsCount: 0,
        accreditedInvestorsCount: 0,
        usTotalInvestorsCount: 0,
        usAccreditedInvestorsCount: 0,
        jpTotalInvestorsCount: 0,
      };

      await this.omnibusTBEController
        .bulkIssuance(100, issuanceTime, txCounters.totalInvestorsCount, txCounters.accreditedInvestorsCount,
          txCounters.usAccreditedInvestorsCount, txCounters.usTotalInvestorsCount,
          txCounters.jpTotalInvestorsCount, await toHex(euRetailCountries), euRetailCountryCounts);

      await this.omnibusTBEController
        .bulkIssuance(200, issuanceTime + 1, txCounters.totalInvestorsCount, txCounters.accreditedInvestorsCount,
          txCounters.usAccreditedInvestorsCount, txCounters.usTotalInvestorsCount,
          txCounters.jpTotalInvestorsCount, await toHex(euRetailCountries), euRetailCountryCounts);

      await this.omnibusTBEController
        .bulkIssuance(300, issuanceTime + 2, txCounters.totalInvestorsCount, txCounters.accreditedInvestorsCount,
          txCounters.usAccreditedInvestorsCount, txCounters.usTotalInvestorsCount,
          txCounters.jpTotalInvestorsCount, await toHex(euRetailCountries), euRetailCountryCounts);

      let currentBalance = await this.token.balanceOf(omnibusWallet);
      // Check resulting balance
      await assert.equal(
        currentBalance,
        600
      );

      // Check that we have 3 partitions
      let numPartitions = await this.token.partitionCountOf(omnibusWallet);
      assert.equal(numPartitions, 3, 'Not the expected 3 partitions');

      // Burn 50 tokens
      await this.omnibusTBEController
        .bulkBurn(50, txBurnCounters.totalInvestorsCount, txBurnCounters.accreditedInvestorsCount,
          txBurnCounters.usAccreditedInvestorsCount, txBurnCounters.usTotalInvestorsCount,
          txBurnCounters.jpTotalInvestorsCount, [], []);

      // Check that we still have 3 partitions (there were enough tokens in the first one)
      numPartitions = await this.token.partitionCountOf(omnibusWallet);
      assert.equal(numPartitions, 3, 'Not the expected 3 partitions');

      // Check that we still have 550 tokens in the TBE wallet
      currentBalance = await this.token.balanceOf(omnibusWallet);
      // Check resulting balance
      await assert.equal(
        currentBalance,
        550
      );

      // Cleanup: burn remaining tokens
      await this.omnibusTBEController
        .bulkBurn(550, txBurnCounters.totalInvestorsCount, txBurnCounters.accreditedInvestorsCount,
          txBurnCounters.usAccreditedInvestorsCount, txBurnCounters.usTotalInvestorsCount,
          txBurnCounters.jpTotalInvestorsCount, [], []);
    });

    // eslint-disable-next-line max-len
    it('should burn tokens from first partition when there are exactly the same tokens as in the first one', async function () {
      const txCounters = {
        totalInvestorsCount: 0,
        accreditedInvestorsCount: 0,
        usTotalInvestorsCount: 0,
        usAccreditedInvestorsCount: 0,
        jpTotalInvestorsCount: 0,
      };

      const txBurnCounters = {
        totalInvestorsCount: 0,
        accreditedInvestorsCount: 0,
        usTotalInvestorsCount: 0,
        usAccreditedInvestorsCount: 0,
        jpTotalInvestorsCount: 0,
      };

      await this.omnibusTBEController
        .bulkIssuance(100, issuanceTime, txCounters.totalInvestorsCount, txCounters.accreditedInvestorsCount,
          txCounters.usAccreditedInvestorsCount, txCounters.usTotalInvestorsCount,
          txCounters.jpTotalInvestorsCount, await toHex(euRetailCountries), euRetailCountryCounts);

      await this.omnibusTBEController
        .bulkIssuance(200, issuanceTime + 1, txCounters.totalInvestorsCount, txCounters.accreditedInvestorsCount,
          txCounters.usAccreditedInvestorsCount, txCounters.usTotalInvestorsCount,
          txCounters.jpTotalInvestorsCount, await toHex(euRetailCountries), euRetailCountryCounts);

      await this.omnibusTBEController
        .bulkIssuance(300, issuanceTime + 2, txCounters.totalInvestorsCount, txCounters.accreditedInvestorsCount,
          txCounters.usAccreditedInvestorsCount, txCounters.usTotalInvestorsCount,
          txCounters.jpTotalInvestorsCount, await toHex(euRetailCountries), euRetailCountryCounts);

      let currentBalance = await this.token.balanceOf(omnibusWallet);
      // Check resulting balance
      await assert.equal(
        currentBalance,
        600
      );

      // Check that we have 3 partitions
      let numPartitions = await this.token.partitionCountOf(omnibusWallet);
      assert.equal(numPartitions, 3, 'Not the expected 3 partitions');

      // Burn 100 tokens
      await this.omnibusTBEController
        .bulkBurn(100, txBurnCounters.totalInvestorsCount, txBurnCounters.accreditedInvestorsCount,
          txBurnCounters.usAccreditedInvestorsCount, txBurnCounters.usTotalInvestorsCount,
          txBurnCounters.jpTotalInvestorsCount, [], []);

      // Check that we now have 2 partitions (first tone removed)
      numPartitions = await this.token.partitionCountOf(omnibusWallet);
      assert.equal(numPartitions, 2, 'Not the expected 2 partitions');

      // Check that we still have 550 tokens in the TBE wallet
      currentBalance = await this.token.balanceOf(omnibusWallet);
      // Check resulting balance
      await assert.equal(
        currentBalance,
        500
      );

      // Cleanup: burn remaining tokens
      await this.omnibusTBEController
        .bulkBurn(500, txBurnCounters.totalInvestorsCount, txBurnCounters.accreditedInvestorsCount,
          txBurnCounters.usAccreditedInvestorsCount, txBurnCounters.usTotalInvestorsCount,
          txBurnCounters.jpTotalInvestorsCount, [], []);
    });

    it('should burn tokens from multiple partitions and generate OmnibusTBEOperation event', async function () {
      const txCounters = {
        totalInvestorsCount: 0,
        accreditedInvestorsCount: 0,
        usTotalInvestorsCount: 0,
        usAccreditedInvestorsCount: 0,
        jpTotalInvestorsCount: 0,
      };

      const txBurnCounters = {
        totalInvestorsCount: 0,
        accreditedInvestorsCount: 0,
        usTotalInvestorsCount: 0,
        usAccreditedInvestorsCount: 0,
        jpTotalInvestorsCount: 0,
      };

      await this.omnibusTBEController
        .bulkIssuance(100, issuanceTime, txCounters.totalInvestorsCount, txCounters.accreditedInvestorsCount,
          txCounters.usAccreditedInvestorsCount, txCounters.usTotalInvestorsCount,
          txCounters.jpTotalInvestorsCount, await toHex(euRetailCountries), euRetailCountryCounts);

      await this.omnibusTBEController
        .bulkIssuance(200, issuanceTime + 1, txCounters.totalInvestorsCount, txCounters.accreditedInvestorsCount,
          txCounters.usAccreditedInvestorsCount, txCounters.usTotalInvestorsCount,
          txCounters.jpTotalInvestorsCount, await toHex(euRetailCountries), euRetailCountryCounts);

      await this.omnibusTBEController
        .bulkIssuance(300, issuanceTime + 2, txCounters.totalInvestorsCount, txCounters.accreditedInvestorsCount,
          txCounters.usAccreditedInvestorsCount, txCounters.usTotalInvestorsCount,
          txCounters.jpTotalInvestorsCount, await toHex(euRetailCountries), euRetailCountryCounts);

      let currentBalance = await this.token.balanceOf(omnibusWallet);
      // Check resulting balance
      await assert.equal(
        currentBalance,
        600
      );

      // Check that we have 3 partitions
      let numPartitions = await this.token.partitionCountOf(omnibusWallet);
      assert.equal(numPartitions, 3, 'Not the expected 3 partitions');

      // Burn 100 tokens
      await this.omnibusTBEController
        .bulkBurn(500, txBurnCounters.totalInvestorsCount, txBurnCounters.accreditedInvestorsCount,
          txBurnCounters.usAccreditedInvestorsCount, txBurnCounters.usTotalInvestorsCount,
          txBurnCounters.jpTotalInvestorsCount, [], []);

      // Check that we still have 100 tokens in the TBE wallet
      currentBalance = await this.token.balanceOf(omnibusWallet);
      // Check resulting balance
      await assert.equal(
        currentBalance,
        100
      );

      await assertEvent(this.token, "OmnibusTBEOperation", {
        omnibusWallet,
        totalDelta: 0,
        accreditedDelta: 0,
        usAccreditedDelta: 0,
        usTotalDelta: 0,
        jpTotalDelta: 0,
      });

      // Cleanup: burn remaining tokens
      await this.omnibusTBEController
        .bulkBurn(100, txBurnCounters.totalInvestorsCount, txBurnCounters.accreditedInvestorsCount,
          txBurnCounters.usAccreditedInvestorsCount, txBurnCounters.usTotalInvestorsCount,
          txBurnCounters.jpTotalInvestorsCount, [], []);
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
