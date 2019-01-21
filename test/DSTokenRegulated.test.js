import assertRevert from './helpers/assertRevert';
const DSEternalStorage = artifacts.require('DSEternalStorageVersioned');
const DSToken = artifacts.require('DSTokenVersioned');
const ESComplianceServiceRegulated = artifacts.require('ESComplianceServiceRegulatedVersioned');
const ESWalletManager = artifacts.require('ESWalletManagerVersioned');
const ESInvestorLockManager = artifacts.require('ESInvestorLockManagerVersioned');
const ESTrustService = artifacts.require('ESTrustServiceVersioned');
const ESRegistryService = artifacts.require('ESRegistryServiceVersioned');
const ESComplianceConfigurationService = artifacts.require('ESComplianceConfigurationServiceVersioned');

const Proxy = artifacts.require('ProxyVersioned');
const TRUST_SERVICE=1;
const DS_TOKEN=2;
const REGISTRY_SERVICE=4;
const COMPLIANCE_SERVICE=8;
const COMMS_SERVICE=16;
const WALLET_MANAGER=32;
const LOCK_MANAGER=64;
const ISSUANCE_INFORMATION_MANAGER=128;
const COMPLIANCE_CONFIGURATION_SERVICE=256;

const NONE = 0;

const MASTER = 1;
const ISSUER = 2;
const EXCHANGE = 4;

const US = 1;
const EU = 2;
const FORBIDDEN = 4;

const US_INVESTOR_ID = "usInvestorId";
const US_INVESTOR_COLLISION_HASH = "usInvestorCollisionHash";

const US_INVESTOR_ID_2 = "usInvestorId2";
const US_INVESTOR_COLLISION_HASH_2 = "usInvestorCollisionHash2";

const SPAIN_INVESTOR_ID = "spainInvestorId";
const SPAIN_INVESTOR_COLLISION_HASH = "spainInvestorCollisionHash";

const GERMANY_INVESTOR_ID = "germanyInvestorId";
const GERMANY_INVESTOR_COLLISION_HASH = "germanyInvestorCollisionHash";

const CHINA_INVESTOR_ID = "chinaInvestorId";
const CHINA_INVESTOR_COLLISION_HASH = "chinaInvestorCollisionHash";

const ISRAEL_INVESTOR_ID = "israelInvestorId";
const ISRAEL_INVESTOR_COLLISION_HASH = "israelInvestorCollisionHash";

const MINUTES = 60;
const HOURS = 60 * MINUTES;
const DAYS = 24 * HOURS;
const WEEKS = 7 * DAYS;
const YEARS = 365 * DAYS;

let latestTime = require('./utils/latestTime');
let increaseTimeTo = require('./helpers/increaseTime');

