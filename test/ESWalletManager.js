import assertRevert from './helpers/assertRevert';
const EternalStorage = artifacts.require('EternalStorage');
const ESWalletManager = artifacts.require('ESWalletManager');
const ESTrustService = artifacts.require('ESTrustService');

const NONE = 0;
const MASTER = 1;
const ISSUER = 2;
const EXCHANGE = 4;


const TRUST_SERVICE=1;

contract('ESWalletManager', function ([owner, wallet, issuerAccount, issuerWallet, exchangeAccount, exchangeWallet, noneAccount, noneWallet, platformWallet]) {
  beforeEach(async function () {
    this.storage = await EternalStorage.new();
    this.trustService = await ESTrustService.new(this.storage.address, 'DSTokenTestTrustManager');
    this.walletManager = await ESWalletManager.new(this.storage.address, 'DSTokenTestWalletManager');
    await this.storage.adminAddRole(this.trustService.address, 'write');
    await this.storage.adminAddRole(this.walletManager.address, 'write');
    await this.trustService.initialize();
    await this.walletManager.setDSService(TRUST_SERVICE,this.trustService.address);

    await this.trustService.setRole(issuerAccount, ISSUER);
    await this.trustService.setRole(exchangeAccount, EXCHANGE);
  });

  describe('Add issuer wallet:', function () {
    it(`Trying to add the issuer wallet with MASTER - ${MASTER} permissions`, async function () {
      const role =  await this.trustService.getRole(owner);
      assert.equal(role.c[0], MASTER);

      const { logs } = await this.walletManager.addIssuerWallet(wallet);

      assert.equal(logs[0].args._wallet, wallet);
      assert.equal(logs[0].event, 'DSWalletManagerSpecialWalletAdded');

      // TODO: Understand why we can`t get the type of the wallet.
      const { typeLogs } = await this.walletManager.getWalletType(wallet);
      console.log(typeLogs)
    });

    it(`Trying to add the issuer wallet with ISSUER - ${ISSUER} permissions`, async function () {
      const role =  await this.trustService.getRole(issuerAccount);
      assert.equal(role.c[0], ISSUER);

      const { logs } = await this.walletManager.addIssuerWallet(issuerWallet, { from: issuerAccount });

      assert.equal(logs[0].args._wallet, issuerWallet);
      assert.equal(logs[0].event, 'DSWalletManagerSpecialWalletAdded');
    });

    describe('Add issuer wallet: negative tests', function () {
      it(`Trying to add the issuer wallet with NONE - ${NONE} permissions - should be the error`, async function () {
        const role =  await this.trustService.getRole(noneAccount);
        assert.equal(role.c[0], NONE);

        await assertRevert(this.walletManager.addIssuerWallet(issuerWallet, { from: noneAccount }));
      });

      it(`Trying to add the issuer wallet with EXCHANGE - ${EXCHANGE} permissions - should be the error`, async function () {
        const role =  await this.trustService.getRole(exchangeAccount);
        assert.equal(role.c[0], EXCHANGE);

        await assertRevert(this.walletManager.addIssuerWallet(exchangeWallet, { from: exchangeAccount }));
      });

      it(`Trying to add the same ISSUER wallet - should be the error`, async function () {
        const { logs } = await this.walletManager.addIssuerWallet(issuerWallet, { from: issuerAccount });

        assert.equal(logs[0].args._wallet, issuerWallet);
        assert.equal(logs[0].event, 'DSWalletManagerSpecialWalletAdded');

        await assertRevert(this.walletManager.addIssuerWallet(issuerWallet));
      });
    });
  });

  describe('Add platform wallet:', function () {
    it(`Trying to add the platform wallet with MASTER - ${MASTER} permissions`, async function () {
      const role = await this.trustService.getRole(owner);
      assert.equal(role.c[0], MASTER);

      const { logs } = await this.walletManager.addPlatformWallet(issuerWallet);

      assert.equal(logs[0].args._wallet, issuerWallet);
      assert.equal(logs[0].event, 'DSWalletManagerSpecialWalletAdded');
    });

    it(`Trying to add the platform wallet with ISSUER - ${ISSUER} permissions`, async function () {
      const role =  await this.trustService.getRole(issuerAccount);
      assert.equal(role.c[0], ISSUER);

      const { logs } = await this.walletManager.addPlatformWallet(issuerWallet, { from: issuerAccount });

      assert.equal(logs[0].args._wallet, issuerWallet);
      assert.equal(logs[0].event, 'DSWalletManagerSpecialWalletAdded');
    });

    describe('Add platform wallet: negative tests', function () {
      it(`Trying to add the platform wallet with NONE - ${NONE} permissions - should be the error`, async function () {
        const role =  await this.trustService.getRole(noneAccount);
        assert.equal(role.c[0], NONE);

        await assertRevert(this.walletManager.addPlatformWallet(issuerWallet, { from: noneAccount }));
      });

      it(`Trying to add the platform wallet with EXCHANGE - ${EXCHANGE} permissions - should be the error`, async function () {
        const role =  await this.trustService.getRole(exchangeAccount);
        assert.equal(role.c[0], EXCHANGE);

        await assertRevert(this.walletManager.addPlatformWallet(exchangeWallet, { from: exchangeAccount }));
      });

      it(`Trying to add the same platform wallet - should be the error`, async function () {
        const { logs } = await this.walletManager.addPlatformWallet(issuerWallet, { from: issuerAccount });

        assert.equal(logs[0].args._wallet, issuerWallet);
        assert.equal(logs[0].event, 'DSWalletManagerSpecialWalletAdded');

        await assertRevert(this.walletManager.addPlatformWallet(issuerWallet));
      });
    });
  });

  describe('Add exchange wallet:', function () {
    it(`Trying to add the exchange wallet with MASTER - ${MASTER} permissions`, async function () {
      const role = await this.trustService.getRole(owner);
      assert.equal(role.c[0], MASTER);

      const { logs } = await this.walletManager.addExchangeWallet(issuerWallet, exchangeAccount);

      assert.equal(logs[0].args._wallet, issuerWallet);
      assert.equal(logs[0].event, 'DSWalletManagerSpecialWalletAdded');
    });

    it(`Trying to add the exchange wallet with ISSUER - ${ISSUER} permissions`, async function () {
      const role =  await this.trustService.getRole(issuerAccount);
      assert.equal(role.c[0], ISSUER);

      const { logs } = await this.walletManager.addExchangeWallet(exchangeWallet, exchangeAccount, { from: issuerAccount });

      assert.equal(logs[0].args._wallet, exchangeWallet);
      assert.equal(logs[0].event, 'DSWalletManagerSpecialWalletAdded');
    });

    describe('Add exchange wallet: negative tests', function () {
      it(`Trying to add the exchange wallet with NONE - ${NONE} permissions - should be the error`, async function () {
        const role =  await this.trustService.getRole(noneAccount);
        assert.equal(role.c[0], NONE);

        await assertRevert(this.walletManager.addExchangeWallet(issuerWallet, noneAccount, { from: noneAccount }));
      });

      it(`Trying to add the exchange wallet with EXCHANGE - ${EXCHANGE} permissions - should be the error`, async function () {
        const role =  await this.trustService.getRole(exchangeAccount);
        assert.equal(role.c[0], EXCHANGE);

        await assertRevert(this.walletManager.addExchangeWallet(exchangeWallet, exchangeAccount, { from: exchangeAccount }));
      });

      it(`Trying to add the same exchange wallet - should be the error`, async function () {
        await assertRevert(this.walletManager.addExchangeWallet(exchangeWallet, exchangeAccount, { from: exchangeAccount }));
      });
    });
  });
});
