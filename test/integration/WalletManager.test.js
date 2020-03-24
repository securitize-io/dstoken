const assertRevert = require("../utils/assertRevert");
const deployContracts = require("../utils").deployContracts;
const roles = require("../../utils/globals").roles;
const country = require("../fixtures").Country;

const ACCREDITATION_STATUS = 1;
const SLOTS = 3;

contract("WalletManager", function([
  owner,
  wallet,
  issuerWallet1,
  issuerWallet2,
  exchangeWallet1,
  exchangeWallet2,
  noneWallet
]) {
  beforeEach(async function() {
    await deployContracts(this, artifacts);
    await this.trustService.setRole(issuerWallet1, roles.ISSUER);
    await this.trustService.setRole(exchangeWallet1, roles.EXCHANGE);
  });

  describe("Add issuer wallet:", function() {
    it(`Trying to add the issuer wallet with MASTER - ${roles.MASTER} permissions`, async function() {
      const role = await this.trustService.getRole(owner);
      assert.equal(role.words[0], roles.MASTER);

      const {logs} = await this.walletManager.addIssuerWallet(wallet);

      assert.equal(logs[0].args.wallet, wallet);
      assert.equal(logs[0].event, "DSWalletManagerSpecialWalletAdded");

      assert.equal(await this.walletManager.getWalletType(wallet), 1);
    });

    it(`Trying to add the issuer wallet with ISSUER - ${roles.ISSUER} permissions`, async function() {
      const role = await this.trustService.getRole(issuerWallet1);
      assert.equal(role.words[0], roles.ISSUER);

      const {logs} = await this.walletManager.addIssuerWallet(issuerWallet2, {
        from: issuerWallet1
      });

      assert.equal(logs[0].args.wallet, issuerWallet2);
      assert.equal(logs[0].event, "DSWalletManagerSpecialWalletAdded");
    });

    describe("Add issuer wallet: negative tests", function() {
      it(`Trying to add the issuer wallet with NONE - ${roles.NONE} permissions - should be the error`, async function() {
        const role = await this.trustService.getRole(noneWallet);
        assert.equal(role.words[0], roles.NONE);

        await assertRevert(
          this.walletManager.addIssuerWallet(issuerWallet2, {
            from: noneWallet
          })
        );
      });

      it(`Trying to add the issuer wallet with EXCHANGE - ${roles.EXCHANGE} permissions - should be the error`, async function() {
        const role = await this.trustService.getRole(exchangeWallet1);
        assert.equal(role.words[0], roles.EXCHANGE);

        await assertRevert(
          this.walletManager.addIssuerWallet(exchangeWallet2, {
            from: exchangeWallet1
          })
        );
      });

      it(`Trying to add the same ISSUER wallet - should be the error`, async function() {
        const {logs} = await this.walletManager.addIssuerWallet(issuerWallet2, {
          from: issuerWallet1
        });

        assert.equal(logs[0].args.wallet, issuerWallet2);
        assert.equal(logs[0].event, "DSWalletManagerSpecialWalletAdded");

        await assertRevert(this.walletManager.addIssuerWallet(issuerWallet2));
      });
    });
  });

  describe("Add platform wallet:", function() {
    it(`Trying to add the platform wallet with MASTER - ${roles.MASTER} permissions`, async function() {
      const role = await this.trustService.getRole(owner);
      assert.equal(role.words[0], roles.MASTER);

      const {logs} = await this.walletManager.addPlatformWallet(issuerWallet2);

      assert.equal(logs[0].args.wallet, issuerWallet2);
      assert.equal(logs[0].event, "DSWalletManagerSpecialWalletAdded");
    });

    it(`Trying to add the platform wallet with ISSUER - ${roles.ISSUER} permissions`, async function() {
      const role = await this.trustService.getRole(issuerWallet1);
      assert.equal(role.words[0], roles.ISSUER);

      const {logs} = await this.walletManager.addPlatformWallet(issuerWallet2, {
        from: issuerWallet1
      });

      assert.equal(logs[0].args.wallet, issuerWallet2);
      assert.equal(logs[0].event, "DSWalletManagerSpecialWalletAdded");
    });

    describe("Add platform wallet: negative tests", function() {
      it(`Trying to add the platform wallet with NONE - ${roles.NONE} permissions - should be the error`, async function() {
        const role = await this.trustService.getRole(noneWallet);
        assert.equal(role.words[0], roles.NONE);

        await assertRevert(
          this.walletManager.addPlatformWallet(issuerWallet2, {
            from: noneWallet
          })
        );
      });

      it(`Trying to add the platform wallet with EXCHANGE - ${roles.EXCHANGE} permissions - should be the error`, async function() {
        const role = await this.trustService.getRole(exchangeWallet1);
        assert.equal(role.words[0], roles.EXCHANGE);

        await assertRevert(
          this.walletManager.addPlatformWallet(exchangeWallet2, {
            from: exchangeWallet1
          })
        );
      });

      it(`Trying to add the same platform wallet - should be the error`, async function() {
        const {logs} = await this.walletManager.addPlatformWallet(
          issuerWallet2,
          {from: issuerWallet1}
        );

        assert.equal(logs[0].args.wallet, issuerWallet2);
        assert.equal(logs[0].event, "DSWalletManagerSpecialWalletAdded");

        await assertRevert(this.walletManager.addPlatformWallet(issuerWallet2));
      });
    });
  });

  describe("Add exchange wallet:", function() {
    it(`Trying to add the exchange wallet with MASTER - ${roles.MASTER} permissions`, async function() {
      const role = await this.trustService.getRole(owner);
      assert.equal(role.words[0], roles.MASTER);

      const {logs} = await this.walletManager.addExchangeWallet(
        issuerWallet2,
        exchangeWallet1
      );

      assert.equal(logs[0].args.wallet, issuerWallet2);
      assert.equal(logs[0].event, "DSWalletManagerSpecialWalletAdded");
    });

    it(`Trying to add the exchange wallet with ISSUER - ${roles.ISSUER} permissions`, async function() {
      const role = await this.trustService.getRole(issuerWallet1);
      assert.equal(role.words[0], roles.ISSUER);

      const {logs} = await this.walletManager.addExchangeWallet(
        exchangeWallet2,
        exchangeWallet1,
        {from: issuerWallet1}
      );

      assert.equal(logs[0].args.wallet, exchangeWallet2);
      assert.equal(logs[0].event, "DSWalletManagerSpecialWalletAdded");
    });

    describe("Add exchange wallet: negative tests", function() {
      it(`Trying to add the exchange wallet with NONE - ${roles.NONE} permissions - should be the error`, async function() {
        const role = await this.trustService.getRole(noneWallet);
        assert.equal(role.words[0], roles.NONE);

        await assertRevert(
          this.walletManager.addExchangeWallet(issuerWallet2, noneWallet, {
            from: noneWallet
          })
        );
      });

      it(`Trying to add the exchange wallet with EXCHANGE - ${roles.EXCHANGE} permissions - should be the error`, async function() {
        const role = await this.trustService.getRole(exchangeWallet1);
        assert.equal(role.words[0], roles.EXCHANGE);

        await assertRevert(
          this.walletManager.addExchangeWallet(
            exchangeWallet2,
            exchangeWallet1,
            {from: exchangeWallet1}
          )
        );
      });

      it(`Trying to add the same exchange wallet - should be the error`, async function() {
        await assertRevert(
          this.walletManager.addExchangeWallet(
            exchangeWallet2,
            exchangeWallet1,
            {from: exchangeWallet1}
          )
        );
      });
    });
  });
  describe("Remove special wallet:", function() {
    it(`Trying to remove the wallet with MASTER - ${roles.MASTER} permissions`, async function() {
      const role = await this.trustService.getRole(owner);
      assert.equal(role.words[0], roles.MASTER);

      await this.walletManager.addIssuerWallet(wallet);

      const {logs} = await this.walletManager.removeSpecialWallet(wallet);

      assert.equal(logs[0].args.wallet, wallet);
      assert.equal(logs[0].event, "DSWalletManagerSpecialWalletRemoved");
    });

    it(`Trying to remove the wallet with ISSUER - ${roles.ISSUER} permissions`, async function() {
      const role = await this.trustService.getRole(issuerWallet1);
      assert.equal(role.words[0], roles.ISSUER);

      await this.walletManager.addIssuerWallet(issuerWallet2, {
        from: issuerWallet1
      });

      const {logs} = await this.walletManager.removeSpecialWallet(
        issuerWallet2,
        {from: issuerWallet1}
      );

      assert.equal(logs[0].args.wallet, issuerWallet2);
      assert.equal(logs[0].event, "DSWalletManagerSpecialWalletRemoved");
    });

    describe("Remove special wallet: negative tests", function() {
      it(`Trying to remove special wallet with NONE - ${roles.NONE} permissions - should be the error`, async function() {
        const role = await this.trustService.getRole(noneWallet);
        assert.equal(role.words[0], roles.NONE);

        await assertRevert(
          this.walletManager.removeSpecialWallet(noneWallet, {
            from: noneWallet
          })
        );
      });

      it(`Trying to add the exchange wallet with EXCHANGE - ${roles.EXCHANGE} permissions - should be the error`, async function() {
        const role = await this.trustService.getRole(exchangeWallet1);
        assert.equal(role.words[0], roles.EXCHANGE);

        await assertRevert(
          this.walletManager.removeSpecialWallet(exchangeWallet1, {
            from: exchangeWallet1
          })
        );
      });

      it(`Trying to add not empty account - should be the error`, async function() {
        // to do
      });
    });
  });

  describe("Set reserved slots:", function() {
    it(`Trying to set reserved slots with MASTER - ${roles.MASTER} permissions`, async function() {
      const role = await this.trustService.getRole(owner);
      assert.equal(role.words[0], roles.MASTER);

      const {logs} = await this.walletManager.setReservedSlots(
        wallet,
        country.USA,
        ACCREDITATION_STATUS,
        SLOTS
      );

      assert.equal(logs[0].args.wallet, wallet);
      assert.equal(logs[0].event, "DSWalletManagerReservedSlotsSet");

      assert.equal(
        await this.walletManager.getReservedSlots(
          wallet,
          country.USA,
          ACCREDITATION_STATUS
        ),
        SLOTS
      );
    });

    it(`Trying to set reserved slots with ISSUER - ${roles.ISSUER} permissions`, async function() {
      const role = await this.trustService.getRole(issuerWallet1);
      assert.equal(role.words[0], roles.ISSUER);

      const {logs} = await this.walletManager.setReservedSlots(
        wallet,
        country.USA,
        ACCREDITATION_STATUS,
        SLOTS,
        {from: issuerWallet1}
      );

      assert.equal(logs[0].args.wallet, wallet);
      assert.equal(logs[0].event, "DSWalletManagerReservedSlotsSet");

      assert.equal(
        await this.walletManager.getReservedSlots(
          wallet,
          country.USA,
          ACCREDITATION_STATUS
        ),
        SLOTS
      );
    });

    describe("Set reserved slots: negative tests", function() {
      it(`Trying to set reserved slots with NONE - ${roles.NONE} permissions - should be the error`, async function() {
        const role = await this.trustService.getRole(noneWallet);
        assert.equal(role.words[0], roles.NONE);

        await assertRevert(
          this.walletManager.setReservedSlots(
            noneWallet,
            country.USA,
            ACCREDITATION_STATUS,
            SLOTS,
            {from: noneWallet}
          )
        );
      });

      it(`Trying to set reserved slots with EXCHANGE - ${roles.EXCHANGE} permissions - should be the error`, async function() {
        const role = await this.trustService.getRole(exchangeWallet1);
        assert.equal(role.words[0], roles.EXCHANGE);

        await assertRevert(
          this.walletManager.setReservedSlots(
            exchangeWallet1,
            country.USA,
            ACCREDITATION_STATUS,
            SLOTS,
            {from: exchangeWallet1}
          )
        );
      });
    });
  });

  describe("Set reserved slots:", function() {
    it(`Should return correct value`, async function() {
      await this.walletManager.setReservedSlots(
        wallet,
        country.USA,
        ACCREDITATION_STATUS,
        SLOTS
      );
      assert.equal(
        await this.walletManager.getReservedSlots(
          wallet,
          country.USA,
          ACCREDITATION_STATUS
        ),
        SLOTS
      );
    });
  });
});
