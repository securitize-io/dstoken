const { expectRevert } = require('@openzeppelin/test-helpers');
const latestTime = require('../utils/latestTime');
const snapshotsHelper = require('../utils/snapshots');
const increaseTime = require('../utils/increaseTime').increaseTime;
const deployContracts = require('../utils').deployContracts;
const roles = require('../../utils/globals').roles;
const complianceType = require('../../utils/globals').complianceType;
const lockManagerType = require('../../utils/globals').lockManagerType;
const fixtures = require('../fixtures');
const investorId = fixtures.InvestorId;
const country = fixtures.Country;
const compliance = fixtures.Compliance;
const time = fixtures.Time;

const ownerExchangeWallet = '0x7d5355f140535DaC6B63101A77d0a7a5D1354f8F';
const newExchangeWallet = '0xF0478208FCb2559922c70642BF5ea8547CE28441';

contract('ComplianceServiceRegulated', function ([
  owner,
  wallet,
  wallet1,
  issuerWallet,
  noneWallet1,
  noneWallet2,
  platformWallet,
  omnibusWallet,
  walletForPausedToken,
  omnibusTBEWallet,
]) {
  before(async function () {
    await deployContracts(
      this,
      artifacts,
      complianceType.NORMAL,
      lockManagerType.WALLET,
      [omnibusWallet],
      false,
      omnibusTBEWallet,
    );
    await this.trustService.setRole(issuerWallet, roles.ISSUER);
    await this.walletManager.addIssuerWallet(issuerWallet);
    await this.complianceConfiguration.setCountryCompliance(
      country.USA,
      compliance.US,
    );
    await this.complianceConfiguration.setCountryCompliance(
      country.FRANCE,
      compliance.EU,
    );
    await this.complianceConfiguration.setCountryCompliance(
      country.JAPAN,
      compliance.JP,
    );
    await this.complianceConfiguration.setAll(
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 150, time.YEARS, 0, 0],
      [true, false, false, false, false],
    );
  });

  beforeEach(async function () {
    snapshot = await snapshotsHelper.takeSnapshot();
    snapshotId = snapshot.result;
  });

  afterEach(async function () {
    await snapshotsHelper.revertToSnapshot(snapshotId);
  });

  describe('Validate issuance(recordIssuance):', function () {
    it('Should revert due to not token call', async function () {
      await this.token.setCap(1000);
      await expectRevert.unspecified(
        this.complianceService.validateIssuance(wallet, 100, await latestTime()),
      );
    });

    it('Should issue tokens', async function () {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100);
      assert.equal(await this.token.balanceOf(wallet), 100);
    });

    it('Should issue tokens even when the token is paused', async function () {
      await this.token.pause();
      await this.registryService.registerInvestor(
        investorId.INVESTOR_TO_BE_ISSUED_WHEN_PAUSED,
        investorId.INVESTOR_TO_BE_ISSUED_WHEN_PAUSED,
      );
      await this.registryService.addWallet(
        walletForPausedToken,
        investorId.INVESTOR_TO_BE_ISSUED_WHEN_PAUSED,
      );
      assert.equal(await this.token.balanceOf(walletForPausedToken), 0);
      await this.token.issueTokens(walletForPausedToken, 1);
      assert.equal(await this.token.balanceOf(walletForPausedToken), 1);
      await this.token.unpause();
    });

    it('Should be able to reallocate tokens FROM omnibus wallet even when the token is paused', async function () {
      await this.token.pause();
      await this.registryService.registerInvestor(
        investorId.INVESTOR_TO_BE_ISSUED_WHEN_PAUSED,
        investorId.INVESTOR_TO_BE_ISSUED_WHEN_PAUSED,
      );
      await this.registryService.addWallet(
        walletForPausedToken,
        investorId.INVESTOR_TO_BE_ISSUED_WHEN_PAUSED,
      );
      assert.equal(await this.token.balanceOf(walletForPausedToken), 0);
      await this.token.issueTokens(omnibusTBEWallet, 100);
      assert.equal(await this.token.balanceOf(omnibusTBEWallet), 100);
      await this.omnibusTBEController
        .bulkTransfer([walletForPausedToken], ['40']);
      assert.equal(await this.token.balanceOf(walletForPausedToken), 40);
      assert.equal(await this.token.balanceOf(omnibusTBEWallet), 60);
      await this.token.unpause();
    });
  });

  describe('Validate(recordTransfer)', function () {
    it('Should revert due to Wallet Not In Registry Service when destination is special issuer wallet', async function () {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100);
      assert.equal(await this.token.balanceOf(wallet), 100);
      await expectRevert.unspecified(this.token.transfer(issuerWallet, 100, { from: wallet }));
    });

    it('Should revert due to Wallet Not In Registry Service when destination is special exchange wallet', async function () {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.trustService.setRole(ownerExchangeWallet, roles.EXCHANGE);
      await this.walletManager.addExchangeWallet(newExchangeWallet, ownerExchangeWallet);

      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100);
      assert.equal(await this.token.balanceOf(wallet), 100);
      await expectRevert.unspecified(this.token.transfer(newExchangeWallet, 100, { from: wallet }));
    });

    it('Should revert due to Wallet Not In Registry Service', async function () {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100);
      assert.equal(await this.token.balanceOf(wallet), 100);
      await expectRevert.unspecified(this.token.transfer(noneWallet1, 100, { from: wallet }));
    });

    it('Should revert due to Wallet has not enough tokens', async function () {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      assert.equal(await this.token.balanceOf(wallet), 0);
      await expectRevert.unspecified(this.token.transfer(wallet, 100, { from: wallet }));
    });

    it('Should revert due to Wallet has not enough tokens even if its Omnibus', async function () {
      assert.equal(await this.token.balanceOf(omnibusTBEWallet), 0);
      await expectRevert.unspecified(this.token.transfer(wallet, 100, { from: omnibusTBEWallet }));
    });

    it('Pre transfer check with tokens locked', async function () {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_2,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_2,
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_2,
      );
      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100);
      await this.lockManager.addManualLockRecord(
        wallet,
        95,
        'Test',
        (await latestTime()) + 1000,
      );
      await expectRevert.unspecified(this.token.transfer(owner, 100, { from: wallet }));
    });

    it('Should NOT decrease total investors value when transfer tokens', async function () {
      assert.equal(
        (await this.complianceService.getTotalInvestorsCount()).toNumber(),
        0,
      );
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_2,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_2,
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.registryService.addWallet(
        noneWallet1,
        investorId.GENERAL_INVESTOR_ID_2,
      );
      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100, { gas: 2e6 });
      await this.token.issueTokens(noneWallet1, 100, { gas: 2e6 });
      assert.equal(
        await this.registryService.getInvestor(wallet),
        investorId.GENERAL_INVESTOR_ID_1,
      );
      assert.equal(
        await this.registryService.getInvestor(noneWallet1),
        investorId.GENERAL_INVESTOR_ID_2,
      );
      assert.equal(
        (await this.complianceService.getTotalInvestorsCount()).toNumber(),
        2,
      );

      assert.equal(await this.token.balanceOf(wallet), 100);
      await this.token.transfer(noneWallet1, 100, { from: wallet });
      assert.equal(await this.token.balanceOf(wallet), 0);

      assert.equal(
        (await this.complianceService.getTotalInvestorsCount()).toNumber(),
        2,
      );
    });

    it('Should increase total investors value when transfer tokens', async function () {
      assert.equal(
        (await this.complianceService.getTotalInvestorsCount()).toNumber(),
        0,
      );
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_2,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_2,
      );
      await this.registryService.addWallet(
        noneWallet1,
        investorId.GENERAL_INVESTOR_ID_2,
      );
      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100, { gas: 4e6 });
      assert.equal(
        await this.registryService.getInvestor(wallet),
        investorId.GENERAL_INVESTOR_ID_1,
      );
      assert.equal(
        await this.registryService.getInvestor(noneWallet1),
        investorId.GENERAL_INVESTOR_ID_2,
      );
      assert.equal(await this.token.balanceOf(wallet), 100);
      assert.equal(
        (await this.complianceService.getTotalInvestorsCount()).toNumber(),
        1,
      );
      await this.token.transfer(noneWallet1, 50, { from: wallet });
      assert.equal(await this.token.balanceOf(wallet), 50);
      assert.equal(await this.token.balanceOf(noneWallet1), 50);
      assert.equal(
        (await this.complianceService.getTotalInvestorsCount()).toNumber(),
        2,
      );
    });

    it('Should not be able to transfer tokens because of 1 year lock for US investors', async function () {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_2,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_2,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_1,
        country.USA,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_2,
        country.USA,
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_2,
      );
      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100);
      assert.equal(await this.token.balanceOf(wallet), 100);
      await expectRevert.unspecified(
        this.token.transfer(owner, 100, { from: wallet, gas: 5e6 }),
      );
    });

    it('Should not be able to transfer tokens because of 1 year lock for US investors', async function () {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_2,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_2,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_1,
        country.FRANCE,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_2,
        country.USA,
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_2,
      );
      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100);
      assert.equal(await this.token.balanceOf(wallet), 100);
      await expectRevert.unspecified(
        this.token.transfer(owner, 100, { from: wallet, gas: 5e6 }),
      );
    });

    it('Should not be able to transfer tokens due to full transfer enabled', async function () {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_2,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_2,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_1,
        country.USA,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_2,
        country.USA,
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_2,
      );
      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100);
      assert.equal(await this.token.balanceOf(wallet), 100);
      await increaseTime(370 * time.DAYS);
      await expectRevert.unspecified(
        this.token.transfer(owner, 50, { from: wallet, gas: 5e6 }),
      );
    });

    it('Should be able to transfer tokens before 1 year for platform account', async function () {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_2,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_2,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_1,
        country.USA,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_2,
        country.USA,
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_2,
      );
      await this.walletManager.addPlatformWallet(platformWallet);
      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100);
      assert.equal(await this.token.balanceOf(wallet), 100);
      await this.token.transfer(platformWallet, 100, {
        from: wallet,
        gas: 5e6,
      });
    });

    it('Should prevent chinese investors', async function () {
      await this.complianceConfiguration.setCountryCompliance(
        country.CHINA,
        compliance.FORBIDDEN,
      );
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_2,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_2,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_1,
        country.USA,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_2,
        country.CHINA,
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.registryService.addWallet(
        wallet1,
        investorId.GENERAL_INVESTOR_ID_2,
      );
      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100);
      assert.equal(await this.token.balanceOf(wallet), 100);
      await expectRevert.unspecified(
        this.token.transfer(wallet1, 50, { from: wallet, gas: 5e6 }),
      );
    });

    it('Should transfer tokens', async function () {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_2,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_2,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_1,
        country.USA,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_2,
        country.USA,
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_2,
      );
      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100);
      assert.equal(await this.token.balanceOf(wallet), 100);
      await increaseTime(370 * time.DAYS);
      await this.token.transfer(owner, 100, { from: wallet, gas: 5e6 });
      assert.equal(await this.token.balanceOf(wallet), 0);
    });

    it('Should transfer tokens from investor to platform special wallet', async function () {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_1,
        country.USA,
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.walletManager.addPlatformWallet(platformWallet);

      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100);
      assert.equal(await this.token.balanceOf(wallet), 100);
      await increaseTime(370 * time.DAYS);
      await this.token.transfer(platformWallet, 100, { from: wallet, gas: 5e6 });
      assert.equal(await this.token.balanceOf(wallet), 0);
      assert.equal(await this.token.balanceOf(platformWallet), 100);
    });
  });

  describe('Validate burn', function () {
    it('Should revert due to trying burn tokens for account with NONE permissions', async function () {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100);
      assert.equal(await this.token.balanceOf(wallet), 100);
      await expectRevert.unspecified(this.token.burn(wallet, 100, 'Test', { from: wallet }));
    });

    it('Should revert due to burning omnibus wallet tokens', async function () {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.token.issueTokens(wallet, 100);
      await this.registryService.registerInvestor(
        investorId.OMNIBUS_WALLET_INVESTOR_ID_1,
        investorId.OMNIBUS_WALLET_INVESTOR_ID_1,
      );
      await this.registryService.addOmnibusWallet(
        investorId.OMNIBUS_WALLET_INVESTOR_ID_1,
        omnibusWallet,
        this.omnibusController1.address,
      );
      await this.token.issueTokens(wallet, 100);
      await this.token.transfer(omnibusWallet, 50, { from: wallet });
      await expectRevert.unspecified(this.token.burn(omnibusWallet, 40, 'Test'));
    });

    it('Should not decrease total investors value when burn tokens', async function () {
      assert.equal(
        (await this.complianceService.getTotalInvestorsCount()).toNumber(),
        0,
      );
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100, { gas: 2e6 });
      assert.equal(
        await this.registryService.getInvestor(wallet),
        investorId.GENERAL_INVESTOR_ID_1,
      );
      assert.equal(
        (await this.complianceService.getTotalInvestorsCount()).toNumber(),
        1,
      );

      assert.equal(await this.token.balanceOf(wallet), 100);
      await this.token.burn(wallet, 100, 'Test');
      assert.equal(await this.token.balanceOf(wallet), 0);

      assert.equal(
        (await this.complianceService.getTotalInvestorsCount()).toNumber(),
        1,
      );
    });

    it('Should burn tokens', async function () {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100);
      assert.equal(await this.token.balanceOf(wallet), 100);
      await this.token.burn(wallet, 100, 'Test');
      assert.equal(await this.token.balanceOf(wallet), 0);
    });
  });

  describe('Validate seize', function () {
    it('Should revert due to trying seize tokens for account with NONE permissions', async function () {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_2,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_2,
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_2,
      );
      await this.token.setCap(1000);
      await this.token.issueTokens(owner, 100);
      assert.equal(await this.token.balanceOf(owner), 100);
      const role = await this.trustService.getRole(issuerWallet);
      assert.equal(role.words[0], roles.ISSUER);
      await expectRevert.unspecified(this.token.seize(owner, wallet, 100, 'Test'));
    });

    it('Should revert due to seizing omnibus wallet tokens', async function () {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.token.issueTokens(wallet, 100);
      await this.registryService.registerInvestor(
        investorId.OMNIBUS_WALLET_INVESTOR_ID_1,
        investorId.OMNIBUS_WALLET_INVESTOR_ID_1,
      );
      await this.registryService.addOmnibusWallet(
        investorId.OMNIBUS_WALLET_INVESTOR_ID_1,
        omnibusWallet,
        this.omnibusController1.address,
      );
      await this.token.issueTokens(wallet, 100);
      await this.token.transfer(omnibusWallet, 50, { from: wallet });
      await expectRevert.unspecified(
        this.token.seize(omnibusWallet, issuerWallet, 40, 'Test'),
      );
    });

    it('Should NOT decrease total investors value when seizing tokens', async function () {
      assert.equal(
        (await this.complianceService.getTotalInvestorsCount()).toNumber(),
        0,
      );
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100);
      assert.equal(
        await this.registryService.getInvestor(wallet),
        investorId.GENERAL_INVESTOR_ID_1,
      );
      assert.equal(
        (await this.complianceService.getTotalInvestorsCount()).toNumber(),
        1,
      );

      assert.equal(await this.token.balanceOf(wallet), 100);
      await this.token.seize(wallet, issuerWallet, 100, 'Test');
      assert.equal(await this.token.balanceOf(wallet), 0);

      assert.equal(
        (await this.complianceService.getTotalInvestorsCount()).toNumber(),
        1,
      );
    });

    it('Should seize tokens', async function () {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_2,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_2,
      );
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_2,
      );
      await this.token.setCap(1000);
      await this.token.issueTokens(owner, 100);
      assert.equal(await this.token.balanceOf(owner), 100);
      const role = await this.trustService.getRole(issuerWallet);
      assert.equal(role.words[0], roles.ISSUER);
      await this.token.seize(owner, issuerWallet, 100, 'Test');
    });
  });

  describe('Pre transfer check', function () {
    it('Pre transfer check with paused', async function () {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_2,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_2,
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_2,
      );
      await this.token.setCap(1000);
      await this.token.issueTokens(owner, 100, { gas: 2e6 });
      await this.token.pause();
      const res = await this.complianceService.preTransferCheck(
        owner,
        wallet,
        10,
      );
      assert.equal(10, res[0].toNumber());
      assert.equal('Token paused', res[1]);
    });

    it('Pre transfer check with not enough tokens', async function () {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_2,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_2,
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.token.setCap(1000);
      await this.token.issueTokens(owner, 100);
      const res = await this.complianceService.preTransferCheck(
        wallet,
        owner,
        10,
      );
      assert.equal(15, res[0].toNumber());
      assert.equal('Not enough tokens', res[1]);
    });

    it('Pre transfer check when transfer myself', async function () {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.addWallet(
        noneWallet1,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.token.setCap(1000);
      await this.token.issueTokens(noneWallet1, 100);
      const res = await this.complianceService.preTransferCheck(
        noneWallet1,
        noneWallet1,
        10,
      );
      assert.equal(0, res[0].toNumber());
      assert.equal('Valid', res[1]);
    });

    it('Pre transfer check when transfer to platform special wallet', async function () {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.addWallet(
        noneWallet1,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.token.setCap(1000);
      await this.token.issueTokens(noneWallet1, 100);
      await this.walletManager.addPlatformWallet(platformWallet);
      const res = await this.complianceService.preTransferCheck(
        noneWallet1,
        platformWallet,
        10,
      );
      assert.equal(0, res[0].toNumber());
      assert.equal('Valid', res[1]);
    });

    it('Pre transfer check when transfer to issuer special wallet', async function () {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.addWallet(
        noneWallet1,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.token.setCap(1000);
      await this.token.issueTokens(noneWallet1, 100);
      const res = await this.complianceService.preTransferCheck(
        noneWallet1,
        issuerWallet,
        10,
      );
      assert.equal(20, res[0].toNumber());
      assert.equal('Wallet not in registry service', res[1]);
    });

    it('Pre transfer check when transfer to exchange special wallet', async function () {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.addWallet(
        noneWallet1,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.token.setCap(1000);
      await this.token.issueTokens(noneWallet1, 100);

      await this.trustService.setRole(ownerExchangeWallet, roles.EXCHANGE);
      await this.walletManager.addExchangeWallet(newExchangeWallet, ownerExchangeWallet);

      const res = await this.complianceService.preTransferCheck(
        noneWallet1,
        newExchangeWallet,
        10,
      );
      assert.equal(20, res[0].toNumber());
      assert.equal('Wallet not in registry service', res[1]);
    });

    it('Should revert due to Wallet Not In Registry Service for Omnibus Wallet FROM', async function () {
      await this.token.issueTokens(omnibusTBEWallet, 1);
      const res = await this.complianceService.preTransferCheck(
        omnibusTBEWallet,
        noneWallet2,
        1,
      );
      assert.equal(20, res[0].toNumber());
      assert.equal('Wallet not in registry service', res[1]);
    });

    it('Should NOT be able to reallocate tokens FROM omnibus wallet to a non-whitelisted wallet', async function () {
      assert.equal(await this.token.balanceOf(noneWallet1), 0);
      await this.token.issueTokens(omnibusTBEWallet, 100);
      assert.equal(await this.token.balanceOf(omnibusTBEWallet), 100);
      expectRevert.unspecified(this.omnibusTBEController
        .bulkTransfer([noneWallet1], ['40']));
      assert.equal(await this.token.balanceOf(noneWallet1), 0);
      assert.equal(await this.token.balanceOf(omnibusTBEWallet), 100);
    });

    it('Pre transfer check with tokens locked', async function () {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_2,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_2,
      );
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_2,
      );
      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100);
      await this.lockManager.addManualLockRecord(
        wallet,
        95,
        'Test',
        (await latestTime()) + 1000,
      );
      const res = await this.complianceService.preTransferCheck(
        wallet,
        owner,
        10,
      );
      assert.equal(16, res[0].toNumber());
      assert.equal('Tokens locked', res[1]);
    });

    it('Should not change counters when transferring TO Omnibus TBE', async function () {
      await this.complianceConfiguration.setTotalInvestorsLimit(1);
      await this.complianceConfiguration.setUSInvestorsLimit(1);
      await this.complianceConfiguration.setUSAccreditedInvestorsLimit(1);
      await this.complianceConfiguration.setCountryCompliance(
        country.USA,
        compliance.US,
      );
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_1,
        country.USA,
      );
      await this.registryService.setAttribute(
        investorId.GENERAL_INVESTOR_ID_1,
        2,
        1,
        0,
        'abcde',
      );
      let totalCounter = await this.complianceService.getTotalInvestorsCount();
      let usCount = await this.complianceService.getUSInvestorsCount();
      let usAccredited = await this.complianceService.getUSAccreditedInvestorsCount();
      assert.equal(totalCounter, 0);
      assert.equal(usCount, 0);
      assert.equal(usAccredited, 0);
      await this.token.issueTokens(owner, 100);
      totalCounter = await this.complianceService.getTotalInvestorsCount();
      usCount = await this.complianceService.getUSInvestorsCount();
      usAccredited = await this.complianceService.getUSAccreditedInvestorsCount();
      assert.equal(totalCounter, 1);
      assert.equal(usCount, 1);
      assert.equal(usAccredited, 1);
      assert.equal(await this.token.balanceOfInvestor(investorId.GENERAL_INVESTOR_ID_1), 100);
      await this.token.transfer(omnibusTBEWallet, 100, { from: owner });
      totalCounter = await this.complianceService.getTotalInvestorsCount();
      usCount = await this.complianceService.getUSInvestorsCount();
      usAccredited = await this.complianceService.getUSAccreditedInvestorsCount();
      assert.equal(totalCounter, 1);
      assert.equal(usCount, 1);
      assert.equal(usAccredited, 1);
      assert.equal(await this.token.balanceOf(owner), 0);
      assert.equal(await this.token.balanceOfInvestor(investorId.GENERAL_INVESTOR_ID_1), 0);
    });

    it('Pre transfer check with tokens locked for 1 year (For Us investors)', async function () {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_2,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_2,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_1,
        country.USA,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_2,
        country.USA,
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_2,
      );
      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100);
      await this.complianceConfiguration.setCountryCompliance(
        country.USA,
        compliance.US,
      );
      await this.complianceConfiguration.setCountryCompliance(
        country.FRANCE,
        compliance.EU,
      );
      assert.equal(await this.token.balanceOf(wallet), 100);
      const res = await this.complianceService.preTransferCheck(
        wallet,
        owner,
        10,
      );
      assert.equal(res[0].toNumber(), 32);
      assert.equal(res[1], 'Hold-up 1y');
    });

    it('Pre transfer check with force accredited', async function () {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_2,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_2,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_1,
        country.FRANCE,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_2,
        country.USA,
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_2,
      );
      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100);
      await this.complianceConfiguration.setCountryCompliance(
        country.USA,
        compliance.US,
      );
      await this.complianceConfiguration.setCountryCompliance(
        country.FRANCE,
        compliance.EU,
      );
      await this.complianceConfiguration.setBlockFlowbackEndTime(1);
      await this.complianceConfiguration.setForceAccredited(true);

      assert.equal(await this.token.balanceOf(wallet), 100);
      const res = await this.complianceService.preTransferCheck(
        wallet,
        owner,
        10,
      );
      assert.equal(res[0].toNumber(), 61);
      assert.equal(res[1], 'Only accredited');
    });

    it('Pre transfer check with US force accredited', async function () {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_2,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_2,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_1,
        country.FRANCE,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_2,
        country.USA,
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_2,
      );
      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100);
      await this.complianceConfiguration.setCountryCompliance(
        country.USA,
        compliance.US,
      );
      await this.complianceConfiguration.setCountryCompliance(
        country.FRANCE,
        compliance.EU,
      );
      await this.complianceConfiguration.setBlockFlowbackEndTime(1);
      await this.complianceConfiguration.setForceAccreditedUS(true);

      assert.equal(await this.token.balanceOf(wallet), 100);
      const res = await this.complianceService.preTransferCheck(
        wallet,
        owner,
        10,
      );
      assert.equal(res[0].toNumber(), 62);
      assert.equal(res[1], 'Only us accredited');
    });

    it('Pre transfer check for full transfer - should return code 50', async function () {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_2,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_2,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_1,
        country.USA,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_2,
        country.USA,
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_2,
      );
      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100);
      await this.complianceConfiguration.setCountryCompliance(
        country.USA,
        compliance.US,
      );
      await this.complianceConfiguration.setCountryCompliance(
        country.FRANCE,
        compliance.EU,
      );
      assert.equal(await this.token.balanceOf(wallet), 100);
      await increaseTime(370 * time.DAYS);
      const res = await this.complianceService.preTransferCheck(
        wallet,
        owner,
        50,
      );
      assert.equal(res[0].toNumber(), 50);
      assert.equal(res[1], 'Only full transfer');
    });

    it('Pre transfer check with world wide force full transfer - should return code 50', async function () {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_2,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_2,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_1,
        country.FRANCE,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_2,
        country.FRANCE,
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_2,
      );
      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100);
      await this.complianceConfiguration.setCountryCompliance(
        country.FRANCE,
        compliance.EU,
      );
      assert.equal(await this.token.balanceOf(wallet), 100);
      await increaseTime(370 * time.DAYS);
      await this.complianceConfiguration.setForceFullTransfer(false);
      await this.complianceConfiguration.setWorldWideForceFullTransfer(true);
      const res = await this.complianceService.preTransferCheck(
        wallet,
        owner,
        50,
      );
      assert.equal(res[0].toNumber(), 50);
      assert.equal(res[1], 'Only full transfer');

      // Finally
      await this.complianceConfiguration.setForceFullTransfer(true);
      await this.complianceConfiguration.setWorldWideForceFullTransfer(false);
    });

    it('Pre transfer check with world wide force full transfer', async function () {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_2,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_2,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_1,
        country.GERMANY,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_2,
        country.FRANCE,
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_2,
      );
      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100);
      await this.complianceConfiguration.setCountryCompliance(
        country.FRANCE,
        compliance.EU,
      );
      assert.equal(await this.token.balanceOf(wallet), 100);
      await increaseTime(370 * time.DAYS);
      const res = await this.complianceService.preTransferCheck(
        wallet,
        owner,
        100,
      );
      assert.equal(res[0].toNumber(), 0);
      assert.equal(res[1], 'Valid');
    });

    it('Pre transfer check from nonUs investor to US - should return code 25', async function () {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_2,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_2,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_1,
        country.FRANCE,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_2,
        country.USA,
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_2,
      );
      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100);
      await this.complianceConfiguration.setCountryCompliance(
        country.USA,
        compliance.US,
      );
      await this.complianceConfiguration.setCountryCompliance(
        country.FRANCE,
        compliance.EU,
      );
      assert.equal(await this.token.balanceOf(wallet), 100);
      const res = await this.complianceService.preTransferCheck(
        wallet,
        owner,
        10,
      );
      assert.equal(res[0].toNumber(), 25);
      assert.equal(res[1], 'Flowback');
    });

    it('Pre transfer check for platform account', async function () {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_2,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_2,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_1,
        country.USA,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_2,
        country.USA,
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_2,
      );
      await this.walletManager.addPlatformWallet(platformWallet);
      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100);
      await this.complianceConfiguration.setCountryCompliance(
        country.USA,
        compliance.US,
      );
      await this.complianceConfiguration.setCountryCompliance(
        country.FRANCE,
        compliance.EU,
      );
      assert.equal(await this.token.balanceOf(wallet), 100);
      const res = await this.complianceService.preTransferCheck(
        wallet,
        platformWallet,
        100,
      );
      assert.equal(res[0].toNumber(), 0);
      assert.equal(res[1], 'Valid');
    });

    it('should not transfer tokens to an investor if japan investor limit is reached', async function () {
      await this.complianceConfiguration.setJPInvestorsLimit(1);
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_1,
        country.JAPAN,
      );
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_2,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_2,
      );
      await this.registryService.addWallet(
        wallet1,
        investorId.GENERAL_INVESTOR_ID_2,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_2,
        country.JAPAN,
      );
      await this.token.issueTokens(owner, 100);
      const res = await this.complianceService.preTransferCheck(
        owner,
        wallet1,
        10,
      );
      assert.equal(res[0].toNumber(), 40);
      assert.equal(res[1], 'Max investors in category');
    });

    it('Pre transfer check when transfer ok', async function () {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_2,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_2,
      );
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_2,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_1,
        country.FRANCE,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_2,
        country.FRANCE,
      );
      await this.complianceConfiguration.setForceAccreditedUS(true); // Should still pass
      await this.token.setCap(1000);
      await this.token.issueTokens(owner, 100);
      const res = await this.complianceService.preTransferCheck(
        owner,
        wallet,
        10,
      );
      assert.equal(0, res[0].toNumber());
      assert.equal('Valid', res[1]);
    });

    it('should allow to full transfer funds even with minimumHoldingsPerInvestor rule set', async function () {
      await this.complianceConfiguration.setMinimumHoldingsPerInvestor(50);
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_2,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_2,
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.registryService.addWallet(
        wallet1,
        investorId.GENERAL_INVESTOR_ID_2,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_1,
        'MY',
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_2,
        'MY',
      );
      await this.token.issueTokens(wallet, 100);
      const res = await this.complianceService.preTransferCheck(
        wallet,
        wallet1,
        100,
      );
      assert.equal(0, res[0].toNumber());
      assert.equal('Valid', res[1]);
    });

    it('should NOT allow a partial transfer when below minimumHoldingsPerInvestor rule set', async function () {
      await this.complianceConfiguration.setMinimumHoldingsPerInvestor(50);
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_2,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_2,
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.registryService.addWallet(
        wallet1,
        investorId.GENERAL_INVESTOR_ID_2,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_1,
        'MY',
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_2,
        'MY',
      );
      await this.token.issueTokens(wallet, 100);
      const res = await this.complianceService.preTransferCheck(
        wallet,
        wallet1,
        99,
      );
      assert.equal(res[0].toNumber(), 51);
    });
  });

  describe('Pre issuance check', function () {
    it('should not issue tokens below the minimum holdings per investor', async function () {
      await this.complianceConfiguration.setMinimumHoldingsPerInvestor(50);
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_1,
        country.USA,
      );
      await expectRevert.unspecified(this.token.issueTokens(owner, 10));
    });

    it('should not issue tokens above the maximum holdings per investor', async function () {
      await this.complianceConfiguration.setMaximumHoldingsPerInvestor(300);
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_1,
        country.USA,
      );
      await expectRevert.unspecified(this.token.issueTokens(owner, 310));
    });

    it('should not issue tokens to a new investor if investor limit is exceeded', async function () {
      await this.complianceConfiguration.setTotalInvestorsLimit(1);
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_1,
        country.USA,
      );
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_2,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_2,
      );
      await this.registryService.addWallet(
        wallet1,
        investorId.GENERAL_INVESTOR_ID_2,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_2,
        country.USA,
      );
      await this.token.issueTokens(owner, 100);
      await expectRevert.unspecified(this.token.issueTokens(wallet1, 100));
    });

    it('should transfer from Omnibus even if investor limit is exceeded', async function () {
      await this.complianceConfiguration.setTotalInvestorsLimit(1);
      await this.complianceConfiguration.setUSInvestorsLimit(1);
      await this.complianceConfiguration.setUSAccreditedInvestorsLimit(1);
      await this.complianceConfiguration.setCountryCompliance(
        country.USA,
        compliance.US,
      );
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_1,
        country.USA,
      );
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_2,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_2,
      );
      await this.registryService.addWallet(
        wallet1,
        investorId.GENERAL_INVESTOR_ID_2,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_2,
        country.USA,
      );
      await this.registryService.setAttribute(
        investorId.GENERAL_INVESTOR_ID_1,
        2,
        1,
        0,
        'abcde',
      );
      await this.registryService.setAttribute(
        investorId.GENERAL_INVESTOR_ID_2,
        2,
        1,
        0,
        'abcdef',
      );
      await this.token.issueTokens(owner, 100);
      await this.token.issueTokens(omnibusTBEWallet, 100);
      const investorWallets = [wallet1];
      const tokenValues = ['40'];
      await this.omnibusTBEController
        .bulkTransfer(investorWallets, tokenValues);
    });

    it('should not issue tokens to a new investor if japan investor limit is exceeded', async function () {
      await this.complianceConfiguration.setJPInvestorsLimit(1);
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_1,
        country.JAPAN,
      );
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_2,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_2,
      );
      await this.registryService.addWallet(
        wallet1,
        investorId.GENERAL_INVESTOR_ID_2,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_2,
        country.JAPAN,
      );
      await this.token.issueTokens(owner, 100);
      await expectRevert.unspecified(this.token.issueTokens(wallet1, 100));
    });

    it('should not issue tokens to a new investor if non accredited limit is exceeded', async function () {
      await this.complianceConfiguration.setNonAccreditedInvestorsLimit(1);
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_2,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_2,
      );
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_2,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_1,
        country.FRANCE,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_2,
        country.FRANCE,
      );
      await this.token.issueTokens(owner, 100);
      await expectRevert.unspecified(this.token.issueTokens(wallet, 100));
    });

    it('should not issue tokens to a new investor if US investors limit is exceeded', async function () {
      await this.complianceConfiguration.setUSInvestorsLimit(1);
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_2,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_2,
      );
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_2,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_1,
        country.USA,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_2,
        country.USA,
      );
      await this.token.issueTokens(owner, 100);
      await expectRevert.unspecified(this.token.issueTokens(wallet, 100));
    });

    it('should not issue tokens to a new investor if US Accredited investors limit is exceeded', async function () {
      await this.complianceConfiguration.setUSAccreditedInvestorsLimit(1);
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_2,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_2,
      );
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_2,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_1,
        country.USA,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_2,
        country.USA,
      );
      await this.registryService.setAttribute(
        investorId.GENERAL_INVESTOR_ID_1,
        2,
        1,
        0,
        'abcde',
      );
      await this.registryService.setAttribute(
        investorId.GENERAL_INVESTOR_ID_2,
        2,
        1,
        0,
        'abcdef',
      );
      await this.token.issueTokens(owner, 100);
      await expectRevert.unspecified(this.token.issueTokens(wallet, 100));
    });

    it('should not issue tokens to a new investor if EU Retail limit is exceeded', async function () {
      await this.complianceConfiguration.setEURetailInvestorsLimit(0);
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_1,
        country.FRANCE,
      );
      await expectRevert.unspecified(this.token.issueTokens(owner, 100));
    });

    it('should not issue tokens to special issuer wallet', async function () {
      await expectRevert.unspecified(this.token.issueTokens(issuerWallet, 10));
    });

    it('should not issue tokens to special exchange wallet', async function () {
      await this.trustService.setRole(ownerExchangeWallet, roles.EXCHANGE);
      await this.walletManager.addExchangeWallet(newExchangeWallet, ownerExchangeWallet);
      await expectRevert.unspecified(this.token.issueTokens(newExchangeWallet, 10));
    });

    it('should allow issue tokens to special platform wallet', async function () {
      await this.walletManager.addPlatformWallet(platformWallet);
      await this.token.issueTokens(platformWallet, 10);
      assert.equal(await this.token.balanceOf(platformWallet), 10);
    });
  });

  describe('Check whitelisted', function () {
    it('should be false when address is issuer', async function () {
      const isWhitelisted = await this.complianceService.checkWhitelisted(issuerWallet);
      assert.equal(isWhitelisted, false);
    });
    it('should be true when address is exchange', async function () {
      await this.trustService.setRole(ownerExchangeWallet, roles.EXCHANGE);
      await this.walletManager.addExchangeWallet(newExchangeWallet, ownerExchangeWallet);
      const isWhitelisted = await this.complianceService.checkWhitelisted(newExchangeWallet);
      assert.equal(isWhitelisted, false);
    });
    it('should be true when address is investor', async function () {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      const isWhitelisted = await this.complianceService.checkWhitelisted(wallet);
      assert.equal(isWhitelisted, true);
    });
    it('should be true when address is platform', async function () {
      await this.walletManager.addPlatformWallet(platformWallet);
      const isWhitelisted = await this.complianceService.checkWhitelisted(platformWallet);
      assert.equal(isWhitelisted, true);
    });
  });

  describe('Check on chain cap / authorized securities', function () {
    it('should not allow to issue tokens above the max authorized securities (on chain cap)', async function () {
      await this.complianceConfiguration.setAuthorizedSecurities(10);
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_1,
        country.FRANCE,
      );
      expectRevert.unspecified(this.token.issueTokens(wallet, 11));
    });
    it('should not allow to issue tokens above the max authorized securities using totalSupply', async function () {
      await this.complianceConfiguration.setAuthorizedSecurities(100);
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_1,
        country.USA,
      );
      await this.token.issueTokens(wallet, 40);
      await this.token.issueTokens(wallet, 40);
      expectRevert.unspecified(this.token.issueTokens(wallet, 21));
    });
    it('should allow to issue tokens up to the max authorized securities', async function () {
      await this.complianceConfiguration.setAuthorizedSecurities(100);
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_1,
        country.FRANCE,
      );
      await this.token.issueTokens(wallet, 40);
      await this.token.issueTokens(wallet, 40);
      await this.token.issueTokens(wallet, 20);
    });
    it('should allow to issue any amount of tokens if the authorized securities is 0', async function () {
      await this.complianceConfiguration.setAuthorizedSecurities(0);
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1,
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1,
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_1,
        country.FRANCE,
      );
      await this.token.issueTokens(wallet, 1000);
      await this.token.issueTokens(wallet, 2000);
    });
  });
});
