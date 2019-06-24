const assertRevert = require('../utils/assertRevert');
const EternalStorage = artifacts.require('DSEternalStorageVersioned');
const ESWalletManager = artifacts.require('ESWalletManagerVersioned');
const ESTrustService = artifacts.require('ESTrustServiceVersioned');
const ESInvestorLockManager = artifacts.require(
  'ESInvestorLockManagerVersioned'
);
const DSToken = artifacts.require('DSTokenVersioned');
const ESComplianceServiceNotRegulated = artifacts.require(
  'ESComplianceServiceNotRegulatedVersioned'
);
const ESRegistryService = artifacts.require('ESRegistryServiceVersioned');

const latestTime = require('../utils/latestTime');
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
const LOCK_INDEX = 0;
const REASON_CODE = 0;
const REASON_STRING = 'Test';

const WALLET_ID = '1';

contract('ESInvestorLockManager', function([
  owner,
  wallet,
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
    this.complianceService = await ESComplianceServiceNotRegulated.new(
      this.storage.address,
      'DSTokenTestComplianceManager'
    );
    this.walletManager = await ESWalletManager.new(
      this.storage.address,
      'DSTokenTestWalletManager'
    );
    this.lockManager = await ESInvestorLockManager.new(
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
    await this.complianceService.setDSService(
      REGISTRY_SERVICE,
      this.registryService.address
    );
    await this.complianceService.setDSService(DS_TOKEN, this.token.address);
    await this.walletManager.setDSService(
      TRUST_SERVICE,
      this.trustService.address
    );
    await this.lockManager.setDSService(
      TRUST_SERVICE,
      this.trustService.address
    );
    await this.lockManager.setDSService(
      REGISTRY_SERVICE,
      this.registryService.address
    );
    await this.lockManager.setDSService(DS_TOKEN, this.token.address);
    await this.lockManager.setDSService(
      WALLET_MANAGER,
      this.walletManager.address
    );
    await this.lockManager.setDSService(
      COMPLIANCE_SERVICE,
      this.complianceService.address
    );
    await this.registryService.setDSService(
      WALLET_MANAGER,
      this.walletManager.address
    );
    await this.walletManager.setDSService(
      REGISTRY_SERVICE,
      this.registryService.address
    );

    await this.trustService.setRole(issuerAccount, ISSUER);
    await this.trustService.setRole(exchangeAccount, EXCHANGE);
  });

  describe('Add Manual Lock Record', function() {
    it('Should revert due to valueLocked = 0', async function() {
      await this.registryService.registerInvestor(WALLET_ID, 'wallet');
      await this.registryService.addWallet(wallet, WALLET_ID);
      await assertRevert(
        this.lockManager.addManualLockRecord(
          wallet,
          0,
          REASON_STRING,
          latestTime() + 1000
        )
      );
    });

    it('Should revert due to release time < now && > 0', async function() {
      await this.registryService.registerInvestor(WALLET_ID, 'wallet');
      await this.registryService.addWallet(wallet, WALLET_ID);
      await assertRevert(
        this.lockManager.addManualLockRecord(
          wallet,
          0,
          REASON_STRING,
          latestTime() - 1000
        )
      );
    });

    it('Trying to Add ManualLock Record with NONE permissions - should be error', async function() {
      await this.registryService.registerInvestor(WALLET_ID, 'wallet');
      await this.registryService.addWallet(wallet, WALLET_ID);
      await assertRevert(
        this.lockManager.addManualLockRecord(
          wallet,
          100,
          REASON_STRING,
          latestTime() + 1000,
          {from: noneAccount}
        )
      );
    });

    it('Trying to Add ManualLock Record with EXCHANGE permissions - should be error', async function() {
      await this.registryService.registerInvestor(WALLET_ID, 'wallet');
      await this.registryService.addWallet(wallet, WALLET_ID);
      await assertRevert(
        this.lockManager.addManualLockRecord(
          wallet,
          100,
          REASON_STRING,
          latestTime() + 1000,
          {from: exchangeAccount}
        )
      );
    });

    it('Trying to Add ManualLock Record with ISSUER permissions - should pass', async function() {
      await this.registryService.registerInvestor(WALLET_ID, 'wallet');
      await this.registryService.addWallet(owner, WALLET_ID);
      await this.token.setCap(1000);
      await this.token.issueTokens(owner, 100);
      assert.equal(await this.token.balanceOf(owner), 100);
      assert.equal(
        await this.lockManager.getTransferableTokens(owner, latestTime()),
        100
      );
      await this.lockManager.addManualLockRecord(
        owner,
        100,
        REASON_STRING,
        latestTime() + 1000,
        {from: issuerAccount}
      );
      assert.equal(await this.lockManager.lockCount(owner), 1);
      assert.equal(
        await this.lockManager.getTransferableTokens(owner, latestTime()),
        0
      );
    });
  });

  describe('Remove Lock Record:', function() {
    it('Should revert due to lockIndex > lastLockNumber', async function() {
      await this.registryService.registerInvestor(WALLET_ID, 'wallet');
      await this.registryService.addWallet(wallet, WALLET_ID);
      await this.lockManager.addManualLockRecord(
        wallet,
        100,
        REASON_STRING,
        latestTime() + 1000,
        {from: issuerAccount}
      );
      assert.equal(await this.lockManager.lockCount(wallet), 1);
      await assertRevert(this.lockManager.removeLockRecord(wallet, 2));
    });

    it('Trying to Remove ManualLock Record with NONE permissions - should be error', async function() {
      await this.registryService.registerInvestor(WALLET_ID, 'wallet');
      await this.registryService.addWallet(wallet, WALLET_ID);
      await this.lockManager.addManualLockRecord(
        wallet,
        100,
        REASON_STRING,
        latestTime() + 1000,
        {from: issuerAccount}
      );
      assert.equal(await this.lockManager.lockCount(wallet), 1);
      await assertRevert(
        this.lockManager.removeLockRecord(wallet, LOCK_INDEX, {
          from: noneAccount,
        })
      );
    });

    it('Trying to Remove ManualLock Record with EXCHANGE permissions - should be error', async function() {
      await this.registryService.registerInvestor(WALLET_ID, 'wallet');
      await this.registryService.addWallet(wallet, WALLET_ID);
      await this.lockManager.addManualLockRecord(
        wallet,
        100,
        REASON_STRING,
        latestTime() + 1000,
        {from: issuerAccount}
      );
      assert.equal(await this.lockManager.lockCount(wallet), 1);
      await assertRevert(
        this.lockManager.removeLockRecord(wallet, LOCK_INDEX, {
          from: exchangeAccount,
        })
      );
    });

    it('Trying to Remove ManualLock Record with ISSUER permissions - should pass', async function() {
      await this.registryService.registerInvestor(WALLET_ID, 'wallet');
      await this.registryService.addWallet(owner, WALLET_ID);
      await this.token.setCap(1000);
      await this.token.issueTokens(owner, 100);
      assert.equal(await this.token.balanceOf(owner), 100);
      assert.equal(
        await this.lockManager.getTransferableTokens(owner, latestTime()),
        100
      );
      await this.lockManager.addManualLockRecord(
        owner,
        100,
        REASON_STRING,
        latestTime() + 1000,
        {from: issuerAccount}
      );
      assert.equal(await this.lockManager.lockCount(owner), 1);
      assert.equal(
        await this.lockManager.getTransferableTokens(owner, latestTime()),
        0
      );
      await this.lockManager.removeLockRecord(owner, LOCK_INDEX, {
        from: issuerAccount,
      });
      assert.equal(await this.lockManager.lockCount(owner), 0);
    });
  });

  describe('Lock Count:', function() {
    it('Should return 0', async function() {
      await this.registryService.registerInvestor(WALLET_ID, 'wallet');
      await this.registryService.addWallet(wallet, WALLET_ID);
      assert.equal(await this.lockManager.lockCount(wallet), 0);
    });

    it('Should return 1', async function() {
      await this.registryService.registerInvestor(WALLET_ID, 'wallet');
      await this.registryService.addWallet(wallet, WALLET_ID);
      await this.lockManager.addManualLockRecord(
        wallet,
        100,
        REASON_STRING,
        latestTime() + 1000,
        {from: issuerAccount}
      );
      assert.equal(await this.lockManager.lockCount(wallet), 1);
    });
  });

  describe('Lock info:', function() {
    it('Should revert due to lockIndex > lastLockNumber', async function() {
      await this.registryService.registerInvestor(WALLET_ID, 'wallet');
      await this.registryService.addWallet(wallet, WALLET_ID);
      await this.lockManager.addManualLockRecord(
        wallet,
        100,
        REASON_STRING,
        latestTime() + 1000,
        {from: issuerAccount}
      );
      assert.equal(await this.lockManager.lockCount(wallet), 1);
      await assertRevert(this.lockManager.lockInfo(wallet, 1));
    });

    it('Should pass', async function() {
      await this.registryService.registerInvestor(WALLET_ID, 'wallet');
      await this.registryService.addWallet(wallet, WALLET_ID);
      let realeseTime = latestTime() + 1000;
      await this.lockManager.addManualLockRecord(
        wallet,
        100,
        REASON_STRING,
        realeseTime,
        {from: issuerAccount}
      );
      assert.equal(await this.lockManager.lockCount(wallet), 1);

      let info = await this.lockManager.lockInfo(wallet, LOCK_INDEX);
      assert.equal(info[0], REASON_CODE);
      assert.equal(info[1], REASON_STRING);
      assert.equal(info[2], 100);
      assert.equal(info[3], realeseTime);
    });
  });

  describe('Get Transferable Tokens:', function() {
    it('Should revert due to time = 0', async function() {
      await this.registryService.registerInvestor(WALLET_ID, 'wallet');
      await this.registryService.addWallet(wallet, WALLET_ID);
      await assertRevert(this.lockManager.getTransferableTokens(wallet, 0));
    });

    it('Should return 0 because tokens will be locked', async function() {
      await this.registryService.registerInvestor(WALLET_ID, 'wallet');
      await this.registryService.addWallet(owner, WALLET_ID);
      let realeseTime = latestTime() + 1000;
      await this.token.setCap(1000);
      await this.token.issueTokens(owner, 100);
      assert.equal(await this.token.balanceOf(owner), 100);
      await this.lockManager.addManualLockRecord(
        owner,
        100,
        REASON_STRING,
        realeseTime
      );
      assert.equal(
        await this.lockManager.getTransferableTokens(owner, realeseTime - 100),
        0
      );
    });

    it('Should return 100 because tokens will be unlocked', async function() {
      await this.registryService.registerInvestor(WALLET_ID, 'wallet');
      await this.registryService.addWallet(owner, WALLET_ID);
      let realeseTime = latestTime() + 1000;
      await this.token.setCap(1000);
      await this.token.issueTokens(owner, 100);
      assert.equal(await this.token.balanceOf(owner), 100);
      await this.lockManager.addManualLockRecord(
        owner,
        100,
        REASON_STRING,
        realeseTime
      );
      assert.equal(
        await this.lockManager.getTransferableTokens(owner, realeseTime + 1000),
        100
      );
    });

    it('Should return correct values when tokens will be locked with multiple locks', async function() {
      await this.registryService.registerInvestor(WALLET_ID, 'wallet');
      await this.registryService.addWallet(owner, WALLET_ID);
      let realeseTime = latestTime() + 1000;
      await this.token.setCap(1000);
      await this.token.issueTokens(owner, 300);
      assert.equal(await this.token.balanceOf(owner), 300);
      await this.lockManager.addManualLockRecord(
        owner,
        100,
        REASON_STRING,
        realeseTime + 100
      );
      await this.lockManager.addManualLockRecord(
        owner,
        100,
        REASON_STRING,
        realeseTime + 200
      );
      assert.equal(
        await this.lockManager.getTransferableTokens(owner, latestTime()),
        100
      );
      assert.equal(
        await this.lockManager.getTransferableTokens(owner, realeseTime + 101),
        200
      );
      assert.equal(
        await this.lockManager.getTransferableTokens(owner, realeseTime + 201),
        300
      );
    });
  });
});
