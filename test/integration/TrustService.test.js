const { expectRevert } = require('@openzeppelin/test-helpers');
const roles = require('../../utils/globals').roles;
const deployContractBehindProxy = require('../utils').deployContractBehindProxy;

const testEntity1 = 'TestEntity1';
const testEntity2 = 'TestEntity2';
const testEntity3 = 'TestEntity3';

contract.only('TrustService', function ([
  ownerWallet,
  newOwnerWallet,
  issuerWallet,
  issuerWallet2,
  issuerWallet3,
  exchangeWallet,
  exchangeWallet2,
  exchangeWallet3,
  wallet1,
  wallet2,
  entityOwner1,
  entityOwner2,
  operator1,
  operator2,
  resource,
]) {
  before(async function () {
    await deployContractBehindProxy(
      artifacts.require('Proxy'),
      artifacts.require('TrustService'),
      this,
      'trustService',
    );
  });

  describe('Creation flow', function () {
    it('TrustService can`t be initialized twice', async function () {
      await expectRevert.unspecified(this.trustService.initialize());
    });

    it(`For the owner\`s account ${ownerWallet} - the role should be MASTER - ${roles.MASTER}`, async function () {
      const role = await this.trustService.getRole(ownerWallet);
      assert.equal(role.words[0], roles.MASTER);
    });
  });

  describe('Set owner flow', function () {
    it('Trying to call not by master', async function () {
      await expectRevert.unspecified(
        this.trustService.setServiceOwner(issuerWallet, { from: newOwnerWallet }),
      );
    });

    it(`Should transfer ownership (MASTER role) of the contract to ${newOwnerWallet}`, async function () {
      const { logs } = await this.trustService.setServiceOwner(newOwnerWallet);

      assert.equal(logs[0].args.targetAddress, ownerWallet);
      assert.equal(logs[0].event, 'DSTrustServiceRoleRemoved');
      assert.equal(logs[1].args.targetAddress, newOwnerWallet);
      assert.equal(logs[1].event, 'DSTrustServiceRoleAdded');
    });

    it('Trying to set the owner using the previous owner\'s account - should be the error', async function () {
      await expectRevert.unspecified(this.trustService.setServiceOwner(issuerWallet));
    });

    it(`The role for the previous owner - ${ownerWallet} should be set as NONE - ${roles.NONE}`, async function () {
      const role = await this.trustService.getRole(ownerWallet);
      assert.equal(role.words[0], roles.NONE);
    });

    it(`The role for the new owner - ${newOwnerWallet} should be set as MASTER - ${roles.MASTER}`, async function () {
      const role = await this.trustService.getRole(newOwnerWallet);
      assert.equal(role.words[0], roles.MASTER);
    });
  });

  describe('Set Role flow', function () {
    it('Trying to call not by master or issuer', async function () {
      await expectRevert.unspecified(
        this.trustService.setRole(issuerWallet, roles.ISSUER, {
          from: wallet1,
        }),
      );
    });

    it(`Trying to set MASTER role for this account - ${issuerWallet} - should be the error`, async function () {
      await expectRevert.unspecified(
        this.trustService.setRole(issuerWallet, roles.MASTER, {
          from: newOwnerWallet,
        }),
      );
    });

    it(`Trying to remove the role - set NONE role for this account - ${newOwnerWallet} - should be the error`, async function () {
      await expectRevert.unspecified(
        this.trustService.setRole(newOwnerWallet, roles.NONE, {
          from: newOwnerWallet,
        }),
      );
    });

    it(`Trying to set ISSUER role for this account - ${issuerWallet}`, async function () {
      const { logs } = await this.trustService.setRole(
        issuerWallet,
        roles.ISSUER,
        {
          from: newOwnerWallet,
        },
      );

      assert.equal(logs[0].args.targetAddress, issuerWallet);
      assert.equal(logs[0].event, 'DSTrustServiceRoleAdded');
    });

    describe('Check ISSUER role', function () {
      it(`The role for this account - ${issuerWallet} should be set as ISSUER - ${roles.ISSUER}`, async function () {
        const role = await this.trustService.getRole(issuerWallet);
        assert.equal(role.words[0], roles.ISSUER);
      });
    });

    it(`Trying to set EXCHANGE role for this account - ${exchangeWallet}`, async function () {
      const { logs } = await this.trustService.setRole(
        exchangeWallet,
        roles.EXCHANGE,
        { from: newOwnerWallet },
      );

      assert.equal(logs[0].args.targetAddress, exchangeWallet);
      assert.equal(logs[0].event, 'DSTrustServiceRoleAdded');
    });

    describe('Check EXCHANGE role', function () {
      it(`The role for this account - ${exchangeWallet} should be set as EXCHANGE - ${roles.EXCHANGE}`, async function () {
        const role = await this.trustService.getRole(exchangeWallet);
        assert.equal(role.words[0], roles.EXCHANGE);
      });
    });
  });

  describe('Set Bulk Roles flow', function () {
    it('Trying to call not by master or issuer', async function () {
      await expectRevert.unspecified(
        this.trustService.setRoles([issuerWallet2], [roles.ISSUER], {
          from: wallet1,
        }),
      );
    });

    it(`Trying to set MASTER roles for account ${issuerWallet2} - should be the error`, async function () {
      await expectRevert.unspecified(
        this.trustService.setRoles([issuerWallet2], [roles.MASTER], {
          from: newOwnerWallet,
        }),
      );
    });

    it(`Trying set NONE role in bulk mode for this account - ${newOwnerWallet} - should be the error`, async function () {
      await expectRevert.unspecified(
        this.trustService.setRoles([newOwnerWallet], [roles.NONE], {
          from: newOwnerWallet,
        }),
      );
    });

    it(`Trying to set ISSUER role for accounts ${issuerWallet2} and ${issuerWallet3}`, async function () {
      const { logs } = await this.trustService.setRoles(
        [issuerWallet2, issuerWallet3],
        [roles.ISSUER, roles.ISSUER],
        {
          from: newOwnerWallet,
        },
      );

      assert.equal(logs[0].args.targetAddress, issuerWallet2);
      assert.equal(logs[0].event, 'DSTrustServiceRoleAdded');
      assert.equal(logs[1].args.targetAddress, issuerWallet3);
      assert.equal(logs[1].event, 'DSTrustServiceRoleAdded');
    });

    describe('Check ISSUER role', function () {
      it(`The role for accounts ${issuerWallet2} and ${issuerWallet3} should be set as ISSUER`, async function () {
        const role = await this.trustService.getRole(issuerWallet2);
        assert.equal(role.words[0], roles.ISSUER);
        const role2 = await this.trustService.getRole(issuerWallet3);
        assert.equal(role2.words[0], roles.ISSUER);
      });
    });

    it(`Trying to set EXCHANGE roles for accounts ${exchangeWallet2} and ${exchangeWallet3}`, async function () {
      const { logs } = await this.trustService.setRoles(
        [exchangeWallet2,exchangeWallet3 ],
        [roles.EXCHANGE, roles.EXCHANGE],
        { from: newOwnerWallet },
      );

      assert.equal(logs[0].args.targetAddress, exchangeWallet2);
      assert.equal(logs[0].event, 'DSTrustServiceRoleAdded');
      assert.equal(logs[1].args.targetAddress, exchangeWallet3);
      assert.equal(logs[1].event, 'DSTrustServiceRoleAdded');
    });

    describe('Check EXCHANGE role', function () {
      it(`The role for accounts ${exchangeWallet2} and ${exchangeWallet3} should be set as EXCHANGE`, async function () {
        const role = await this.trustService.getRole(exchangeWallet2);
        assert.equal(role.words[0], roles.EXCHANGE);
        const role2 = await this.trustService.getRole(exchangeWallet3);
        assert.equal(role2.words[0], roles.EXCHANGE);
      });
    });
  });

  describe('Remove Role flow', function () {
    before(async function () {
      await this.trustService.setRole(wallet1, roles.ISSUER, {
        from: newOwnerWallet,
      });
      await this.trustService.setRole(wallet2, roles.EXCHANGE, {
        from: newOwnerWallet,
      });
    });

    it(`Trying to remove the role using EXCHANGE account - ${exchangeWallet} - should be the error`, async function () {
      await expectRevert.unspecified(
        this.trustService.removeRole(exchangeWallet, { from: exchangeWallet }),
      );
    });

    it(`Trying to remove the role using NONE account - ${ownerWallet} - should be the error`, async function () {
      await expectRevert.unspecified(
        this.trustService.removeRole(exchangeWallet, { from: ownerWallet }),
      );
    });

    describe('Remove role using ISSUER account', function () {
      it(`The role before removing - should be EXCHANGE - ${roles.ISSUER}`, async function () {
        const role = await this.trustService.getRole(wallet1);
        assert.equal(role.words[0], roles.ISSUER);
      });

      it(`Trying to remove the role using ISSUER account - ${issuerWallet}`, async function () {
        const { logs } = await this.trustService.removeRole(wallet1, {
          from: issuerWallet,
        });

        assert.equal(logs[0].args.targetAddress, wallet1);
        assert.equal(logs[0].event, 'DSTrustServiceRoleRemoved');
      });

      it(`The role after removing - should be NONE - ${roles.NONE}`, async function () {
        const role = await this.trustService.getRole(wallet1);
        assert.equal(role.words[0], roles.NONE);
      });
    });

    describe('Remove role using MASTER account', function () {
      it(`The role before removing - should be EXCHANGE - ${roles.EXCHANGE}`, async function () {
        const role = await this.trustService.getRole(wallet2);
        assert.equal(role.words[0], roles.EXCHANGE);
      });

      it(`Trying to remove the role using MASTER account - ${newOwnerWallet}`, async function () {
        const { logs } = await this.trustService.removeRole(wallet2, {
          from: newOwnerWallet,
        });

        assert.equal(logs[0].args.targetAddress, wallet2);
        assert.equal(logs[0].event, 'DSTrustServiceRoleRemoved');
      });

      it(`The role after removing - should be NONE - ${roles.NONE}`, async function () {
        const role = await this.trustService.getRole(wallet2);
        assert.equal(role.words[0], roles.NONE);
      });
    });
  });

  describe('Entities owners', function () {
    it('Should add an entity', async function () {
      await this.trustService.setServiceOwner(ownerWallet, {
        from: newOwnerWallet,
      });
      await this.trustService.addEntity(testEntity1, entityOwner1);

      assert.equal(
        await this.trustService.getEntityByOwner(entityOwner1),
        testEntity1,
      );
    });

    it('Should fail if trying to add the same entity again', async function () {
      await expectRevert.unspecified(
        this.trustService.addEntity(testEntity1, entityOwner1),
      );
    });

    it('Should fail to add an entity when sender is unauthorized', async function () {
      await expectRevert.unspecified(
        this.trustService.addEntity(testEntity1, entityOwner1),
        { from: wallet1 },
      );
    });

    it('Should fail trying to add a new entity with an existing entity owner', async function () {
      await expectRevert.unspecified(
        this.trustService.addEntity(testEntity2, entityOwner1),
      );
    });

    it('Should change the entity owner', async function () {
      await this.trustService.changeEntityOwner(
        testEntity1,
        entityOwner1,
        entityOwner2,
      );

      assert.equal(await this.trustService.getEntityByOwner(entityOwner1), '');
      assert.equal(
        await this.trustService.getEntityByOwner(entityOwner2),
        testEntity1,
      );

      await this.trustService.changeEntityOwner(
        testEntity1,
        entityOwner2,
        entityOwner1,
      );
    });

    it('Should fail to change the entity owner when sender is unauthorized', async function () {
      await expectRevert.unspecified(
        this.trustService.changeEntityOwner(
          testEntity1,
          entityOwner1,
          entityOwner2,
          { from: wallet1 },
        ),
      );
    });

    it('Should fail to change the entity owner when sender is a different entity owner', async function () {
      await this.trustService.addEntity(testEntity2, entityOwner2);

      await expectRevert.unspecified(
        this.trustService.changeEntityOwner(
          testEntity1,
          entityOwner1,
          entityOwner2,
          { from: entityOwner2 },
        ),
      );
    });
  });

  describe('Entities operators', function () {
    it('Should add an operator when sender is master', async function () {
      await this.trustService.addOperator(testEntity1, operator1);

      assert.equal(
        await this.trustService.getEntityByOperator(operator1),
        testEntity1,
      );

      await this.trustService.removeOperator(testEntity1, operator1);
    });

    it('Should add an operator when sender is entity owner', async function () {
      await this.trustService.addOperator(testEntity1, operator1, {
        from: entityOwner1,
      });

      assert.equal(
        await this.trustService.getEntityByOperator(operator1),
        testEntity1,
      );

      await this.trustService.removeOperator(testEntity1, operator1);
    });

    it('Should fail to add an operator when sender is unauthorized', async function () {
      await expectRevert.unspecified(
        this.trustService.addOperator(testEntity1, operator1, {
          from: wallet1,
        }),
      );
    });

    it('Should fail to add an already existing operator', async function () {
      await this.trustService.addOperator(testEntity1, operator1);
      await expectRevert.unspecified(this.trustService.addOperator(testEntity1, operator1));
    });

    it('Should remove an operator when sender is master', async function () {
      await this.trustService.removeOperator(testEntity1, operator1);

      assert.equal(await this.trustService.getEntityByOperator(operator1), '');
    });

    it('Should remove an operator when sender is entity owner', async function () {
      await this.trustService.addOperator(testEntity1, operator1);
      await this.trustService.removeOperator(testEntity1, operator1, {
        from: entityOwner1,
      });

      assert.equal(await this.trustService.getEntityByOperator(operator1), '');
    });

    it('Should fail to remove an operator when sender is unauthorized', async function () {
      await this.trustService.addOperator(testEntity1, operator1);
      await expectRevert.unspecified(
        this.trustService.removeOperator(testEntity1, operator1, {
          from: wallet1,
        }),
      );
    });

    it('Should fail to remove a non existing operator', async function () {
      await expectRevert.unspecified(
        this.trustService.removeOperator(testEntity1, wallet1),
      );
    });
  });

  describe('Entities resources', function () {
    it('Should add a resource', async function () {
      await this.trustService.addResource(testEntity1, resource);

      assert.equal(
        await this.trustService.getEntityByResource(resource),
        testEntity1,
      );

      await this.trustService.removeResource(testEntity1, resource);
    });

    it('Should fail to add a resource when entity does not exist', async function () {
      await expectRevert.unspecified(this.trustService.addResource(testEntity3, resource));
    });

    it('Should fail to add a resource that already exist', async function () {
      await this.trustService.addResource(testEntity1, resource);
      await expectRevert.unspecified(this.trustService.addResource(testEntity1, resource));
    });

    it('Should fail to add a resource when sender is unauthorized', async function () {
      await expectRevert.unspecified(
        this.trustService.addResource(testEntity1, resource, { from: wallet1 }),
      );
    });

    it('Should remove a resource', async function () {
      await this.trustService.removeResource(testEntity1, resource);

      assert.equal(await this.trustService.getEntityByResource(resource), '');
    });

    it('Should fail to remove a resource that does not exist', async function () {
      await expectRevert.unspecified(
        this.trustService.removeResource(testEntity1, resource),
      );
    });

    it('Should fail to remove a resource when sender is unauthorized', async function () {
      await this.trustService.addResource(testEntity1, resource);
      await expectRevert.unspecified(
        this.trustService.removeResource(testEntity1, resource, { from: wallet1 }),
      );
    });

    it('Should verify that an owner can access a resource', async function () {
      assert.equal(
        await this.trustService.isResourceOwner(resource, entityOwner1),
        true,
      );
    });

    it('Should verify that an operator can access a resource', async function () {
      assert.equal(
        await this.trustService.isResourceOperator(resource, operator1),
        true,
      );
    });

    it('Should verify that an unauthorized owner cannot access a resource', async function () {
      assert.equal(
        await this.trustService.isResourceOwner(resource, entityOwner2),
        false,
      );
    });

    it('Should verify that an unauthorized operator cannot access a resource', async function () {
      assert.equal(
        await this.trustService.isResourceOperator(resource, operator2),
        false,
      );
    });
  });
});
