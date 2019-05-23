const assertRevert = require('./helpers/assertRevert');
const EternalStorage = artifacts.require('DSEternalStorageVersioned');
const ESTrustService = artifacts.require('ESTrustServiceVersioned');

const NONE = 0;
const MASTER = 1;
const ISSUER = 2;
const EXCHANGE = 4;

contract('ESTrustService', function([
  owner,
  newOwner,
  issuerAccount,
  exchangeAccount,
  account1,
  account2,
]) {
  before(async function() {
    this.storage = await EternalStorage.new();
    this.trustService = await ESTrustService.new(
      this.storage.address,
      'DSTokenTestTrustManager'
    );
    await this.storage.adminAddRole(this.trustService.address, 'write');
    await this.trustService.initialize();
  });

  describe('Creation flow', function() {
    it('ESTrustService can`t be initialized twice', async function() {
      await assertRevert(this.trustService.initialize());
    });

    it(`For the owner\`s account ${owner} - the role should be MASTER - ${MASTER}`, async function() {
      const role = await this.trustService.getRole(owner);
      assert.equal(role.c[0], MASTER);
    });
  });

  describe('Set owner flow', function() {
    it(`Trying to call not by master`, async function() {
      await assertRevert(
        this.trustService.setOwner(issuerAccount, {from: newOwner})
      );
    });

    it(`Should transfer ownership (MASTER role) of the contract to ${newOwner}`, async function() {
      const {logs} = await this.trustService.setOwner(newOwner);

      assert.equal(logs[0].args._address, owner);
      assert.equal(logs[0].event, 'DSTrustServiceRoleRemoved');
      assert.equal(logs[1].args._address, newOwner);
      assert.equal(logs[1].event, 'DSTrustServiceRoleAdded');
    });

    it(`Trying to set the owner using the previous owner's account - should be the error`, async function() {
      await assertRevert(this.trustService.setOwner(issuerAccount));
    });

    it(`The role for the previous owner - ${owner} should be set as NONE - ${NONE}`, async function() {
      const role = await this.trustService.getRole(owner);
      assert.equal(role.c[0], NONE);
    });

    it(`The role for the new owner - ${newOwner} should be set as MASTER - ${MASTER}`, async function() {
      const role = await this.trustService.getRole(newOwner);
      assert.equal(role.c[0], MASTER);
    });
  });

  describe('Set Role flow', function() {
    it(`Trying to call not by master or issuer`, async function() {
      await assertRevert(
        this.trustService.setRole(issuerAccount, ISSUER, {from: account1})
      );
    });

    it(`Trying to set MASTER role for this account - ${issuerAccount} - should be the error`, async function() {
      await assertRevert(
        this.trustService.setRole(issuerAccount, MASTER, {from: newOwner})
      );
    });

    it(`Trying to remove the role - set NONE role for this account - ${newOwner} - should be the error`, async function() {
      await assertRevert(
        this.trustService.setRole(newOwner, NONE, {from: newOwner})
      );
    });

    it(`Trying to set ISSUER role for this account - ${issuerAccount}`, async function() {
      const {logs} = await this.trustService.setRole(issuerAccount, ISSUER, {
        from: newOwner,
      });

      assert.equal(logs[0].args._address, issuerAccount);
      assert.equal(logs[0].event, 'DSTrustServiceRoleAdded');
    });

    describe(`Check ISSUER role`, function() {
      it(`The role for this account - ${issuerAccount} should be set as ISSUER - ${ISSUER}`, async function() {
        const role = await this.trustService.getRole(issuerAccount);
        assert.equal(role.c[0], ISSUER);
      });
    });

    it(`Trying to set EXCHANGE role for this account - ${exchangeAccount}`, async function() {
      const {logs} = await this.trustService.setRole(
        exchangeAccount,
        EXCHANGE,
        {from: newOwner}
      );

      assert.equal(logs[0].args._address, exchangeAccount);
      assert.equal(logs[0].event, 'DSTrustServiceRoleAdded');
    });

    describe(`Check EXCHANGE role`, function() {
      it(`The role for this account - ${exchangeAccount} should be set as EXCHANGE - ${EXCHANGE}`, async function() {
        const role = await this.trustService.getRole(exchangeAccount);
        assert.equal(role.c[0], EXCHANGE);
      });
    });
  });

  describe('Remove Role flow', function() {
    before(async function() {
      await this.trustService.setRole(account1, ISSUER, {from: newOwner});
      await this.trustService.setRole(account2, EXCHANGE, {from: newOwner});
    });

    it(`Trying to remove the role using EXCHANGE account - ${exchangeAccount} - should be the error`, async function() {
      await assertRevert(
        this.trustService.removeRole(exchangeAccount, {from: exchangeAccount})
      );
    });

    it(`Trying to remove the role using NONE account - ${owner} - should be the error`, async function() {
      await assertRevert(
        this.trustService.removeRole(exchangeAccount, {from: owner})
      );
    });

    describe('Remove role using ISSUER account', function() {
      it(`The role before removing - should be ISSUER - ${ISSUER}`, async function() {
        const role = await this.trustService.getRole(account1);
        assert.equal(role.c[0], ISSUER);
      });

      it(`Trying to remove the role using ISSUER account - ${issuerAccount}`, async function() {
        const {logs} = await this.trustService.removeRole(account1, {
          from: issuerAccount,
        });

        assert.equal(logs[0].args._address, account1);
        assert.equal(logs[0].event, 'DSTrustServiceRoleRemoved');
      });

      it(`The role after removing - should be NONE - ${NONE}`, async function() {
        const role = await this.trustService.getRole(account1);
        assert.equal(role.c[0], NONE);
      });
    });

    describe('Remove role using MASTER account', function() {
      it(`The role before removing - should be EXCHANGE - ${EXCHANGE}`, async function() {
        const role = await this.trustService.getRole(account2);
        assert.equal(role.c[0], EXCHANGE);
      });

      it(`Trying to remove the role using MASTER account - ${newOwner}`, async function() {
        const {logs} = await this.trustService.removeRole(account2, {
          from: newOwner,
        });

        assert.equal(logs[0].args._address, account2);
        assert.equal(logs[0].event, 'DSTrustServiceRoleRemoved');
      });

      it(`The role after removing - should be NONE - ${NONE}`, async function() {
        const role = await this.trustService.getRole(account2);
        assert.equal(role.c[0], NONE);
      });
    });
  });
});