contract('DSToken (regulated)', function ([_, issuerWallet, usInvestor, usInvestorSecondaryWallet, usInvestor2, spainInvestor, germanyInvestor, chinaInvestor, israelInvestor]) {
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

  beforeEach(async function () {
    // Setting up the environment
    this.storage = await DSEternalStorage.new();
    this.trustService = await ESTrustService.new(this.storage.address, 'DSTokenTestTrustManager');
    this.complianceService = await ESComplianceServiceRegulated.new(this.storage.address, 'DSTokenTestComplianceManager');
    this.complianceConfiguration = await ESComplianceConfigurationService.new(this.storage.address, 'DSTokenTestComplianceConfiguration');
    this.walletManager = await ESWalletManager.new(this.storage.address, 'DSTokenTestWalletManager');
    this.lockManager = await ESInvestorLockManager.new(this.storage.address, 'DSTokenTestLockManager');
    this.tokenImpl = await DSToken.new();
    this.proxy = await Proxy.new();
    this.registryService = await ESRegistryService.new(this.storage.address, 'DSTokenTestRegistryService');
    await this.proxy.setTarget(this.tokenImpl.address);
    this.token = DSToken.at(this.proxy.address);
    await this.token.initialize('DSTokenMock', 'DST', 18, this.storage.address, 'DSTokenMock');
    await this.storage.adminAddRole(this.trustService.address, 'write');
    await this.storage.adminAddRole(this.complianceService.address, 'write');
    await this.storage.adminAddRole(this.walletManager.address, 'write');
    await this.storage.adminAddRole(this.lockManager.address, 'write');
    await this.storage.adminAddRole(this.registryService.address, 'write');
    await this.storage.adminAddRole(this.token.address, 'write');
    await this.storage.adminAddRole(this.complianceConfiguration.address, 'write');
    await this.trustService.initialize();
    await this.registryService.setDSService(TRUST_SERVICE,this.trustService.address);
    await this.complianceService.setDSService(TRUST_SERVICE,this.trustService.address);
    await this.complianceService.setDSService(WALLET_MANAGER,this.walletManager.address);
    await this.complianceService.setDSService(LOCK_MANAGER,this.lockManager.address);
    await this.complianceService.setDSService(REGISTRY_SERVICE, this.registryService.address);
    await this.complianceService.setDSService(COMPLIANCE_CONFIGURATION_SERVICE, this.complianceConfiguration.address);
    await this.complianceConfiguration.setDSService(TRUST_SERVICE, this.trustService.address);
    await this.token.setDSService(TRUST_SERVICE,this.trustService.address);
    await this.token.setDSService(COMPLIANCE_SERVICE,this.complianceService.address);
    await this.token.setDSService(WALLET_MANAGER,this.walletManager.address);
    await this.token.setDSService(LOCK_MANAGER,this.lockManager.address);
    await this.token.setDSService(REGISTRY_SERVICE,this.registryService.address);
    await this.complianceService.setDSService(DS_TOKEN,this.token.address);
    await this.walletManager.setDSService(TRUST_SERVICE,this.trustService.address);
    await this.lockManager.setDSService(TRUST_SERVICE,this.trustService.address);
    await this.lockManager.setDSService(REGISTRY_SERVICE,this.registryService.address);
    await this.lockManager.setDSService(COMPLIANCE_SERVICE,this.complianceService.address);
    await this.lockManager.setDSService(DS_TOKEN, this.token.address);
    await this.registryService.setDSService(WALLET_MANAGER,this.walletManager.address);
    await this.registryService.setDSService(DS_TOKEN,this.token.address);
    await this.walletManager.setDSService(REGISTRY_SERVICE,this.registryService.address);

    // Basic seed
    await this.complianceConfiguration.setCountryCompliance("USA", US);
    await this.complianceConfiguration.setCountryCompliance("Spain", EU);
    await this.complianceConfiguration.setCountryCompliance("Germany", EU);
    await this.complianceConfiguration.setCountryCompliance("China", FORBIDDEN);

    // Registering the investors and wallets
    await this.registryService.registerInvestor(US_INVESTOR_ID, US_INVESTOR_COLLISION_HASH);
    await this.registryService.setCountry(US_INVESTOR_ID, "USA");
    await this.registryService.addWallet(usInvestor, US_INVESTOR_ID);
    await this.registryService.addWallet(usInvestorSecondaryWallet, US_INVESTOR_ID);

    await this.registryService.registerInvestor(US_INVESTOR_ID_2, US_INVESTOR_COLLISION_HASH_2);
    await this.registryService.setCountry(US_INVESTOR_ID_2, "USA");
    await this.registryService.addWallet(usInvestor2, US_INVESTOR_ID_2);

    await this.registryService.registerInvestor(SPAIN_INVESTOR_ID, SPAIN_INVESTOR_COLLISION_HASH);
    await this.registryService.setCountry(SPAIN_INVESTOR_ID, "Spain");
    await this.registryService.addWallet(spainInvestor, SPAIN_INVESTOR_ID);

    await this.registryService.registerInvestor(GERMANY_INVESTOR_ID, GERMANY_INVESTOR_COLLISION_HASH);
    await this.registryService.setCountry(GERMANY_INVESTOR_ID, "Germany");
    await this.registryService.addWallet(germanyInvestor, GERMANY_INVESTOR_ID);

    await this.registryService.registerInvestor(CHINA_INVESTOR_ID, CHINA_INVESTOR_COLLISION_HASH);
    await this.registryService.setCountry(CHINA_INVESTOR_ID, "China");
    await this.registryService.addWallet(chinaInvestor, CHINA_INVESTOR_ID);

    await this.registryService.registerInvestor(ISRAEL_INVESTOR_ID, ISRAEL_INVESTOR_COLLISION_HASH);
    await this.registryService.setCountry(ISRAEL_INVESTOR_ID, "Israel");
    await this.registryService.addWallet(israelInvestor, ISRAEL_INVESTOR_ID);

    await this.complianceConfiguration.setAll([0,0,0,0,0,0,0,0,0,0,0,0,150],[true,false]);
  });

  describe('creation', function () {
    it('should get the basic details of the token correctly', async function () {
      const name = await this.token.name.call();
      const symbol = await this.token.symbol.call();
      const decimals = await this.token.decimals.call();
      const totalSupply = await this.token.totalSupply.call();

      assert.equal(name, 'DSTokenMock');
      assert.equal(symbol, 'DST');
      assert.equal(decimals, 18);
      assert.equal(totalSupply, 0);
    });
    it('should not allow instantiating the token without a proxy', async function () {
      const token = await DSToken.new();
      await assertRevert(token.initialize('DSTokenMock', 'DST', 18, this.storage.address, 'DSTokenMock'));
    });
  });

  describe('cap', function () {
    beforeEach(async function () {
      await this.token.setCap(1000);
    });

    it('cannot be set twice', async function () {
      await assertRevert(this.token.setCap(1000));
    });

    it('doesn\'t prevent issuing tokens within limit', async function () {
      await this.token.issueTokens(usInvestor, 500);
      await this.token.issueTokens(usInvestor, 500);
    });

    it('prevents issuing too many tokens', async function () {
      await this.token.issueTokens(usInvestor, 500);
      await assertRevert(this.token.issueTokens(usInvestor, 501));
    });
  });

  describe('issuance', function () {
    it('should issue tokens to a us wallet', async function () {
      await this.token.issueTokens(usInvestor, 100);
      const balance = await this.token.balanceOf(usInvestor);
      assert.equal(balance, 100);
    });

    it('should issue tokens to a eu wallet', async function () {
      await this.token.issueTokens(germanyInvestor, 100);
      const balance = await this.token.balanceOf(germanyInvestor);
      assert.equal(balance, 100);
    });

    it('should not issue tokens to a forbidden wallet', async function () {
      await assertRevert(this.token.issueTokens(chinaInvestor, 100));
    });

    it('should issue tokens to a none wallet', async function () {
      await this.token.issueTokens(israelInvestor, 100);
      const balance = await this.token.balanceOf(israelInvestor);
      assert.equal(balance, 100);
    });

    it('should record the number of total issued token correctly', async function () {
      await this.token.issueTokens(usInvestor, 100);
      await this.token.issueTokens(usInvestorSecondaryWallet, 100);
      await this.token.issueTokens(usInvestor2, 100);
      await this.token.issueTokens(usInvestor, 100);
      await this.token.issueTokens(germanyInvestor, 100);
      await this.token.issueTokens(israelInvestor, 100);

      const totalIssued = await this.token.totalIssued();

      assert.equal(totalIssued, 600);
    });
  });

  describe('locking', function() {
    it('should not allow transferring any tokens when all locked', async function() {
      await this.token.issueTokensCustom(israelInvestor, 100, latestTime(), 100, 'TEST', latestTime() + 1 * WEEKS);
      await assertRevert(this.token.transfer(germanyInvestor, 1, { from: israelInvestor }));
    });

    it('should allow transferring tokens when other are locked', async function() {
      await this.token.issueTokensCustom(israelInvestor, 100, latestTime(), 50, 'TEST', latestTime() + 1 * WEEKS);
      await this.token.transfer(germanyInvestor, 50, { from: israelInvestor });
      const israelBalance = await this.token.balanceOf(israelInvestor);
      assert.equal(israelBalance, 50);
      const germanyBalance = await this.token.balanceOf(germanyInvestor);
      assert.equal(germanyBalance, 50);
    });

    it('should allow investors to move locked tokens between their own wallets', async function() {
      await this.token.issueTokensCustom(usInvestor, 100, latestTime(), 100, 'TEST', latestTime() + 1 * WEEKS);
      await this.token.transfer(usInvestorSecondaryWallet, 50, { from: usInvestor });
      const usInvestorBalance = await this.token.balanceOf(usInvestor);
      assert.equal(usInvestorBalance.valueOf(), 50);
      const usInvestorSecondaryWalletBalance = await this.token.balanceOf(usInvestorSecondaryWallet);
      assert.equal(usInvestorSecondaryWalletBalance.valueOf(), 50);
    });
  });

  describe('burn', function () {
    it('should burn tokens from a specific wallet', async function () {
      await this.token.issueTokens(usInvestor, 100);
      await this.token.burn(usInvestor, 50, 'test burn');

      const balance = await this.token.balanceOf(usInvestor);
      assert.equal(balance, 50);
    });

    it('should record the number of total issued token correctly after burn', async function () {
      await this.token.issueTokens(usInvestor, 100);
      await this.token.issueTokens(usInvestor, 100);
      await this.token.burn(usInvestor, 100, 'test burn');

      const totalIssued = await this.token.totalIssued();
      assert.equal(totalIssued, 200);
    });
  });

  describe('seize', function () {
    beforeEach(async function() {
      await this.walletManager.addIssuerWallet(issuerWallet);
      await this.token.issueTokens(usInvestor, 100);
    });

    it('should seize tokens correctly', async function () {
      await this.token.seize(usInvestor, issuerWallet, 50, 'test seize');

      const usInvestorBalance = await this.token.balanceOf(usInvestor);
      assert.equal(usInvestorBalance, 50);
      const issuerWalletBalance = await this.token.balanceOf(issuerWallet);
      assert.equal(issuerWalletBalance, 50);
    });

    it('cannot seize more than balance', async function () {
      await assertRevert(this.token.seize(usInvestor, issuerWallet, 150, 'test seize'));
    });
  });
});
