const deployContracts = require('../utils/index').deployContracts;
const {
  setOmnibusTBEServicesDependencies,
  getCountersDelta, toHex, assertEvent,
} =
  require('../utils/omnibus/utils');
const assertRevert = require('../utils/assertRevert');
const fixtures = require('../fixtures');
const globals = require('../../utils/globals');

const lockManagerType = globals.lockManagerType;
const role = globals.roles;
const compliance = globals.complianceType;

const investorId = fixtures.InvestorId;

let euRetailCountries = [];
let euRetailCountryCounts = [];
const issuanceTime = 15495894;

contract('OmnibusTBEControllerWhitelisted', ([
  omnibusWallet,
  investorWallet1,
  investorWallet2,
]) => {
  before(async function () {
    await deployContracts(
      this,
      artifacts,
      compliance.WHITELIST,
      lockManagerType.INVESTOR,
      undefined,
      false,
      omnibusWallet,
    );
    await setOmnibusTBEServicesDependencies(this);

    await this.registryService.registerInvestor(
      investorId.GENERAL_INVESTOR_ID_1,
      investorId.GENERAL_INVESTOR_COLLISION_HASH_2,
    );
    await this.registryService.addWallet(
      investorWallet1,
      investorId.GENERAL_INVESTOR_ID_1,
    );
    await this.registryService.registerInvestor(
      investorId.GENERAL_INVESTOR_ID_2,
      investorId.GENERAL_INVESTOR_COLLISION_HASH_2,
    );
    await this.registryService.addWallet(
      investorWallet2,
      investorId.GENERAL_INVESTOR_ID_2,
    );
  });

  beforeEach(async function () {
    const currentBalance = await this.token.balanceOf(omnibusWallet);
    if (currentBalance.toNumber() > 0) {
      await this.token.burn(omnibusWallet, currentBalance, '');
    }

    euRetailCountries = [];
    euRetailCountryCounts = [];
  });

  describe('Bulk issuance', function () {
    it('should bulk issue tokens correctly', async function () {
      // GIVEN
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

      // WHEN
      await this.omnibusTBEController
        .bulkIssuance(value, issuanceTime, txCounters.totalInvestorsCount, txCounters.accreditedInvestorsCount,
          txCounters.usAccreditedInvestorsCount, txCounters.usTotalInvestorsCount,
          txCounters.jpTotalInvestorsCount, await toHex(euRetailCountries), euRetailCountryCounts);

      // THEN
      const currentBalance = await this.token.balanceOf(omnibusWallet);
      await assert.equal(
        currentBalance,
        1000,
      );

      await assertEvent(this.token, 'OmnibusTBEOperation', {
        omnibusWallet,
        totalDelta: 1,
        accreditedDelta: 1,
        usAccreditedDelta: 0,
        usTotalDelta: 0,
        jpTotalDelta: 0,
      });
    });
    it('should bulk issue tokens correctly w/o countries array', async function () {
      // GIVEN
      await this.complianceConfiguration.setNonAccreditedInvestorsLimit(1);
      const value = 1000;
      const txCounters = {
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
          txCounters.jpTotalInvestorsCount, [], []);

      // THEN
      const currentBalance = await this.token.balanceOf(omnibusWallet);
      await assert.equal(
        currentBalance,
        1000,
      );
      await assertEvent(this.token, 'OmnibusTBEOperation', {
        omnibusWallet,
        totalDelta: 1,
        accreditedDelta: 1,
        usAccreditedDelta: 0,
        usTotalDelta: 0,
        jpTotalDelta: 0,
      });
    });

    it('should not bulk issue tokens if countries array does not match with country counters array', async function () {
      // GIVEN
      await this.complianceConfiguration.setNonAccreditedInvestorsLimit(1);
      const value = 1000;
      const txCounters = {
        totalInvestorsCount: 1,
        accreditedInvestorsCount: 1,
        usTotalInvestorsCount: 0,
        usAccreditedInvestorsCount: 0,
        jpTotalInvestorsCount: 0,
      };

      // WHEN
      euRetailCountries.push('EU');

      // THEN
      await assertRevert(this.omnibusTBEController
        .bulkIssuance(value, issuanceTime, txCounters.totalInvestorsCount, txCounters.accreditedInvestorsCount,
          txCounters.usAccreditedInvestorsCount, txCounters.usTotalInvestorsCount,
          txCounters.jpTotalInvestorsCount, await toHex(euRetailCountries), euRetailCountryCounts));
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
      const currentBalance = await this.token.balanceOf(omnibusWallet);
      await assert.equal(
        currentBalance,
        500,
      );
      await assertEvent(this.token, 'OmnibusTBEOperation', {
        omnibusWallet,
        totalDelta: 1,
        accreditedDelta: 1,
        usAccreditedDelta: 0,
        usTotalDelta: 0,
        jpTotalDelta: 0,
      });
    });
    it('should not bulk burn tokens if countries array does not match with country counters array', async function () {
      // GIVEN
      const burnValue = 1000;
      const txBurnCounters = {
        totalInvestorsCount: 1,
        accreditedInvestorsCount: 1,
        usTotalInvestorsCount: 0,
        usAccreditedInvestorsCount: 0,
        jpTotalInvestorsCount: 0,
      };

      // THEN
      await assertRevert(
        this.omnibusTBEController
          .bulkBurn(burnValue, txBurnCounters.totalInvestorsCount, txBurnCounters.accreditedInvestorsCount,
            txBurnCounters.usAccreditedInvestorsCount, txBurnCounters.usTotalInvestorsCount,
            txBurnCounters.jpTotalInvestorsCount, await toHex(euRetailCountries), []),
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
        0,
      );
      const investorWallet1CurrentBalance = await this.token.balanceOf(investorWallet1);
      assert.equal(
        investorWallet1CurrentBalance.toNumber(),
        500,
      );
      const investorWallet2CurrentBalance = await this.token.balanceOf(investorWallet2);
      assert.equal(
        investorWallet2CurrentBalance.toNumber(),
        500,
      );

      // Reset balance
      await this.token.burn(investorWallet1, 500, 'reset');
      await this.token.burn(investorWallet2, 500, 'reset');
    });
    it('should not bulk transfer tokens from omnibus to wallet if omnibus has no balance', async function () {
      // GIVEN
      const value = 1000;
      const tokenValues = ['500', '500'];
      const investorWallets = [investorWallet1, investorWallet2];
      const currentOmnibusBalance = await this.token.balanceOf(omnibusWallet);
      assert.equal(
        currentOmnibusBalance.toNumber(),
        0,
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
    it('should bulk transfer tokens without removing counters (not anymore because of partial transfers)',
      async function () {
      // GIVEN
        const value = 1000;
        const tokenValues = ['500'];
        const investorWallets = [investorWallet1];
        await this.token.issueTokens(investorWallet1, 2000);

        const txCounters = {
          totalInvestorsCount: 5,
          accreditedInvestorsCount: 5,
          usTotalInvestorsCount: 4,
          usAccreditedInvestorsCount: 1,
          jpTotalInvestorsCount: 0,
        };
        // It does not create a delta anymore because of partial issuances and transfers
        const txBurnCounters = {
          totalInvestorsCount: 0,
          accreditedInvestorsCount: 0,
          usTotalInvestorsCount: 0,
          usAccreditedInvestorsCount: 0,
          jpTotalInvestorsCount: 0,
        };

        euRetailCountries.push('ES');
        euRetailCountryCounts.push(2);

        // WHEN
        await this.omnibusTBEController
          .bulkIssuance(value, issuanceTime, txCounters.totalInvestorsCount, txCounters.accreditedInvestorsCount,
            txCounters.usAccreditedInvestorsCount, txCounters.usTotalInvestorsCount,
            txCounters.jpTotalInvestorsCount, await toHex(euRetailCountries), euRetailCountryCounts);

        // Execute withdraw (bulk transfer). Note how approval is not necessary.
        await this.omnibusTBEController
          .bulkTransfer(investorWallets, tokenValues);

        await getCountersDelta(txBurnCounters);

        // THEN
        const omnibusCurrentBalance = await this.token.balanceOf(omnibusWallet);
        assert.equal(
          omnibusCurrentBalance.toNumber(),
          500,
        );
        const investorWallet1CurrentBalance = await this.token.balanceOf(investorWallet1);
        assert.equal(
          investorWallet1CurrentBalance.toNumber(),
          2500,
        );

        // Reset Balance
        await this.token.burn(omnibusWallet, 500, 'reset');
        await this.token.burn(investorWallet1, 2500, 'reset');
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

      // WHEN
      await this.omnibusTBEController
        .adjustCounters(txCounters.totalInvestorsCount, txCounters.accreditedInvestorsCount,
          txCounters.usAccreditedInvestorsCount, txCounters.usTotalInvestorsCount,
          txCounters.jpTotalInvestorsCount, [], []);
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

      // WHEN
      await this.omnibusTBEController
        .bulkIssuance(value, issuanceTime, txCounters.totalInvestorsCount, txCounters.accreditedInvestorsCount,
          txCounters.usAccreditedInvestorsCount, txCounters.usTotalInvestorsCount,
          txCounters.jpTotalInvestorsCount, await toHex(euRetailCountries), euRetailCountryCounts);
      await assertEvent(this.token, 'OmnibusTBEOperation', {
        omnibusWallet,
        totalDelta: 6,
        accreditedDelta: 5,
        usAccreditedDelta: 1,
        usTotalDelta: 4,
        jpTotalDelta: 0,
      });

      await this.omnibusTBEController
        .adjustCounters(negativeCounters.totalInvestorsCount, negativeCounters.accreditedInvestorsCount,
          negativeCounters.usAccreditedInvestorsCount, negativeCounters.usTotalInvestorsCount,
          negativeCounters.jpTotalInvestorsCount, [], []);

      await getCountersDelta(negativeCounters);
    });
    it('should not adjust counters if countries array does not match with country counters array', async function () {
      const negativeCounters = {
        totalInvestorsCount: -2,
        accreditedInvestorsCount: -2,
        usTotalInvestorsCount: -2,
        usAccreditedInvestorsCount: -2,
        jpTotalInvestorsCount: 0,
      };
      euRetailCountries.push('ES');
      await assertRevert(this.omnibusTBEController
        .adjustCounters(negativeCounters.totalInvestorsCount, negativeCounters.accreditedInvestorsCount,
          negativeCounters.usAccreditedInvestorsCount, negativeCounters.usTotalInvestorsCount,
          negativeCounters.jpTotalInvestorsCount, await toHex(euRetailCountries), []));
    });
  });
  describe('Internal TBE Transfer', function () {
    it('should correctly reflect an internal TBE transfer', async function () {
      // GIVEN
      const value = 1000;
      const txCounters = {
        totalInvestorsCount: 2,
        accreditedInvestorsCount: 2,
        usTotalInvestorsCount: 1,
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

      // WHEN
      await this.omnibusTBEController
        .bulkIssuance(value, issuanceTime, txCounters.totalInvestorsCount, txCounters.accreditedInvestorsCount,
          txCounters.usAccreditedInvestorsCount, txCounters.usTotalInvestorsCount,
          txCounters.jpTotalInvestorsCount, await toHex(euRetailCountries), euRetailCountryCounts);
      await assertEvent(this.token, 'OmnibusTBEOperation', {
        omnibusWallet,
        totalDelta: 2,
        accreditedDelta: 2,
        usAccreditedDelta: 1,
        usTotalDelta: 1,
        jpTotalDelta: 0,
      });

      await this.omnibusTBEController
        // eslint-disable-next-line max-len
        .internalTBETransfer('this_is_externalID', negativeCounters.totalInvestorsCount, negativeCounters.accreditedInvestorsCount,
          negativeCounters.usAccreditedInvestorsCount, negativeCounters.usTotalInvestorsCount,
          negativeCounters.jpTotalInvestorsCount, [], []);

      await assertEvent(this.token, 'OmnibusTBETransfer', {
        omnibusWallet,
        externalId: 'this_is_externalID',
      });

      await getCountersDelta(negativeCounters);
    });
  });
});
