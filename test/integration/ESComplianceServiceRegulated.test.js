const assertRevert = require('../utils/assertRevert');
const utils = require('../utils');
const services = require('../../utils/globals').services;
const EternalStorage = artifacts.require('DSEternalStorageVersioned');
const ESWalletManager = artifacts.require('ESWalletManagerVersioned');
const ESTrustService = artifacts.require('ESTrustServiceVersioned');
const ESLockManager = artifacts.require('ESLockManagerVersioned');
const DSToken = artifacts.require('DSTokenVersioned');
const ESComplianceServiceRegulated = artifacts.require(
  'ESComplianceServiceRegulatedVersioned'
);
const ESRegistryService = artifacts.require('ESRegistryServiceVersioned');
const ESComplianceConfigurationService = artifacts.require(
  'ESComplianceConfigurationServiceVersioned'
);

let latestTime = require('../utils/latestTime');
let increaseTime = require('../utils/increaseTime').increaseTime;

const duration = {
  seconds: function(val) {
    return val;
  },
  minutes: function(val) {
    return val * this.seconds(60);
  },
  hours: function(val) {
    return val * this.minutes(60);
  },
  days: function(val) {
    return val * this.hours(24);
  },
  weeks: function(val) {
    return val * this.days(7);
  },
  years: function(val) {
    return val * this.days(365);
  },
};

const Proxy = artifacts.require('ProxyVersioned');
const TRUST_SERVICE = 1;
const DS_TOKEN = 2;
const REGISTRY_SERVICE = 4;
const COMPLIANCE_SERVICE = 8;
const WALLET_MANAGER = 32;
const LOCK_MANAGER = 64;
const COMPLIANCE_CONFIGURATION_SERVICE = 256;

const NONE = 0;
const ISSUER = 2;
const EXCHANGE = 4;

const ownerId = 'owner';
const walletID = '1';
const walletID2 = '2';

