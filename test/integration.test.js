/* eslint-disable comma-spacing,max-len */
const assertRevert = require('./helpers/assertRevert');
const utils = require('./utils');
const services = require('./utils/globals').services;
const DSEternalStorage = artifacts.require('DSEternalStorageVersioned');
const DSToken = artifacts.require('DSTokenVersioned');
const ESComplianceServiceNotRegulated = artifacts.require(
  'ESComplianceServiceNotRegulatedVersioned'
);
const ESComplianceServiceWhitelisted = artifacts.require(
  'ESComplianceServiceWhitelistedVersioned'
);
const ESComplianceServiceRegulated = artifacts.require(
  'ESComplianceServiceRegulatedVersioned'
);
const ESComplianceConfigurationService = artifacts.require(
  'ESComplianceConfigurationServiceVersioned'
);
const ESWalletManager = artifacts.require('ESWalletManagerVersioned');
const ESInvestorLockManager = artifacts.require(
  'ESInvestorLockManagerVersioned'
);
const ESTrustService = artifacts.require('ESTrustServiceVersioned');
const ESRegistryService = artifacts.require('ESRegistryServiceVersioned');
const ESTokenIssuer = artifacts.require('ESTokenIssuerVersioned');
const ESInformationManager = artifacts.require(
  'ESIssuanceInformationManagerVersioned'
);
const ESStandardTokenMock = artifacts.require('ESStandardTokenMockVersioned');
const Proxy = artifacts.require('ProxyVersioned');

const NONE = 0;

const MASTER = 1;
const ISSUER = 2;
const EXCHANGE = 4;

const US = 1;
const EU = 2;
const FORBIDDEN = 4;

const US_INVESTOR_ID = 'usInvestorId';
const US_INVESTOR_COLLISION_HASH = 'usInvestorCollisionHash';

const US_INVESTOR_ID_2 = 'usInvestorId2';
const US_INVESTOR_COLLISION_HASH_2 = 'usInvestorCollisionHash2';

const US_INVESTOR_ID_3 = 'usInvestorId3';
const US_INVESTOR_COLLISION_HASH_3 = 'usInvestorCollisionHash3';

const SPAIN_INVESTOR_ID = 'spainInvestorId';
const SPAIN_INVESTOR_COLLISION_HASH = 'spainInvestorCollisionHash';

const SPAIN_INVESTOR_ID_2 = 'spainInvestorId2';
const SPAIN_INVESTOR_COLLISION_HASH_2 = 'spainInvestorCollisionHash2';

const GERMANY_INVESTOR_ID = 'germanyInvestorId';
const GERMANY_INVESTOR_COLLISION_HASH = 'germanyInvestorCollisionHash';

const GERMANY_INVESTOR_ID_2 = 'germanyInvestorId2';
const GERMANY_INVESTOR_COLLISION_HASH_2 = 'germanyInvestorCollisionHash2';

const CHINA_INVESTOR_ID = 'chinaInvestorId';
const CHINA_INVESTOR_COLLISION_HASH = 'chinaInvestorCollisionHash';

const ISRAEL_INVESTOR_ID = 'israelInvestorId';
const ISRAEL_INVESTOR_COLLISION_HASH = 'israelInvestorCollisionHash';

const MINUTES = 60;
const HOURS = 60 * MINUTES;
const DAYS = 24 * HOURS;
const WEEKS = 7 * DAYS;
const YEARS = 365 * DAYS;

let latestTime = require('./utils/latestTime');
let increaseTimeTo = require('./helpers/increaseTime');

let storage;
let trustService;
let complianceService;
let complianceConfiguration;
let walletManager;
let lockManager;
let tokenImpl;
let proxy;
let registryService;
let token;
let issuer;
let informationManager;

