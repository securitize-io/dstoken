const assertRevert = require('./helpers/assertRevert');
const EternalStorage = artifacts.require('DSEternalStorageVersioned');
const DSToken = artifacts.require('DSTokenVersioned');
const ESComplianceServiceNotRegulated = artifacts.require(
  'ESComplianceServiceNotRegulatedVersioned'
);
const ESComplianceServiceWhitelisted = artifacts.require(
  'ESComplianceServiceWhitelistedVersioned'
);
const ESWalletManager = artifacts.require('ESWalletManagerVersioned');
const ESLockManager = artifacts.require('ESLockManagerVersioned');
const ESTrustService = artifacts.require('ESTrustServiceVersioned');
const ESRegistryService = artifacts.require('ESRegistryServiceVersioned');

const Proxy = artifacts.require('ProxyVersioned');
const TRUST_SERVICE = 1;
const DS_TOKEN = 2;
const REGISTRY_SERVICE = 4;
const COMPLIANCE_SERVICE = 8;
const COMMS_SERVICE = 16;
const WALLET_MANAGER = 32;
const LOCK_MANAGER = 64;
const ISSUANCE_INFORMATION_MANAGER = 128;

const NONE = 0;
const MASTER = 1;
const ISSUER = 2;
const EXCHANGE = 4;

const walletID = '1';
const walletID2 = '2';

