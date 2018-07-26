import assertRevert from './helpers/assertRevert';
const EternalStorage = artifacts.require('EternalStorage');
const DSToken = artifacts.require('DSToken');
const ESComplianceServiceNotRegulated = artifacts.require('ESComplianceServiceNotRegulated');
const ESWalletManager = artifacts.require('ESWalletManager');
const ESLockManager = artifacts.require('ESLockManager');
const ESTrustService = artifacts.require('ESTrustService');
const ESRegistryService = artifacts.require('ESRegistryService');

const Proxy = artifacts.require('proxy');
const TRUST_SERVICE=1;
const DS_TOKEN=2;
const REGISTRY_SERVICE=4;
const COMPLIANCE_SERVICE=8;
const COMMS_SERVICE=16;
const WALLET_MANAGER=32;
const LOCK_MANAGER=64;
const ISSUANCE_INFORMATION_MANAGER=128;

const NONE = 0;
const MASTER = 1;
const ISSUER = 2;
const EXCHANGE = 4;

contract('DSToken', function ([_, owner, recipient, anotherAccount]) {
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

  beforeEach(async function () {
    this.storage = await EternalStorage.new();
    this.trustService = await ESTrustService.new(this.storage.address, 'DSTokenTestTrustManager');
    this.complianceService = await ESComplianceServiceNotRegulated.new(this.storage.address, 'DSTokenTestComplianceManager');
    this.walletManager = await ESWalletManager.new(this.storage.address, 'DSTokenTestWalletManager');
    this.lockManager = await ESLockManager.new(this.storage.address, 'DSTokenTestLockManager');
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
    await this.trustService.initialize();
    await this.registryService.setDSService(TRUST_SERVICE,this.trustService.address);
    await this.complianceService.setDSService(TRUST_SERVICE,this.trustService.address);
    await this.complianceService.setDSService(LOCK_MANAGER,this.lockManager.address);
    await this.complianceService.setDSService(WALLET_MANAGER,this.walletManager.address);
    await this.token.setDSService(TRUST_SERVICE,this.trustService.address);
    await this.token.setDSService(COMPLIANCE_SERVICE,this.complianceService.address);
    await this.token.setDSService(LOCK_MANAGER,this.lockManager.address);
    await this.token.setDSService(WALLET_MANAGER,this.walletManager.address);
    await this.token.setDSService(REGISTRY_SERVICE,this.registryService.address);
    await this.complianceService.setDSService(DS_TOKEN,this.token.address);
    await this.lockManager.setDSService(TRUST_SERVICE,this.trustService.address);
    await this.lockManager.setDSService(DS_TOKEN, this.token.address);
    await this.walletManager.setDSService(TRUST_SERVICE,this.trustService.address);
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
      await this.token.issueTokens(owner, 500);
      await this.token.issueTokens(owner, 500);
    });

    it('prevents issuing too many tokens', async function () {
      await this.token.issueTokens(owner, 500);
      await assertRevert(this.token.issueTokens(owner, 501));
    });
  });

  describe('issuance', function () {
    beforeEach(async function () {
      await this.token.issueTokens(owner, 100);
    });

    it('should issue tokens to a wallet', async function () {
      const balance = await this.token.balanceOf(owner);
      assert.equal(balance, 100);
    });

    it('should issue unlocked tokens to a wallet', async function () {
      const balance = await this.token.balanceOf(owner);
      assert.equal(balance, 100);
      await this.token.transfer(recipient, 100, { from: owner });
      const ownerBalance = await this.token.balanceOf(owner);
      assert.equal(ownerBalance, 0);
      const recipientBalance = await this.token.balanceOf(recipient);
      assert.equal(recipientBalance, 100);
    });

    it('should record the number of total issued token correctly', async function () {
      await this.token.issueTokens(owner, 100);
      await this.token.issueTokens(owner, 100);

      const totalIssued = await this.token.totalIssued();

      assert.equal(totalIssued, 300);
    });

    it('should record the number of total issued token correctly after burn', async function () {
      await this.token.issueTokens(owner, 100);
      await this.token.issueTokens(owner, 100);
      await this.token.burn(owner, 100, 'test burn');

      const totalIssued = await this.token.totalIssued();
      assert.equal(totalIssued, 300);
    });
  });

  describe('burn', function () {
    it('should burn tokens from a specific wallet', async function () {
      await this.token.issueTokens(owner, 100);
      await this.token.burn(owner, 50, 'test burn');

      const balance = await this.token.balanceOf(owner);
      assert.equal(balance, 50);
    });
  });

  describe('seize', function () {
    beforeEach(async function() {
      await this.walletManager.addIssuerWallet(recipient);
      await this.token.issueTokens(owner, 100);
    });

    it('should seize tokens correctly', async function () {
      await this.token.seize(owner, recipient, 50, 'test seize');

      const ownerBalance = await this.token.balanceOf(owner);
      assert.equal(ownerBalance, 50);
      const recipientBalance = await this.token.balanceOf(recipient);
      assert.equal(recipientBalance, 50);
    });

    it('cannot seize more than balance', async function () {
      await assertRevert(this.token.seize(owner, recipient, 150, 'test seize'));
    });
  });
});
