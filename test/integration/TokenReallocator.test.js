const { expectRevert } = require('@openzeppelin/test-helpers');
const latestTime = require('../utils/latestTime');
const snapshotsHelper = require('../utils/snapshots');
const deployContracts = require('../utils').deployContracts;
const complianceType = require('../../utils/globals').complianceType;
const lockManagerType = require('../../utils/globals').lockManagerType;
const investorId = require('../fixtures').InvestorId;
const roles = require('../../utils/globals').roles;

contract('TokenReallocator', function ([
  owner,
  wallet,
  issuerWallet,
  exchangeWallet,
  newWallet,
]) {
  describe('Token Reallocator tests', function () {
    before(async function () {
      await deployContracts(
        this,
        artifacts,
        complianceType.NORMAL,
        lockManagerType.INVESTOR,
        undefined,
        true,
        exchangeWallet,
      );
      await this.trustService.setRole(this.reallocator.address, roles.ISSUER);
      await this.trustService.setRole(issuerWallet, roles.ISSUER);
    });

    beforeEach(async function () {
      snapshot = await snapshotsHelper.takeSnapshot();
      snapshotId = snapshot.result;
    });

    afterEach(async function () {
      await snapshotsHelper.revertToSnapshot(snapshotId);
    });

    it('Should register a wallet and reallocate tokens - happy path', async function () {
      // Fund the Omnibus TBE wallet
      await this.omnibusTBEController.bulkIssuance(500, 1, 0, 0, 0, 0, 0,
        [], []);
      await this.reallocator.reallocateTokens(investorId.GENERAL_INVESTOR_ID_1,
        wallet, investorId.GENERAL_INVESTOR_ID_1,
        'US', [1, 2, 4], [1, 1, 1], [1, 1, 1], 200, false);

      const tbeWallet = await this.omnibusTBEController.getOmnibusWallet.call();
      assert.equal(await this.token.balanceOf.call(wallet), 200);
      assert.equal(await this.token.balanceOf.call(tbeWallet), 300);

      const country = await this.registryService.getCountry.call(investorId.GENERAL_INVESTOR_ID_1);
      assert.equal(country, 'US');
      assert.equal(await this.lockManager.isInvestorLocked.call(investorId.GENERAL_INVESTOR_ID_1), false);
    });

    it('Should NOT allow to reallocate tokens to a non-issuer or above wallet', async function () {
      // Fund the Omnibus TBE wallet
      await this.omnibusTBEController.bulkIssuance(500, 1, 0, 0, 0, 0, 0,
        [], []);
      await expectRevert.unspecified(this.reallocator.reallocateTokens(investorId.GENERAL_INVESTOR_ID_1,
        wallet, investorId.GENERAL_INVESTOR_ID_1,
        'US', [1, 2, 4], [1, 1, 1], [1, 1, 1], 200, false, { from: exchangeWallet }));
    });

    it('Should allow to reallocate tokens to a non-master but issuer wallet', async function () {
      // Fund the Omnibus TBE wallet
      await this.omnibusTBEController.bulkIssuance(500, 1, 0, 0, 0, 0, 0,
        [], []);
      await this.reallocator.reallocateTokens(investorId.GENERAL_INVESTOR_ID_1,
        wallet, investorId.GENERAL_INVESTOR_ID_1,
        'US', [1, 2, 4], [1, 1, 1], [1, 1, 1], 200, false, { from: issuerWallet });
    });

    it('Should NOT allow to use Reallocator if the wallet already exists in another investor',
      async function () {
        // Fund the Omnibus TBE wallet
        await this.omnibusTBEController.bulkIssuance(500, 1, 0, 0, 0, 0, 0,
          [], []);
        await this.reallocator.reallocateTokens(investorId.GENERAL_INVESTOR_ID_2,
          wallet, investorId.GENERAL_INVESTOR_ID_2,
          'US', [1, 2, 4], [1, 1, 1], [1, 1, 1], 200, false);
        await expectRevert.unspecified(this.reallocator.reallocateTokens(investorId.GENERAL_INVESTOR_ID_1,
          wallet, investorId.GENERAL_INVESTOR_ID_1,
          'US', [1, 2, 4], [1, 1, 1], [1, 1, 1], 250, false, { from: issuerWallet }));
      });

    it('Should allow to use Reallocator if the investor already exists but not the wallet',
      async function () {
      // Fund the Omnibus TBE wallet
        await this.omnibusTBEController.bulkIssuance(500, 1, 0, 0, 0, 0, 0,
          [], []);
        await this.reallocator.reallocateTokens(investorId.GENERAL_INVESTOR_ID_1,
          wallet, investorId.GENERAL_INVESTOR_ID_1,
          'US', [1, 2, 4], [1, 1, 1], [1, 1, 1], 200, false);
        await this.reallocator.reallocateTokens(investorId.GENERAL_INVESTOR_ID_1,
          newWallet, investorId.GENERAL_INVESTOR_ID_1,
          'US', [1, 2, 4], [1, 1, 1], [1, 1, 1], 250, false, { from: issuerWallet });

        assert.equal(await this.token.balanceOf.call(wallet), 200);
        assert.equal(await this.token.balanceOf.call(newWallet), 250);
        assert.equal(await this.token.balanceOfInvestor.call(investorId.GENERAL_INVESTOR_ID_1), 450);
      });

    it('Should reallocate tokens and lock the investor - isAffiliate', async function () {
      // Fund the Omnibus TBE wallet
      await this.omnibusTBEController.bulkIssuance(500, 1, 0, 0, 0, 0, 0,
        [], []);
      await this.reallocator.reallocateTokens(investorId.GENERAL_INVESTOR_ID_1,
        wallet, investorId.GENERAL_INVESTOR_ID_1,
        'US', [1, 2, 4], [1, 1, 1], [1, 1, 1], 200, true, { from: issuerWallet });

      const tbeWallet = await this.omnibusTBEController.getOmnibusWallet.call();
      assert.equal(await this.token.balanceOf.call(wallet), 200);
      assert.equal(await this.token.balanceOf.call(tbeWallet), 300);
      assert.equal(await this.lockManager.isInvestorLocked.call(investorId.GENERAL_INVESTOR_ID_1), true);
    });
  });
});