contract('DSToken (not regulated)', function([
  _,
  owner,
  recipient,
  anotherAccount,
  wallet,
  wallet1
]) {
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

  beforeEach(async function() {
    this.storage = await EternalStorage.new();
    this.trustService = await ESTrustService.new(
      this.storage.address,
      'DSTokenTestTrustManager'
    );
    this.complianceService = await ESComplianceServiceNotRegulated.new(
      this.storage.address,
      'DSTokenTestComplianceManager'
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
    this.token = DSToken.at(this.proxy.address);
    await this.token.initialize(
      'DSTokenMock',
      'DST',
      18,
      this.storage.address,
      'DSTokenMock'
    );
    await this.storage.adminAddRole(this.trustService.address, 'write');
    await this.storage.adminAddRole(this.complianceService.address, 'write');
    await this.storage.adminAddRole(this.walletManager.address, 'write');
    await this.storage.adminAddRole(this.lockManager.address, 'write');
    await this.storage.adminAddRole(this.registryService.address, 'write');
    await this.storage.adminAddRole(this.token.address, 'write');
    await this.trustService.initialize();
    await this.registryService.setDSService(
      TRUST_SERVICE,
      this.trustService.address
    );
    await this.registryService.setDSService(
      WALLET_MANAGER,
      this.walletManager.address
    );
    await this.complianceService.setDSService(
      TRUST_SERVICE,
      this.trustService.address
    );
    await this.complianceService.setDSService(
      WALLET_MANAGER,
      this.walletManager.address
    );
    await this.complianceService.setDSService(
      LOCK_MANAGER,
      this.lockManager.address
    );
    await this.token.setDSService(TRUST_SERVICE, this.trustService.address);
    await this.token.setDSService(
      COMPLIANCE_SERVICE,
      this.complianceService.address
    );
    await this.token.setDSService(WALLET_MANAGER, this.walletManager.address);
    await this.token.setDSService(LOCK_MANAGER, this.lockManager.address);
    await this.token.setDSService(
      REGISTRY_SERVICE,
      this.registryService.address
    );
    await this.complianceService.setDSService(DS_TOKEN, this.token.address);
    await this.walletManager.setDSService(
      TRUST_SERVICE,
      this.trustService.address
    );
    await this.walletManager.setDSService(
      REGISTRY_SERVICE,
      this.registryService.address
    );
    await this.lockManager.setDSService(
      TRUST_SERVICE,
      this.trustService.address
    );
    await this.lockManager.setDSService(DS_TOKEN, this.token.address);
  });

  describe('creation', function() {
    it('should get the basic details of the token correctly', async function() {
      const name = await this.token.name.call();
      const symbol = await this.token.symbol.call();
      const decimals = await this.token.decimals.call();
      const totalSupply = await this.token.totalSupply.call();

      assert.equal(name, 'DSTokenMock');
      assert.equal(symbol, 'DST');
      assert.equal(decimals, 18);
      assert.equal(totalSupply, 0);
    });

    it('should сreate and deploy Trust Service, Registry Service, Whitelist Compliance Service and DS Token and link them together', async function() {
      this.trustService = await ESTrustService.new(
        this.storage.address,
        'DSTokenTestTrustManager'
      );
      this.complianceServiceWhitelisted = await ESComplianceServiceWhitelisted.new(
        this.storage.address,
        'DSTokenTestComplianceManager'
      );
      this.registryService = await ESRegistryService.new(
        this.storage.address,
        'DSTokenTestRegistryService'
      );
      this.tokenImpl = await DSToken.new();
      this.proxy = await Proxy.new();
      await this.proxy.setTarget(this.tokenImpl.address);
      this.token = DSToken.at(this.proxy.address);
      await this.token.initialize(
        'DSTokenMock',
        'DST',
        18,
        this.storage.address,
        'DSTokenMock'
      );
      await this.storage.adminAddRole(this.trustService.address, 'write');
      await this.storage.adminAddRole(
        this.complianceServiceWhitelisted.address,
        'write'
      );
      await this.storage.adminAddRole(this.walletManager.address, 'write');
      await this.storage.adminAddRole(this.lockManager.address, 'write');
      await this.storage.adminAddRole(this.registryService.address, 'write');
      await this.storage.adminAddRole(this.token.address, 'write');
      await this.trustService.initialize();
      await this.registryService.setDSService(
        TRUST_SERVICE,
        this.trustService.address
      );
      await this.complianceServiceWhitelisted.setDSService(
        TRUST_SERVICE,
        this.trustService.address
      );
      await this.token.setDSService(TRUST_SERVICE, this.trustService.address);
      await this.token.setDSService(
        COMPLIANCE_SERVICE,
        this.complianceServiceWhitelisted.address
      );
      await this.token.setDSService(
        REGISTRY_SERVICE,
        this.registryService.address
      );
    });

    it('should not allow instantiating the token without a proxy', async function() {
      const token = await DSToken.new();
      await assertRevert(
        token.initialize(
          'DSTokenMock',
          'DST',
          18,
          this.storage.address,
          'DSTokenMock'
        )
      );
    });
  });

  describe('investors', function() {
    beforeEach(async function() {
      this.storage = await EternalStorage.new();
      this.trustService = await ESTrustService.new(
        this.storage.address,
        'DSTokenTestTrustManager'
      );
      this.complianceService = await ESComplianceServiceWhitelisted.new(
        this.storage.address,
        'DSTokenTestComplianceManager'
      );
      this.walletManager = await ESWalletManager.new(
        this.storage.address,
        'DSTokenTestWalletManager'
      );
      this.lockManager = await ESLockManager.new(
        this.storage.address,
        'DSTokenTestLockManager'
      );
      this.registryService = await ESRegistryService.new(
        this.storage.address,
        'DSTokenTestRegistryService'
      );
      this.tokenImpl = await DSToken.new();
      this.proxy = await Proxy.new();
      await this.proxy.setTarget(this.tokenImpl.address);
      this.token = DSToken.at(this.proxy.address);
      await this.token.initialize(
        'DSTokenMock',
        'DST',
        18,
        this.storage.address,
        'DSTokenMock'
      );
      await this.storage.adminAddRole(this.trustService.address, 'write');
      await this.storage.adminAddRole(this.complianceService.address, 'write');
      await this.storage.adminAddRole(this.walletManager.address, 'write');
      await this.storage.adminAddRole(this.lockManager.address, 'write');
      await this.storage.adminAddRole(this.token.address, 'write');
      await this.storage.adminAddRole(this.registryService.address, 'write');
      await this.trustService.initialize();
      await this.complianceService.setDSService(
        TRUST_SERVICE,
        this.trustService.address
      );
      await this.complianceService.setDSService(
        LOCK_MANAGER,
        this.lockManager.address
      );
      await this.complianceService.setDSService(
        WALLET_MANAGER,
        this.walletManager.address
      );
      await this.complianceService.setDSService(
        REGISTRY_SERVICE,
        this.registryService.address
      );
      await this.token.setDSService(TRUST_SERVICE, this.trustService.address);
      await this.token.setDSService(
        COMPLIANCE_SERVICE,
        this.complianceService.address
      );
      await this.token.setDSService(LOCK_MANAGER, this.lockManager.address);
      await this.token.setDSService(WALLET_MANAGER, this.walletManager.address);
      await this.token.setDSService(
        REGISTRY_SERVICE,
        this.registryService.address
      );
      await this.complianceService.setDSService(DS_TOKEN, this.token.address);
      await this.complianceService.setDSService(
        REGISTRY_SERVICE,
        this.registryService.address
      );
      await this.lockManager.setDSService(
        TRUST_SERVICE,
        this.trustService.address
      );
      await this.lockManager.setDSService(DS_TOKEN, this.token.address);
      await this.walletManager.setDSService(
        TRUST_SERVICE,
        this.trustService.address
      );
      await this.walletManager.setDSService(
        REGISTRY_SERVICE,
        this.registryService.address
      );
      await this.registryService.setDSService(
        TRUST_SERVICE,
        this.trustService.address
      );
      await this.registryService.setDSService(
        WALLET_MANAGER,
        this.walletManager.address
      );
    });

    it('Create several investors into the Registry service and assign them wallets', async function() {
      await this.registryService.registerInvestor(walletID, 'wallet');
      await this.registryService.registerInvestor(walletID2, 'wallet1');
      await this.registryService.addWallet(wallet, walletID);
      await this.registryService.addWallet(wallet1, walletID2);
    });

    it('Issue Tokens to investors in the Registry (should work)', async function() {
      await this.registryService.registerInvestor(walletID, 'wallet');
      await this.registryService.registerInvestor(walletID2, 'wallet1');
      await this.registryService.addWallet(wallet, walletID);
      await this.registryService.addWallet(wallet1, walletID2);
      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100);
      await this.token.issueTokens(wallet1, 100);
      assert.equal(await this.token.balanceOf(wallet), 100);
      assert.equal(await this.token.balanceOf(wallet1), 100);
    });

    it('Issue Tokens to investor not in the Registry (should fail) and add new investor and try issuing again (should now work)', async function() {
      await this.token.setCap(1000);
      await assertRevert(this.token.issueTokens(anotherAccount, 100));
      await this.registryService.registerInvestor(walletID, 'anotherAccount');
      await this.registryService.addWallet(anotherAccount, walletID);
      await this.token.issueTokens(anotherAccount, 100);
      assert.equal(await this.token.balanceOf(anotherAccount), 100);
    });

    it('Transfer tokens from investor in registry to wallet not in registry (should fail)', async function() {
      await this.registryService.registerInvestor(walletID, 'wallet');
      await this.registryService.addWallet(wallet, walletID);
      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100);
      assert.equal(await this.token.balanceOf(wallet), 100);
      await assertRevert(this.token.transfer(wallet1, 100, { from: wallet }));
    });

    it('Test function getInvestor(InvestorID) before/after adding an investor', async function() {
      assert.equal(await this.registryService.getInvestor(wallet), 0);
      assert.equal(await this.registryService.getInvestor(wallet1), 0);
      await this.registryService.registerInvestor(walletID, 'wallet');
      await this.registryService.registerInvestor(walletID2, 'wallet1');
      await this.registryService.addWallet(wallet, walletID);
      await this.registryService.addWallet(wallet1, walletID2);
      assert.equal(await this.registryService.getInvestor(wallet), walletID);
      assert.equal(await this.registryService.getInvestor(wallet1), walletID2);
    });

    it('Transfer tokens from wallet in registry to wallet in registry (should work)', async function() {
      await this.registryService.registerInvestor(walletID, 'wallet');
      await this.registryService.registerInvestor(walletID2, 'wallet1');
      await this.registryService.addWallet(wallet, walletID);
      await this.registryService.addWallet(wallet1, walletID2);
      await this.token.setCap(1000);
      await this.token.issueTokens(wallet, 100);
      assert.equal(await this.token.balanceOf(wallet), 100);
      await this.token.transfer(wallet1, 100, { from: wallet });
      assert.equal(await this.token.balanceOf(wallet), 0);
      assert.equal(await this.token.balanceOf(wallet1), 100);
    });
  });

  describe('cap', function() {
    beforeEach(async function() {
      await this.token.setCap(1000);
    });

    it('cannot be set twice', async function() {
      await assertRevert(this.token.setCap(1000));
    });

    it("doesn't prevent issuing tokens within limit", async function() {
      await this.token.issueTokens(owner, 500);
      await this.token.issueTokens(owner, 500);
    });

    it('prevents issuing too many tokens', async function() {
      await this.token.issueTokens(owner, 500);
      await assertRevert(this.token.issueTokens(owner, 501));
    });
  });

  describe('issuance', function() {
    beforeEach(async function() {
      await this.token.issueTokens(owner, 100);
    });

    it('should issue tokens to a wallet', async function() {
      const balance = await this.token.balanceOf(owner);
      assert.equal(balance, 100);
    });

    it('should issue unlocked tokens to a wallet', async function() {
      const balance = await this.token.balanceOf(owner);
      assert.equal(balance, 100);
      await this.token.transfer(recipient, 100, { from: owner });
      const ownerBalance = await this.token.balanceOf(owner);
      assert.equal(ownerBalance, 0);
      const recipientBalance = await this.token.balanceOf(recipient);
      assert.equal(recipientBalance, 100);
    });

    it('should record the number of total issued token correctly', async function() {
      await this.token.issueTokens(owner, 100);
      await this.token.issueTokens(owner, 100);

      const totalIssued = await this.token.totalIssued();

      assert.equal(totalIssued, 300);
    });

    it('should record the number of total issued token correctly after burn', async function() {
      await this.token.issueTokens(owner, 100);
      await this.token.issueTokens(owner, 100);
      await this.token.burn(owner, 100, 'test burn');

      const totalIssued = await this.token.totalIssued();
      assert.equal(totalIssued, 300);
    });
  });

  describe('burn', function() {
    it('should burn tokens from a specific wallet', async function() {
      await this.token.issueTokens(owner, 100);
      await this.token.burn(owner, 50, 'test burn');

      const balance = await this.token.balanceOf(owner);
      assert.equal(balance, 50);
    });
  });

  describe('seize', function() {
    beforeEach(async function() {
      await this.walletManager.addIssuerWallet(recipient);
      await this.token.issueTokens(owner, 100);
    });

    it('should seize tokens correctly', async function() {
      await this.token.seize(owner, recipient, 50, 'test seize');

      const ownerBalance = await this.token.balanceOf(owner);
      assert.equal(ownerBalance, 50);
      const recipientBalance = await this.token.balanceOf(recipient);
      assert.equal(recipientBalance, 50);
    });

    it('cannot seize more than balance', async function() {
      await assertRevert(this.token.seize(owner, recipient, 150, 'test seize'));
    });
  });
});
