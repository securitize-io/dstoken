const assertRevert = require('../utils/assertRevert');
const EternalStorage = artifacts.require('DSEternalStorageVersioned');
const ESWalletManager = artifacts.require('ESWalletManagerVersioned');
const ESRegistryService = artifacts.require('ESRegistryServiceVersioned');
const ESTrustService = artifacts.require('ESTrustServiceVersioned');

const NONE = 0;
const MASTER = 1;
const ISSUER = 2;
const EXCHANGE = 4;
const COUNTRY = 'UA';
const ACCREDITATION_STATUS = 1;
const SLOTS = 3;

const TRUST_SERVICE = 1;
const DS_TOKEN = 2;
const REGISTRY_SERVICE = 4;
const COMPLIANCE_SERVICE = 8;
const COMMS_SERVICE = 16;
const WALLET_MANAGER = 32;
const LOCK_MANAGER = 64;
const ISSUANCE_INFORMATION_MANAGER = 128;

contract('ESWalletManager', function([
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
    this.walletManager = await ESWalletManager.new(
      this.storage.address,
      'DSTokenTestWalletManager'
    );
    this.registryService = await ESRegistryService.new(
      this.storage.address,
      'DSTokenTestESRegistryService'
    );
    await this.storage.adminAddRole(this.trustService.address, 'write');
    await this.storage.adminAddRole(this.walletManager.address, 'write');
    await this.storage.adminAddRole(this.registryService.address, 'write');
    await this.trustService.initialize();
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

    await this.trustService.setRole(issuerAccount, ISSUER);
    await this.trustService.setRole(exchangeAccount, EXCHANGE);
  });

  describe('Add issuer wallet:', function() {
    it(`Trying to add the issuer wallet with MASTER - ${MASTER} permissions`, async function() {
      const role = await this.trustService.getRole(owner);
      assert.equal(role.c[0], MASTER);

      const {logs} = await this.walletManager.addIssuerWallet(wallet);

      assert.equal(logs[0].args._wallet, wallet);
      assert.equal(logs[0].event, 'DSWalletManagerSpecialWalletAdded');

      assert.equal(await this.walletManager.getWalletType(wallet), 1);
    });

    it(`Trying to add the issuer wallet with ISSUER - ${ISSUER} permissions`, async function() {
      const role = await this.trustService.getRole(issuerAccount);
      assert.equal(role.c[0], ISSUER);

      const {logs} = await this.walletManager.addIssuerWallet(issuerWallet, {
        from: issuerAccount,
      });

      assert.equal(logs[0].args._wallet, issuerWallet);
      assert.equal(logs[0].event, 'DSWalletManagerSpecialWalletAdded');
    });

    describe('Add issuer wallet: negative tests', function() {
      it(`Trying to add the issuer wallet with NONE - ${NONE} permissions - should be the error`, async function() {
        const role = await this.trustService.getRole(noneAccount);
        assert.equal(role.c[0], NONE);

        await assertRevert(
          this.walletManager.addIssuerWallet(issuerWallet, {
            from: noneAccount,
          })
        );
      });

      it(`Trying to add the issuer wallet with EXCHANGE - ${EXCHANGE} permissions - should be the error`, async function() {
        const role = await this.trustService.getRole(exchangeAccount);
        assert.equal(role.c[0], EXCHANGE);

        await assertRevert(
          this.walletManager.addIssuerWallet(exchangeWallet, {
            from: exchangeAccount,
          })
        );
      });

      it(`Trying to add the same ISSUER wallet - should be the error`, async function() {
        const {logs} = await this.walletManager.addIssuerWallet(issuerWallet, {
          from: issuerAccount,
        });

        assert.equal(logs[0].args._wallet, issuerWallet);
        assert.equal(logs[0].event, 'DSWalletManagerSpecialWalletAdded');

        await assertRevert(this.walletManager.addIssuerWallet(issuerWallet));
      });
    });
  });

  describe('Add platform wallet:', function() {
    it(`Trying to add the platform wallet with MASTER - ${MASTER} permissions`, async function() {
      const role = await this.trustService.getRole(owner);
      assert.equal(role.c[0], MASTER);

      const {logs} = await this.walletManager.addPlatformWallet(issuerWallet);

      assert.equal(logs[0].args._wallet, issuerWallet);
      assert.equal(logs[0].event, 'DSWalletManagerSpecialWalletAdded');
    });

    it(`Trying to add the platform wallet with ISSUER - ${ISSUER} permissions`, async function() {
      const role = await this.trustService.getRole(issuerAccount);
      assert.equal(role.c[0], ISSUER);

      const {logs} = await this.walletManager.addPlatformWallet(issuerWallet, {
        from: issuerAccount,
      });

      assert.equal(logs[0].args._wallet, issuerWallet);
      assert.equal(logs[0].event, 'DSWalletManagerSpecialWalletAdded');
    });

    describe('Add platform wallet: negative tests', function() {
      it(`Trying to add the platform wallet with NONE - ${NONE} permissions - should be the error`, async function() {
        const role = await this.trustService.getRole(noneAccount);
        assert.equal(role.c[0], NONE);

        await assertRevert(
          this.walletManager.addPlatformWallet(issuerWallet, {
            from: noneAccount,
          })
        );
      });

      it(`Trying to add the platform wallet with EXCHANGE - ${EXCHANGE} permissions - should be the error`, async function() {
        const role = await this.trustService.getRole(exchangeAccount);
        assert.equal(role.c[0], EXCHANGE);

        await assertRevert(
          this.walletManager.addPlatformWallet(exchangeWallet, {
            from: exchangeAccount,
          })
        );
      });

      it(`Trying to add the same platform wallet - should be the error`, async function() {
        const {logs} = await this.walletManager.addPlatformWallet(
          issuerWallet,
          {from: issuerAccount}
        );

        assert.equal(logs[0].args._wallet, issuerWallet);
        assert.equal(logs[0].event, 'DSWalletManagerSpecialWalletAdded');

        await assertRevert(this.walletManager.addPlatformWallet(issuerWallet));
      });
    });
  });

  describe('Add exchange wallet:', function() {
    it(`Trying to add the exchange wallet with MASTER - ${MASTER} permissions`, async function() {
      const role = await this.trustService.getRole(owner);
      assert.equal(role.c[0], MASTER);

      const {logs} = await this.walletManager.addExchangeWallet(
        issuerWallet,
        exchangeAccount
      );

      assert.equal(logs[0].args._wallet, issuerWallet);
      assert.equal(logs[0].event, 'DSWalletManagerSpecialWalletAdded');
    });

    it(`Trying to add the exchange wallet with ISSUER - ${ISSUER} permissions`, async function() {
      const role = await this.trustService.getRole(issuerAccount);
      assert.equal(role.c[0], ISSUER);

      const {logs} = await this.walletManager.addExchangeWallet(
        exchangeWallet,
        exchangeAccount,
        {from: issuerAccount}
      );

      assert.equal(logs[0].args._wallet, exchangeWallet);
      assert.equal(logs[0].event, 'DSWalletManagerSpecialWalletAdded');
    });

    describe('Add exchange wallet: negative tests', function() {
      it(`Trying to add the exchange wallet with NONE - ${NONE} permissions - should be the error`, async function() {
        const role = await this.trustService.getRole(noneAccount);
        assert.equal(role.c[0], NONE);

        await assertRevert(
          this.walletManager.addExchangeWallet(issuerWallet, noneAccount, {
            from: noneAccount,
          })
        );
      });

      it(`Trying to add the exchange wallet with EXCHANGE - ${EXCHANGE} permissions - should be the error`, async function() {
        const role = await this.trustService.getRole(exchangeAccount);
        assert.equal(role.c[0], EXCHANGE);

        await assertRevert(
          this.walletManager.addExchangeWallet(
            exchangeWallet,
            exchangeAccount,
            {from: exchangeAccount}
          )
        );
      });

      it(`Trying to add the same exchange wallet - should be the error`, async function() {
        await assertRevert(
          this.walletManager.addExchangeWallet(
            exchangeWallet,
            exchangeAccount,
            {from: exchangeAccount}
          )
        );
      });
    });
  });
  describe('Remove special wallet:', function() {
    it(`Trying to remove the wallet with MASTER - ${MASTER} permissions`, async function() {
      const role = await this.trustService.getRole(owner);
      assert.equal(role.c[0], MASTER);

      await this.walletManager.addIssuerWallet(wallet);

      const {logs} = await this.walletManager.removeSpecialWallet(wallet);

      assert.equal(logs[0].args._wallet, wallet);
      assert.equal(logs[0].event, 'DSWalletManagerSpecialWalletRemoved');
    });

    it(`Trying to remove the wallet with ISSUER - ${ISSUER} permissions`, async function() {
      const role = await this.trustService.getRole(issuerAccount);
      assert.equal(role.c[0], ISSUER);

      await this.walletManager.addIssuerWallet(issuerWallet, {
        from: issuerAccount,
      });

      const {logs} = await this.walletManager.removeSpecialWallet(
        issuerWallet,
        {from: issuerAccount}
      );

      assert.equal(logs[0].args._wallet, issuerWallet);
      assert.equal(logs[0].event, 'DSWalletManagerSpecialWalletRemoved');
    });

    describe('Remove special wallet: negative tests', function() {
      it(`Trying to remove special wallet with NONE - ${NONE} permissions - should be the error`, async function() {
        const role = await this.trustService.getRole(noneAccount);
        assert.equal(role.c[0], NONE);

        await assertRevert(
          this.walletManager.removeSpecialWallet(noneAccount, {
            from: noneAccount,
          })
        );
      });

      it(`Trying to add the exchange wallet with EXCHANGE - ${EXCHANGE} permissions - should be the error`, async function() {
        const role = await this.trustService.getRole(exchangeAccount);
        assert.equal(role.c[0], EXCHANGE);

        await assertRevert(
          this.walletManager.removeSpecialWallet(exchangeAccount, {
            from: exchangeAccount,
          })
        );
      });

      it(`Trying to add not empty account - should be the error`, async function() {
        // to do
      });
    });
  });

  describe('Set reserved slots:', function() {
    it(`Trying to set reserved slots with MASTER - ${MASTER} permissions`, async function() {
      const role = await this.trustService.getRole(owner);
      assert.equal(role.c[0], MASTER);

      const {logs} = await this.walletManager.setReservedSlots(
        wallet,
        COUNTRY,
        ACCREDITATION_STATUS,
        SLOTS
      );

      assert.equal(logs[0].args._wallet, wallet);
      assert.equal(logs[0].event, 'DSWalletManagerReservedSlotsSet');

      assert.equal(
        await this.walletManager.getReservedSlots(
          wallet,
          COUNTRY,
          ACCREDITATION_STATUS
        ),
        SLOTS
      );
    });

    it(`Trying to set reserved slots with ISSUER - ${ISSUER} permissions`, async function() {
      const role = await this.trustService.getRole(issuerAccount);
      assert.equal(role.c[0], ISSUER);

      const {logs} = await this.walletManager.setReservedSlots(
        wallet,
        COUNTRY,
        ACCREDITATION_STATUS,
        SLOTS,
        {from: issuerAccount}
      );

      assert.equal(logs[0].args._wallet, wallet);
      assert.equal(logs[0].event, 'DSWalletManagerReservedSlotsSet');

      assert.equal(
        await this.walletManager.getReservedSlots(
          wallet,
          COUNTRY,
          ACCREDITATION_STATUS
        ),
        SLOTS
      );
    });

    describe('Set reserved slots: negative tests', function() {
      it(`Trying to set reserved slots with NONE - ${NONE} permissions - should be the error`, async function() {
        const role = await this.trustService.getRole(noneAccount);
        assert.equal(role.c[0], NONE);

        await assertRevert(
          this.walletManager.setReservedSlots(
            noneAccount,
            COUNTRY,
            ACCREDITATION_STATUS,
            SLOTS,
            {from: noneAccount}
          )
        );
      });

      it(`Trying to set reserved slots with EXCHANGE - ${EXCHANGE} permissions - should be the error`, async function() {
        const role = await this.trustService.getRole(exchangeAccount);
        assert.equal(role.c[0], EXCHANGE);

        await assertRevert(
          this.walletManager.setReservedSlots(
            exchangeAccount,
            COUNTRY,
            ACCREDITATION_STATUS,
            SLOTS,
            {from: exchangeAccount}
          )
        );
      });
    });
  });

  describe('Set reserved slots:', function() {
    it(`Should return correct value`, async function() {
      await this.walletManager.setReservedSlots(
        wallet,
        COUNTRY,
        ACCREDITATION_STATUS,
        SLOTS
      );
      assert.equal(
        await this.walletManager.getReservedSlots(
          wallet,
          COUNTRY,
          ACCREDITATION_STATUS
        ),
        SLOTS
      );
    });
  });
});