contract('Integration', function([
  _,
  issuerWallet,
  usInvestor,
  usInvestorSecondaryWallet,
  usInvestor2,
  spainInvestor,
  germanyInvestor,
  chinaInvestor,
  israelInvestor,
  usInvestor3Wallet,
  germanyInvestor2Wallet,
  spainInvestor2Wallet,
  platformWallet,
  exchangeWallet,
]) {
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  describe('creation', async function() {
    it('should be able to deploy the contracts', async function() {
      // Setting up the environment
      storage = await DSEternalStorage.new();
      trustService = await ESTrustService.new(
        storage.address,
        'DSTokenTestTrustManager'
      );
      complianceService = await ESComplianceServiceRegulated.new(
        storage.address,
        'DSTokenTestComplianceManager'
      );
      complianceConfiguration = await ESComplianceConfigurationService.new(
        storage.address,
        'DSTokenTestComplianceConfiguration'
      );
      walletManager = await ESWalletManager.new(
        storage.address,
        'DSTokenTestWalletManager'
      );
      lockManager = await ESInvestorLockManager.new(
        storage.address,
        'DSTokenTestLockManager'
      );
      tokenImpl = await DSToken.new();
      proxy = await Proxy.new();
      informationManager = await ESInformationManager.new(
        storage.address,
        'ESInformationManager'
      );
      registryService = await ESRegistryService.new(
        storage.address,
        'DSTokenTestRegistryService'
      );
      issuer = await ESTokenIssuer.new(storage.address, 'DSTokenTestIssuer');
    });
    it('should connect the deployed contracts to each other', async function() {
      await proxy.setTarget(tokenImpl.address);
      token = DSToken.at(proxy.address);
      await token.initialize(
        'DSTokenMock',
        'DST',
        18,
        storage.address,
        'DSTokenMock'
      );

      await utils.addAdminRules(storage, [
        trustService.address,
        complianceService.address,
        walletManager.address,
        lockManager.address,
        registryService.address,
        token.address,
        complianceConfiguration.address,
        issuer.address,
        informationManager.address,
      ]);

      await trustService.initialize();

      await utils.setServicesDependencies(
        registryService,
        [
          services.TRUST_SERVICE,
          services.WALLET_MANAGER,
          services.DS_TOKEN,
          services.COMPLIANCE_SERVICE,
        ],
        [
          trustService.address,
          walletManager.address,
          token.address,
          complianceService.address,
        ]
      );

      await utils.setServicesDependencies(
        complianceService,
        [
          services.TRUST_SERVICE,
          services.WALLET_MANAGER,
          services.LOCK_MANAGER,
          services.COMPLIANCE_CONFIGURATION_SERVICE,
          services.REGISTRY_SERVICE,
          services.DS_TOKEN,
        ],
        [
          trustService.address,
          walletManager.address,
          lockManager.address,
          complianceConfiguration.address,
          registryService.address,
          token.address,
        ]
      );

      await utils.setServicesDependencies(
        complianceConfiguration,
        [services.TRUST_SERVICE],
        [trustService.address]
      );

      await utils.setServicesDependencies(
        token,
        [
          services.TRUST_SERVICE,
          services.COMPLIANCE_SERVICE,
          services.WALLET_MANAGER,
          services.LOCK_MANAGER,
          services.REGISTRY_SERVICE,
        ],
        [
          trustService.address,
          complianceService.address,
          walletManager.address,
          lockManager.address,
          registryService.address,
        ]
      );

      await utils.setServicesDependencies(
        walletManager,
        [services.TRUST_SERVICE, services.REGISTRY_SERVICE],
        [trustService.address, registryService.address]
      );

      await utils.setServicesDependencies(
        lockManager,
        [
          services.REGISTRY_SERVICE,
          services.COMPLIANCE_SERVICE,
          services.DS_TOKEN,
          services.TRUST_SERVICE,
        ],
        [
          registryService.address,
          complianceService.address,
          token.address,
          trustService.address,
        ]
      );

      await utils.setServicesDependencies(
        informationManager,
        [services.TRUST_SERVICE],
        [trustService.address]
      );

      // Configure issuer
      await utils.setServicesDependencies(
        issuer,
        [services.TRUST_SERVICE, services.DS_TOKEN, services.REGISTRY_SERVICE],
        [trustService.address, token.address, registryService.address]
      );

      await trustService.setRole(issuer.address, ISSUER);
      await complianceConfiguration.setAll(
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 150],
        [true, false]
      );
    });
    it('should get the basic details of the token correctly', async function() {
      const name = await token.name.call();
      const symbol = await token.symbol.call();
      const decimals = await token.decimals.call();
      const totalSupply = await token.totalSupply.call();

      assert.equal(name, 'DSTokenMock');
      assert.equal(symbol, 'DST');
      assert.equal(decimals, 18);
      assert.equal(totalSupply, 0);
    });
  });
  describe('issuance', function() {
    it('should setup country compliance', async function() {
      // Basic seed
      await complianceConfiguration.setCountryCompliance('USA', US);
      await complianceConfiguration.setCountryCompliance('Spain', EU);
      await complianceConfiguration.setCountryCompliance('Germany', EU);
      await complianceConfiguration.setCountryCompliance('China', FORBIDDEN);
    });
    it('should register investors via multiple calls', async function() {
      // Registering the investors and wallets
      await registryService.registerInvestor(
        US_INVESTOR_ID,
        US_INVESTOR_COLLISION_HASH
      );
      await registryService.setCountry(US_INVESTOR_ID, 'USA');
      await registryService.addWallet(usInvestor, US_INVESTOR_ID);
      await registryService.addWallet(
        usInvestorSecondaryWallet,
        US_INVESTOR_ID
      );

      await registryService.registerInvestor(
        US_INVESTOR_ID_2,
        US_INVESTOR_COLLISION_HASH_2
      );
      await registryService.setCountry(US_INVESTOR_ID_2, 'USA');
      await registryService.addWallet(usInvestor2, US_INVESTOR_ID_2);

      await registryService.registerInvestor(
        US_INVESTOR_ID_3,
        US_INVESTOR_COLLISION_HASH_3
      );
      await registryService.setCountry(US_INVESTOR_ID_3, 'USA');
      await registryService.addWallet(usInvestor3Wallet, US_INVESTOR_ID_3);

      let tx = await registryService.registerInvestor(
        SPAIN_INVESTOR_ID,
        SPAIN_INVESTOR_COLLISION_HASH
      );
      assert.equal(tx.logs[0].event, 'DSRegistryServiceInvestorAdded');
      assert.equal(tx.logs[0].args._investorId.valueOf(), SPAIN_INVESTOR_ID);
      tx = await registryService.setCountry(SPAIN_INVESTOR_ID, 'Spain');
      assert.equal(tx.logs[0].event, 'DSRegistryServiceInvestorCountryChanged');
      assert.equal(tx.logs[0].args._investorId.valueOf(), SPAIN_INVESTOR_ID);
      tx = await registryService.addWallet(spainInvestor, SPAIN_INVESTOR_ID);
      assert.equal(tx.logs[0].event, 'DSRegistryServiceWalletAdded');
      assert.equal(tx.logs[0].args._wallet.valueOf(), spainInvestor);
      assert.equal(tx.logs[0].args._investorId.valueOf(), SPAIN_INVESTOR_ID);

      await registryService.registerInvestor(
        GERMANY_INVESTOR_ID,
        GERMANY_INVESTOR_COLLISION_HASH
      );
      await registryService.setCountry(GERMANY_INVESTOR_ID, 'Germany');
      await registryService.addWallet(germanyInvestor, GERMANY_INVESTOR_ID);

      // await registryService.registerInvestor(CHINA_INVESTOR_ID, CHINA_INVESTOR_COLLISION_HASH);
      // await registryService.setCountry(CHINA_INVESTOR_ID, 'China');
      // await registryService.addWallet(chinaInvestor, CHINA_INVESTOR_ID);
      //
      // await registryService.registerInvestor(ISRAEL_INVESTOR_ID, ISRAEL_INVESTOR_COLLISION_HASH);
      // await registryService.setCountry(ISRAEL_INVESTOR_ID, 'Israel');
      // await registryService.addWallet(israelInvestor, ISRAEL_INVESTOR_ID);

      await registryService.registerInvestor(
        GERMANY_INVESTOR_ID_2,
        GERMANY_INVESTOR_COLLISION_HASH_2
      );
      await registryService.setCountry(GERMANY_INVESTOR_ID_2, 'Germany');
      await registryService.addWallet(
        germanyInvestor2Wallet,
        GERMANY_INVESTOR_ID_2
      );
      await registryService.setAttribute(GERMANY_INVESTOR_ID, 4, 1, 0, 'abcde');

      // getRegistryService().getAttributeValue(getRegistryService().getInvestor(_wallet), getRegistryService().QUALIFIED()) != getRegistryService().APPROVED()
    });
    it('should register investors via the token issuer', async function() {
      await issuer.issueTokens(
        ISRAEL_INVESTOR_ID,
        israelInvestor,
        [777, latestTime()],
        '',
        [],
        [],
        ISRAEL_INVESTOR_COLLISION_HASH,
        'Israel',
        [1, 0, 0],
        [0, 0, 0]
      );
    });
    it('should be able to issue and have a correct number of eu and us investors', async function() {
      let usInvestorsCount = await complianceService.getUSInvestorsCount.call();
      assert.equal(usInvestorsCount, 0);
      let tx = await token.issueTokensCustom(
        usInvestor,
        1000,
        latestTime(),
        0,
        '',
        0
      );
      assert.equal(tx.logs[0].event, 'Issue');
      assert.equal(tx.logs[0].args.to.valueOf(), usInvestor);
      assert.equal(tx.logs[0].args.value.valueOf(), 1000);
      assert.equal(tx.logs[0].args.valueLocked.valueOf(), 0);

      await token.issueTokensCustom(
        usInvestor2,
        500,
        latestTime() - 80 * WEEKS,
        250,
        'TEST',
        latestTime() + 1 * WEEKS
      );
      await token.issueTokensCustom(
        usInvestor3Wallet,
        2500,
        latestTime() - 80 * WEEKS,
        0,
        '',
        0
      );
      usInvestorsCount = await complianceService.getUSInvestorsCount.call();
      assert.equal(usInvestorsCount, 3);
      let euRetailInvestorsCount = await complianceService.getEURetailInvestorsCount.call(
        'Germany'
      );
      assert.equal(euRetailInvestorsCount, 0);
      await token.issueTokensCustom(
        germanyInvestor2Wallet,
        500,
        latestTime(),
        0,
        '',
        0
      );
      euRetailInvestorsCount = await complianceService.getEURetailInvestorsCount.call(
        'Germany'
      );
      assert.equal(euRetailInvestorsCount, 1);
      tx = await token.issueTokensCustom(
        germanyInvestor,
        1000,
        latestTime(),
        250,
        'TEST',
        latestTime() + 1 * WEEKS
      );
      assert.equal(tx.logs[0].event, 'Issue');
      assert.equal(tx.logs[0].args.to.valueOf(), germanyInvestor);
      assert.equal(tx.logs[0].args.value.valueOf(), 1000);
      assert.equal(tx.logs[0].args.valueLocked.valueOf(), 250);
      euRetailInvestorsCount = await complianceService.getEURetailInvestorsCount.call(
        'Germany'
      );
      assert.equal(euRetailInvestorsCount, 1);
    });
  });
  describe('transfers', function() {
    it('should allow some transfers and update the number of eu and us investors', async function() {
      const balanceBeforeTransfer = await token.balanceOf(usInvestor);
      assert.equal(balanceBeforeTransfer, 1000);

      const t1 = await complianceService.getComplianceTransferableTokens(
        usInvestor,
        latestTime(),
        latestTime() + 52 * WEEKS
      );
      assert.equal(t1, 0); // should be 0 because of yearly lock
      const t2 = await lockManager.getTransferableTokens(
        usInvestor2,
        latestTime()
      );
      assert.equal(t2.valueOf(), 250); // 250 tokens are locked manually

      const t3 = await complianceService.getComplianceTransferableTokens(
        usInvestor2,
        latestTime(),
        1 * YEARS
      );
      assert.equal(t3.valueOf(), 250); // should be 250 because the accredited lock has passed, and 250 are locked manually

      let res = await complianceService.preTransferCheck(
        usInvestor,
        usInvestor2,
        250
      );
      assert.equal(res[0].valueOf(), 32); // Hold up 1y
      res = await complianceService.preTransferCheck(
        usInvestor2,
        usInvestor,
        500
      );
      assert.equal(res[0].valueOf(), 16); // Tokens manually locked
      res = await complianceService.preTransferCheck(
        usInvestor2,
        usInvestor,
        250
      );
      assert.equal(res[0].valueOf(), 50); // Only full transfer
      res = await complianceService.preTransferCheck(
        usInvestor3Wallet,
        usInvestor2,
        2500
      );
      assert.equal(res[0].valueOf(), 0); // Valid

      // Allow moving between investor's own wallets
      res = await token.balanceOfInvestor(US_INVESTOR_ID);
      assert.equal(res.valueOf(), 1000); // 1000 tokens issued
      res = await complianceService.preTransferCheck(
        usInvestor,
        usInvestorSecondaryWallet,
        250
      );
      assert.equal(res[0].valueOf(), 0); // Valid
      let tx = await token.transfer(usInvestorSecondaryWallet, 250, {
        from: usInvestor,
      });
      res = await token.balanceOfInvestor(US_INVESTOR_ID);
      assert.equal(res.valueOf(), 1000); // Should still be 1000

      tx = await token.transfer(usInvestor2, 2500, {from: usInvestor3Wallet});
      assert.equal(tx.logs[0].event, 'Transfer');
      assert.equal(tx.logs[0].args.from.valueOf(), usInvestor3Wallet);
      assert.equal(tx.logs[0].args.to.valueOf(), usInvestor2);
      assert.equal(tx.logs[0].args.value.valueOf(), 2500);
      let usInvestorsCount = await complianceService.getUSInvestorsCount.call();
      assert.equal(usInvestorsCount, 2); // should now be 2, because 3 is not holding tokens any more

      res = await complianceService.preTransferCheck(
        germanyInvestor2Wallet,
        usInvestor,
        500
      );
      assert.equal(res[0].valueOf(), 25); // No flowback

      res = await complianceService.preTransferCheck(
        germanyInvestor2Wallet,
        germanyInvestor,
        500
      );
      assert.equal(res[0].valueOf(), 0); // Valid
      tx = await token.transfer(germanyInvestor, 500, {
        from: germanyInvestor2Wallet,
      });
      let euRetailInvestorsCount = await complianceService.getEURetailInvestorsCount.call(
        'Germany'
      );
      assert.equal(euRetailInvestorsCount.valueOf(), 0); // We have only one investor, and he's qualified
    });
    it('Manual locks should behave correctly', async function() {
      // germany investor 1 should have 1000 + 500 - 250 transferable tokens

      let tt = await lockManager.getTransferableTokens(
        germanyInvestor,
        latestTime()
      );
      assert.equal(tt.valueOf(), 1250);

      let tx = await lockManager.addManualLockRecord(
        germanyInvestor,
        100,
        'TEST2',
        latestTime() + 8 * WEEKS
      );
      assert.equal(tx.logs[0].event, 'Locked');
      assert.equal(tx.logs[0].args.who.valueOf(), germanyInvestor);
      assert.equal(tx.logs[0].args.value.valueOf(), 100);

      tt = await lockManager.getTransferableTokens(
        germanyInvestor,
        latestTime()
      );
      assert.equal(tt.valueOf(), 1150);

      // Try to move locked tokens - should fail
      await assertRevert(
        token.transfer(germanyInvestor2Wallet, 1500, {from: germanyInvestor})
      );
      // Move forward in time
      web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        params: [2 * WEEKS],
        id: new Date().getTime(),
      });
      // Should still fail
      await assertRevert(
        token.transfer(germanyInvestor2Wallet, 1500, {from: germanyInvestor})
      );

      // Remove the manual lock
      tt = await lockManager.lockCount.call(germanyInvestor);
      assert.equal(tt.valueOf(), 2);
      tt = await lockManager.lockInfo(germanyInvestor, 1);
      assert.equal(tt[2].valueOf(), 100);

      tx = await lockManager.removeLockRecord(germanyInvestor, 1);
      assert.equal(tx.logs[0].event, 'Unlocked');
      assert.equal(tx.logs[0].args.who.valueOf(), germanyInvestor);
      assert.equal(tx.logs[0].args.value.valueOf(), 100);

      // Now it should work
      token.transfer(germanyInvestor2Wallet, 1500, {from: germanyInvestor});
    });

    it('should allow wallet iteration and investor counting', async function() {
      // Iterate through all the wallets
      let count = await token.walletCount.call();
      assert.equal(count.valueOf(), 5); // USinvestor, usinvestorSecondary,usinvestor2,IsraelInvestor, and germanyInvestor2

      count = await complianceService.getTotalInvestorsCount.call(); // USInvestor, USInvestor2, IsraelInvestor, GermanyInvestor2
      assert.equal(count.valueOf(), 4);
    });
  });
  describe('information handling', function() {
    it('should handle issuance information correctly', async function() {
      const tx = await informationManager.setComplianceInformation(
        18,
        'https://www.coinmarketcap.com'
      );
      assert.equal(
        tx.logs[0].event,
        'DSIssuanceInformationManagerComplianceInformationSet'
      );
      assert.equal(tx.logs[0].args._informationId.valueOf(), 18);
      assert.equal(tx.logs[0].args._value, 'https://www.coinmarketcap.com');

      const val = await informationManager.getComplianceInformation.call(18);
      assert.equal(val, 'https://www.coinmarketcap.com');
    });
    it('should handle investor information correctly', async function() {
      const tx = await informationManager.setInvestorInformation(
        US_INVESTOR_ID,
        17,
        'https://www.google.com'
      );
      assert.equal(
        tx.logs[0].event,
        'DSIssuanceInformationManagerInvestorInformationSet'
      );
      assert.equal(tx.logs[0].args._id.valueOf(), US_INVESTOR_ID);
      assert.equal(tx.logs[0].args._informationId.valueOf(), 17);
      assert.equal(tx.logs[0].args._hash, 'https://www.google.com');

      const val = await informationManager.getInvestorInformation.call(
        US_INVESTOR_ID,
        17
      );
      assert.equal(val, 'https://www.google.com');
    });
  });
  describe('special operations', function() {
    it('should crete correctly issuer,platform and exchange wallets', async function() {
      let tx = await walletManager.addIssuerWallet(issuerWallet);
      assert.equal(tx.logs[0].event, 'DSWalletManagerSpecialWalletAdded');
      assert.equal(tx.logs[0].args._wallet, issuerWallet);
      assert.equal(tx.logs[0].args._type, 1);

      await walletManager.addPlatformWallet(platformWallet);

      await trustService.setRole(exchangeWallet, EXCHANGE);
      await walletManager.addExchangeWallet(exchangeWallet, exchangeWallet);
    });
    it('should allow sending tokens to and from platform wallets', async function() {
      const balance = await token.balanceOfInvestor.call(US_INVESTOR_ID_2);

      await assertRevert(
        token.transfer(platformWallet, 2, {from: usInvestor2})
      ); //Only full transfers
      await token.transfer(platformWallet, balance, {from: usInvestor2});
      await token.transfer(usInvestor2, balance, {from: platformWallet});
    });
    it('should allow sending tokens to exchange wallets as long as their slots allow', async function() {
      // TODO: check this after it's fully implemented
    });
    it('should seize tokens correctly to issuer wallets', async function() {
      const tx = await token.seize(usInvestor, issuerWallet, 4, 'testing');
      assert.equal(tx.logs[0].event, 'Seize');
      assert.equal(tx.logs[0].args.from, usInvestor);
      assert.equal(tx.logs[0].args.to, issuerWallet);
      assert.equal(tx.logs[0].args.value, 4);
      assert.equal(tx.logs[0].args.reason, 'testing');

      // const res = await complianceService.preTransferCheck(issuerWallet,usInvestor,1);
      // console.log(res);

      // Should fail to send FROM the issuer wallet
      await assertRevert(token.transfer(usInvestor, 1, {from: issuerWallet}));
    });
    it('should burn tokens correctly', async function() {
      const balanceBefore = await token.balanceOf.call(issuerWallet);
      assert.equal(balanceBefore.valueOf(), 4);

      const tx = await token.burn(issuerWallet, 3, 'just checking');
      assert.equal(tx.logs[0].event, 'Burn');
      assert.equal(tx.logs[0].args.burner, issuerWallet);
      assert.equal(tx.logs[0].args.value, 3);
      assert.equal(tx.logs[0].args.reason, 'just checking');

      const balanceAfter = await token.balanceOf.call(issuerWallet);
      assert.equal(balanceAfter.valueOf(), 1);
    });
    it('should allow pausing and un-pausing the token', async function() {
      let tx = await token.pause();
      assert.equal(tx.logs[0].event, 'Pause');
      // should revert
      await assertRevert(
        token.transfer(germanyInvestor, 2, {from: germanyInvestor2Wallet})
      );
      tx = await token.unpause();
      assert.equal(tx.logs[0].event, 'Unpause');
      // now it should be ok
      await token.transfer(germanyInvestor, 2, {
        from: germanyInvestor2Wallet,
      });
    });
    it('should allow upgrading the compliance manager', async function() {
      // At first usInvestor should not be allowed to send any tokens to another us investor

      await assertRevert(token.transfer(usInvestor2, 2, {from: usInvestor}));
      // Create a new compliance service and set the token to work with it

      const complianceServiceWhiteListed = await ESComplianceServiceWhitelisted.new(
        storage.address,
        'DSTokenTestComplianceManager'
      );
      await storage.adminAddRole(complianceServiceWhiteListed.address, 'write');
      const tx = await token.setDSService(
        COMPLIANCE_SERVICE,
        complianceServiceWhiteListed.address
      );

      assert.equal(tx.logs[0].event, 'DSServiceSet');
      assert.equal(tx.logs[0].args.serviceId, COMPLIANCE_SERVICE);
      assert.equal(
        tx.logs[0].args.serviceAddress,
        complianceServiceWhiteListed.address
      );

      // // Now it should work
      await token.transfer(usInvestor2, 2, {from: usInvestor});
    });
    it('should allow upgrading the token', async function() {
      // At first usInvestor should not be allowed to send any tokens to another us investor

      const before = await token.balanceOf(usInvestor);
      assert(before.valueOf(), 998);
      await assertRevert(token.transfer(0x0001, 2, {from: usInvestor})); // Not a registered wallet

      // Create a new token

      const simpleTokenImpl = await ESStandardTokenMock.new(0x0, '');
      const tx = await proxy.setTarget(simpleTokenImpl.address);
      assert.equal(tx.logs[0].event, 'ProxyTargetSet');
      assert.equal(tx.logs[0].args.target, simpleTokenImpl.address);

      let after = await token.balanceOf(usInvestor);
      assert(after.valueOf(), 998);

      // Now it should allow sending to any address
      await token.transfer(0x0001, 2, {from: usInvestor});
      after = await token.balanceOf(0x0001);
      assert(after.valueOf(), 2);
    });
  });
});