contract('ESComplianceServiceRegulated', function([
  owner,
  wallet,
  wallet1,
  issuerAccount,
  issuerWallet,
  exchangeAccount,
  exchangeWallet,
  noneAccount,
  noneWallet,
  platformWallet,
]) {
  beforeEach(async function() {
    this.storage = await EternalStorage.new();
    this.trustService = await ESTrustService.new(
      this.storage.address,
      'DSTokenTestTrustManager'
    );
    this.complianceService = await ESComplianceServiceRegulated.new(
      this.storage.address,
      'DSTokenTestComplianceManager'
    );
    this.complianceConfiguration = await ESComplianceConfigurationService.new(
      this.storage.address,
      'DSTokenTestComplianceConfiguration'
    );
    this.walletManager = await ESWalletManager.new(
      this.storage.address,
      'DSTokenTestWalletManager'
    );
    this.lockManager = await ESLockManager.new(
      this.storage.address,
      'DSTokenTestLockManager'
    );
    this.tokenImpl = await DSToken.new();
    this.proxy = await Proxy.new();
    this.registryService = await ESRegistryService.new(
      this.storage.address,
      'DSTokenTestRegistryService'
    );
    await this.proxy.setTarget(this.tokenImpl.address);
    this.token = await DSToken.at(this.proxy.address);
    await this.token.initialize(
      'DSTokenMock',
      'DST',
      18,
      this.storage.address,
      'DSTokenMock'
    );

    await utils.addWriteRoles(this.storage, [
      this.trustService.address,
      this.complianceService.address,
      this.walletManager.address,
      this.lockManager.address,
      this.registryService.address,
      this.token.address,
      this.complianceConfiguration.address,
    ]);

    await this.trustService.initialize();

    await utils.setServicesDependencies(
      this.registryService,
      [
        services.TRUST_SERVICE,
        services.WALLET_MANAGER,
        services.DS_TOKEN,
        services.COMPLIANCE_SERVICE,
        services.LOCK_MANAGER,
      ],
      [
        this.trustService.address,
        this.walletManager.address,
        this.token.address,
        this.complianceService.address,
        this.lockManager.address,
      ]
    );

    await utils.setServicesDependencies(
      this.complianceService,
      [
        services.TRUST_SERVICE,
        services.WALLET_MANAGER,
        services.LOCK_MANAGER,
        services.COMPLIANCE_CONFIGURATION_SERVICE,
        services.REGISTRY_SERVICE,
        services.DS_TOKEN,
      ],
      [
        this.trustService.address,
        this.walletManager.address,
        this.lockManager.address,
        this.complianceConfiguration.address,
        this.registryService.address,
        this.token.address,
      ]
    );

    await utils.setServicesDependencies(
      this.walletManager,
      [
        services.TRUST_SERVICE,
        services.REGISTRY_SERVICE,
        services.COMPLIANCE_SERVICE,
        services.DS_TOKEN,
      ],
      [
        this.trustService.address,
        this.registryService.address,
        this.complianceService.address,
        this.token.address,
      ]
    );

    await utils.setServicesDependencies(
      this.lockManager,
      [
        services.REGISTRY_SERVICE,
        services.COMPLIANCE_SERVICE,
        services.DS_TOKEN,
        services.TRUST_SERVICE,
      ],
      [
        this.registryService.address,
        this.complianceService.address,
        this.token.address,
        this.trustService.address,
      ]
    );

    await utils.setServicesDependencies(
      this.complianceConfiguration,
      [services.TRUST_SERVICE],
      [this.trustService.address]
    );

    await utils.setServicesDependencies(
      this.token,
      [
        services.TRUST_SERVICE,
        services.COMPLIANCE_SERVICE,
        services.WALLET_MANAGER,
        services.LOCK_MANAGER,
        services.REGISTRY_SERVICE,
      ],
      [
        this.trustService.address,
        this.complianceService.address,
        this.walletManager.address,
        this.lockManager.address,
        this.registryService.address,
      ]
    );

    await this.trustService.setRole(issuerAccount, ISSUER);
    await this.complianceConfiguration.setCountryCompliance('US', 1);
    await this.complianceConfiguration.setCountryCompliance('EU', 2);
    await this.complianceConfiguration.setAll(
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 150, duration.years(1)],
      [true, false]
    );
  });

  describe('Validate issuance(recordIssuance):', function() {
    it('Should revert due to not token call', async function() {
      await this.token.setCap(1000);
      await assertRevert(
        this.complianceService.validateIssuance(wallet, 100, await latestTime())
      );
    });

    it('Should issue tokens', async function() {
      await this.registryService.registerInvestor(walletID, 'wallet');
      await this.registryService.addWallet(wallet, walletID);
      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100);
      assert.equal(await this.token.balanceOf(wallet), 100);
    });
  });

  describe('Validate(recordTransfer)', function() {
    it('Should revert due to Wallet Not In Registry Service', async function() {
      await this.registryService.registerInvestor(walletID, 'wallet');
      await this.registryService.addWallet(wallet, walletID);
      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100);
      assert.equal(await this.token.balanceOf(wallet), 100);
      await assertRevert(this.token.transfer(noneAccount, 100, {from: wallet}));
    });

    it('Should revert due to Wallet has not enough tokens', async function() {
      await this.registryService.registerInvestor(walletID, walletID);
      await this.registryService.addWallet(wallet, walletID);
      assert.equal(await this.token.balanceOf(wallet), 0);
      await assertRevert(this.token.transfer(wallet, 100, {from: wallet}));
    });

    it('Pre transfer check with tokens locked', async function() {
      await this.registryService.registerInvestor(walletID, walletID);
      await this.registryService.addWallet(wallet, walletID);
      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100);
      await this.lockManager.addManualLockRecord(
        wallet,
        95,
        'Test',
        (await latestTime()) + 1000
      );
      await assertRevert(this.token.transfer(owner, 100, {from: wallet}));
    });

    it('Should decrease total investors value when transfer tokens', async function() {
      assert.equal(
        (await this.complianceService.getTotalInvestorsCount()).toNumber(),
        0
      );
      await this.registryService.registerInvestor(walletID, 'wallet');
      await this.registryService.registerInvestor(walletID2, 'noneAccount');
      await this.registryService.addWallet(wallet, walletID);
      await this.registryService.addWallet(noneAccount, walletID2);
      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100, {gas: 2e6});
      await this.token.issueTokens(noneAccount, 100, {gas: 2e6});
      assert.equal(await this.registryService.getInvestor(wallet), walletID);
      assert.equal(
        await this.registryService.getInvestor(noneAccount),
        walletID2
      );
      assert.equal(
        (await this.complianceService.getTotalInvestorsCount()).toNumber(),
        2
      );

      assert.equal(await this.token.balanceOf(wallet), 100);
      await this.token.transfer(noneAccount, 100, {from: wallet});
      assert.equal(await this.token.balanceOf(wallet), 0);

      assert.equal(
        (await this.complianceService.getTotalInvestorsCount()).toNumber(),
        1
      );
    });

    it('Should increase total investors value when transfer tokens', async function() {
      assert.equal(
        (await this.complianceService.getTotalInvestorsCount()).toNumber(),
        0
      );
      await this.registryService.registerInvestor(walletID, 'wallet');
      await this.registryService.addWallet(wallet, walletID);
      await this.registryService.registerInvestor(walletID2, 'noneAccount');
      await this.registryService.addWallet(noneAccount, walletID2);
      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100, {gas: 4e6});
      assert.equal(await this.registryService.getInvestor(wallet), walletID);
      assert.equal(
        await this.registryService.getInvestor(noneAccount),
        walletID2
      );
      assert.equal(await this.token.balanceOf(wallet), 100);
      assert.equal(
        (await this.complianceService.getTotalInvestorsCount()).toNumber(),
        1
      );
      await this.token.transfer(noneAccount, 50, {from: wallet});
      assert.equal(await this.token.balanceOf(wallet), 50);
      assert.equal(await this.token.balanceOf(noneAccount), 50);
      assert.equal(
        (await this.complianceService.getTotalInvestorsCount()).toNumber(),
        2
      );
    });

    it('Should not be able to transfer tokens because of 1 year lock for US investors', async function() {
      await this.registryService.registerInvestor(walletID, 'wallet');
      await this.registryService.registerInvestor(walletID2, ownerId);
      await this.registryService.setCountry(walletID, 'US');
      await this.registryService.setCountry(walletID2, 'US');
      await this.registryService.addWallet(wallet, walletID);
      await this.registryService.addWallet(owner, walletID2);
      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100);
      assert.equal(await this.token.balanceOf(wallet), 100);
      await assertRevert(
        this.token.transfer(owner, 100, {from: wallet, gas: 5e6})
      );
    });

    it('Should not be able to transfer tokens because of 1 year lock for US investors', async function() {
      await this.registryService.registerInvestor(walletID, 'wallet');
      await this.registryService.registerInvestor(walletID2, ownerId);
      await this.registryService.setCountry(walletID, 'EU');
      await this.registryService.setCountry(walletID2, 'US');
      await this.registryService.addWallet(wallet, walletID);
      await this.registryService.addWallet(owner, walletID2);
      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100);
      assert.equal(await this.token.balanceOf(wallet), 100);
      await assertRevert(
        this.token.transfer(owner, 100, {from: wallet, gas: 5e6})
      );
    });

    it('Should not be able to transfer tokens due to full transfer enabled', async function() {
      await this.registryService.registerInvestor(walletID, 'wallet');
      await this.registryService.registerInvestor(walletID2, ownerId);
      await this.registryService.setCountry(walletID, 'US');
      await this.registryService.setCountry(walletID2, 'US');
      await this.registryService.addWallet(wallet, walletID);
      await this.registryService.addWallet(owner, walletID2);
      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100);
      assert.equal(await this.token.balanceOf(wallet), 100);
      await increaseTime(duration.days(370));
      await assertRevert(
        this.token.transfer(owner, 50, {from: wallet, gas: 5e6})
      );
    });

    it('Should be able to transfer tokens before 1 year for platform account', async function() {
      await this.registryService.registerInvestor(walletID, 'wallet');
      await this.registryService.registerInvestor(walletID2, ownerId);
      await this.registryService.setCountry(walletID, 'US');
      await this.registryService.setCountry(walletID2, 'US');
      await this.registryService.addWallet(wallet, walletID);
      await this.registryService.addWallet(owner, walletID2);
      await this.walletManager.addPlatformWallet(platformWallet);
      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100);
      assert.equal(await this.token.balanceOf(wallet), 100);
      await this.token.transfer(platformWallet, 100, {
        from: wallet,
        gas: 5e6,
      });
    });

    it('Should prevent chinese investors', async function() {
      await this.complianceConfiguration.setCountryCompliance('CH', 4);
      await this.registryService.registerInvestor(walletID, 'wallet');
      await this.registryService.registerInvestor(walletID2, 'wallet1');
      await this.registryService.setCountry(walletID, 'US');
      await this.registryService.setCountry(walletID2, 'CH');
      await this.registryService.addWallet(wallet, walletID);
      await this.registryService.addWallet(wallet1, walletID2);
      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100);
      assert.equal(await this.token.balanceOf(wallet), 100);
      await assertRevert(
        this.token.transfer(wallet1, 50, {from: wallet, gas: 5e6})
      );
    });

    it('Should transfer tokens', async function() {
      await this.registryService.registerInvestor(walletID, 'wallet');
      await this.registryService.registerInvestor(walletID2, ownerId);
      await this.registryService.setCountry(walletID, 'US');
      await this.registryService.setCountry(walletID2, 'US');
      await this.registryService.addWallet(wallet, walletID);
      await this.registryService.addWallet(owner, walletID2);
      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100);
      assert.equal(await this.token.balanceOf(wallet), 100);
      await increaseTime(duration.days(370));
      await this.token.transfer(owner, 100, {from: wallet, gas: 5e6});
      assert.equal(await this.token.balanceOf(wallet), 0);
    });
  });

  describe('Validate burn', function() {
    it('Should revert due to trying burn tokens for account with NONE permissions', async function() {
      await this.registryService.registerInvestor(walletID, walletID);
      await this.registryService.addWallet(wallet, walletID);
      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100);
      assert.equal(await this.token.balanceOf(wallet), 100);
      await assertRevert(this.token.burn(wallet, 100, 'Test', {from: wallet}));
    });

    it('Should decrease total investors value when burn tokens', async function() {
      await this.registryService.registerInvestor(walletID2, walletID2);
      await this.registryService.addWallet(owner, walletID2);
      await this.token.setCap(1000);
      await this.token.issueTokens(owner, 100);
      assert.equal(await this.registryService.getInvestor(owner), walletID2);
      assert.equal(await this.token.balanceOf(owner), 100);
      await this.token.burn(owner, 100, 'Test');
      assert.equal(await this.token.balanceOf(owner), 0);
    });

    it('Should burn tokens', async function() {
      await this.registryService.registerInvestor(walletID, walletID);
      await this.registryService.addWallet(wallet, walletID);
      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100);
      assert.equal(await this.token.balanceOf(wallet), 100);
      await this.token.burn(wallet, 100, 'Test');
      assert.equal(await this.token.balanceOf(wallet), 0);
    });
  });

  describe('Validate seize', function() {
    it('Should revert due to trying seize tokens for account with NONE permissions', async function() {
      await this.registryService.registerInvestor(walletID, walletID);
      await this.registryService.registerInvestor(walletID2, walletID2);
      await this.registryService.addWallet(wallet, walletID);
      await this.registryService.addWallet(owner, walletID2);
      await this.token.setCap(1000);
      await this.token.issueTokens(owner, 100);
      assert.equal(await this.token.balanceOf(owner), 100);
      const role = await this.trustService.getRole(issuerAccount);
      assert.equal(role.words[0], ISSUER);
      await assertRevert(this.token.seize(owner, wallet, 100, 'Test'));
    });

    it('Should seize tokens', async function() {
      await this.registryService.registerInvestor(walletID, walletID);
      await this.registryService.registerInvestor(walletID2, walletID2);
      await this.registryService.addWallet(issuerAccount, walletID);
      await this.registryService.addWallet(owner, walletID2);
      await this.token.setCap(1000);
      await this.token.issueTokens(owner, 100);
      assert.equal(await this.token.balanceOf(owner), 100);
      const role = await this.trustService.getRole(issuerAccount);
      assert.equal(role.words[0], ISSUER);
      // await this.token.seize(owner, issuerAccount, 100, "Test"); -> Why is not working?
    });
  });

  describe('Pre transfer check', function() {
    it('Pre transfer check with paused', async function() {
      await this.registryService.registerInvestor(ownerId, ownerId);
      await this.registryService.addWallet(owner, ownerId);
      await this.registryService.registerInvestor(walletID, walletID);
      await this.registryService.addWallet(wallet, walletID);
      await this.token.setCap(1000);
      await this.token.issueTokens(owner, 100, {gas: 2e6});
      await this.token.pause();
      const res = await this.complianceService.preTransferCheck(
        owner,
        wallet,
        10
      );
      assert.equal(10, res[0].toNumber());
      assert.equal('Token Paused', res[1]);
    });

    it('Pre transfer check with not enough tokens', async function() {
      await this.registryService.registerInvestor(ownerId, ownerId);
      await this.registryService.addWallet(owner, ownerId);
      await this.registryService.registerInvestor(walletID, ownerId);
      await this.registryService.addWallet(wallet, walletID);
      await this.token.setCap(1000);
      await this.token.issueTokens(owner, 100);
      const res = await this.complianceService.preTransferCheck(
        wallet,
        owner,
        10
      );
      assert.equal(15, res[0].toNumber());
      assert.equal('Not Enough Tokens', res[1]);
    });

    it('Pre transfer check when transfer myself', async function() {
      await this.registryService.registerInvestor(walletID, walletID);
      await this.registryService.addWallet(noneAccount, walletID);
      await this.token.setCap(1000);
      await this.token.issueTokens(noneAccount, 100);
      const res = await this.complianceService.preTransferCheck(
        noneAccount,
        noneAccount,
        10
      );
      assert.equal(0, res[0].toNumber());
      assert.equal('Valid', res[1]);
    });

    it('Should revert due to Wallet Not In Registry Service', async function() {
      await this.registryService.registerInvestor(walletID, walletID);
      await this.registryService.addWallet(noneAccount, walletID);
      await this.token.setCap(1000);
      await this.token.issueTokens(noneAccount, 100);
      const res = await this.complianceService.preTransferCheck(
        noneAccount,
        noneWallet,
        10
      );
      assert.equal(20, res[0].toNumber());
      assert.equal('Wallet not in registry Service', res[1]);
    });

    it('Pre transfer check with tokens locked', async function() {
      await this.registryService.registerInvestor(walletID, walletID);
      await this.registryService.addWallet(wallet, walletID);
      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100);
      await this.lockManager.addManualLockRecord(
        wallet,
        95,
        'Test',
        (await latestTime()) + 1000
      );
      const res = await this.complianceService.preTransferCheck(
        wallet,
        owner,
        10
      );
      assert.equal(16, res[0].toNumber());
      assert.equal('Tokens Locked', res[1]);
    });

    it('Pre transfer check with tokens locked for 1 year (For Us investors)', async function() {
      await this.registryService.registerInvestor(walletID, 'wallet');
      await this.registryService.registerInvestor(walletID2, ownerId);
      await this.registryService.setCountry(walletID, 'US');
      await this.registryService.setCountry(walletID2, 'US');
      await this.registryService.addWallet(wallet, walletID);
      await this.registryService.addWallet(owner, walletID2);
      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100);
      await this.complianceConfiguration.setCountryCompliance('US', 1);
      await this.complianceConfiguration.setCountryCompliance('EU', 2);
      assert.equal(await this.token.balanceOf(wallet), 100);
      const res = await this.complianceService.preTransferCheck(
        wallet,
        owner,
        10
      );
      assert.equal(res[0].toNumber(), 32);
      assert.equal(res[1], 'Hold-up 1y');
    });

    it('Pre transfer check for full transfer - should return code 50', async function() {
      await this.registryService.registerInvestor(walletID, 'wallet');
      await this.registryService.registerInvestor(walletID2, ownerId);
      await this.registryService.setCountry(walletID, 'US');
      await this.registryService.setCountry(walletID2, 'US');
      await this.registryService.addWallet(wallet, walletID);
      await this.registryService.addWallet(owner, walletID2);
      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100);
      await this.complianceConfiguration.setCountryCompliance('US', 1);
      await this.complianceConfiguration.setCountryCompliance('EU', 2);
      assert.equal(await this.token.balanceOf(wallet), 100);
      await increaseTime(duration.days(370));
      const res = await this.complianceService.preTransferCheck(
        wallet,
        owner,
        50
      );
      assert.equal(res[0].toNumber(), 50);
      assert.equal(res[1], 'Only Full Transfer');
    });

    it('Pre transfer check from nonUs investor to US - should return code 25', async function() {
      await this.registryService.registerInvestor(walletID, 'wallet');
      await this.registryService.registerInvestor(walletID2, ownerId);
      await this.registryService.setCountry(walletID, 'EU');
      await this.registryService.setCountry(walletID2, 'US');
      await this.registryService.addWallet(wallet, walletID);
      await this.registryService.addWallet(owner, walletID2);
      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100);
      await this.complianceConfiguration.setCountryCompliance('US', 1);
      await this.complianceConfiguration.setCountryCompliance('EU', 2);
      assert.equal(await this.token.balanceOf(wallet), 100);
      const res = await this.complianceService.preTransferCheck(
        wallet,
        owner,
        10
      );
      assert.equal(res[0].toNumber(), 25);
      assert.equal(res[1], 'Flowback');
    });

    it('Pre transfer check for platform account', async function() {
      await this.registryService.registerInvestor(walletID, 'wallet');
      await this.registryService.registerInvestor(walletID2, ownerId);
      await this.registryService.setCountry(walletID, 'US');
      await this.registryService.setCountry(walletID2, 'US');
      await this.registryService.addWallet(wallet, walletID);
      await this.registryService.addWallet(owner, walletID2);
      await this.walletManager.addPlatformWallet(platformWallet);
      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100);
      await this.complianceConfiguration.setCountryCompliance('US', 1);
      await this.complianceConfiguration.setCountryCompliance('EU', 2);
      assert.equal(await this.token.balanceOf(wallet), 100);
      const res = await this.complianceService.preTransferCheck(
        wallet,
        platformWallet,
        100
      );
      assert.equal(res[0].toNumber(), 0);
      assert.equal(res[1], 'Valid');
    });

    it('Pre transfer check when transfer ok', async function() {
      await this.registryService.registerInvestor(walletID, walletID);
      await this.registryService.registerInvestor(walletID2, walletID2);
      await this.registryService.addWallet(owner, walletID);
      await this.registryService.addWallet(wallet, walletID2);
      await this.registryService.setCountry(walletID, 'EU');
      await this.registryService.setCountry(walletID2, 'EU');
      await this.token.setCap(1000);
      await this.token.issueTokens(owner, 100);
      const res = await this.complianceService.preTransferCheck(
        owner,
        wallet,
        10
      );
      assert.equal(0, res[0].toNumber());
      assert.equal('Valid', res[1]);
    });
  });
});
