import assertRevert from '../../helpers/assertRevert';
const EternalStorage = artifacts.require('EternalStorage');
const ESTrustService = artifacts.require('ESTrustService');
const ESComplianceServiceNotRegulated = artifacts.require('ESComplianceServiceNotRegulated');
const ESPausableToken = artifacts.require('DSToken');
const ESWalletManager = artifacts.require('ESWalletManager');
const ESLockManager = artifacts.require('ESLockManager');
const ESRegistryService = artifacts.require('ESRegistryService');

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

// TODO: enable tests
contract.skip('ESPausableToken', function ([_, owner, recipient, anotherAccount]) {
  beforeEach(async function () {
    this.storage = await EternalStorage.new();
    this.trustService = await ESTrustService.new(this.storage.address, 'DSTokenTestTrustManager');
    this.complianceService = await ESComplianceServiceNotRegulated.new(this.storage.address, 'DSTokenTestComplianceManager');
    this.walletManager = await ESWalletManager.new(this.storage.address, 'DSTokenTestWalletManager');
    this.lockManager = await ESLockManager.new(this.storage.address, 'DSTokenTestLockManager');
    this.registryService = await ESRegistryService.new(this.storage.address, 'DSTokenTestRegistryService');
    this.token = await ESPausableToken.new(this.storage.address, {from: owner});
    await this.storage.adminAddRole(this.trustService.address, 'write');
    await this.storage.adminAddRole(this.complianceService.address, 'write');
    await this.storage.adminAddRole(this.walletManager.address, 'write');
    await this.storage.adminAddRole(this.lockManager.address, 'write');
    await this.storage.adminAddRole(this.registryService.address, 'write');
    await this.storage.adminAddRole(this.token.address, 'write');
    await this.trustService.initialize();
    await this.trustService.setOwner(owner);
    await this.registryService.setDSService(TRUST_SERVICE,this.trustService.address);
    await this.complianceService.setDSService(TRUST_SERVICE,this.trustService.address);
    await this.lockManager.setDSService(TRUST_SERVICE,this.trustService.address);
    await this.walletManager.setDSService(TRUST_SERVICE,this.trustService.address);
    await this.token.setDSService(TRUST_SERVICE,this.trustService.address, {from: owner});
    await this.complianceService.setDSService(LOCK_MANAGER,this.lockManager.address, {from: owner});
    await this.complianceService.setDSService(WALLET_MANAGER,this.walletManager.address, {from: owner});
    await this.token.setDSService(COMPLIANCE_SERVICE,this.complianceService.address, {from: owner});
    await this.token.setDSService(LOCK_MANAGER,this.lockManager.address, {from: owner});
    await this.token.setDSService(WALLET_MANAGER,this.walletManager.address, {from: owner});
    await this.token.setDSService(REGISTRY_SERVICE,this.registryService.address, {from: owner});
    await this.complianceService.setDSService(DS_TOKEN,this.token.address, {from: owner});
    await this.lockManager.setDSService(DS_TOKEN, this.token.address, {from: owner});
    await this.token.initialize(owner, 100, {from: owner});
  });

  describe('pause', function () {
    describe('when the sender is the token owner', function () {
      const from = owner;

      describe('when the token is unpaused', function () {
        it('pauses the token', async function () {
          await this.token.pause({ from });

          const paused = await this.token.paused();
          assert.equal(paused, true);
        });

        it('emits a Pause event', async function () {
          const { logs } = await this.token.pause({ from });

          assert.equal(logs.length, 1);
          assert.equal(logs[0].event, 'Pause');
        });
      });

      describe('when the token is paused', function () {
        beforeEach(async function () {
          await this.token.pause({ from });
        });

        it('reverts', async function () {
          await assertRevert(this.token.pause({ from }));
        });
      });
    });

    describe('when the sender is not the token owner', function () {
      const from = anotherAccount;

      it('reverts', async function () {
        await assertRevert(this.token.pause({ from }));
      });
    });
  });

  describe('unpause', function () {
    describe('when the sender is the token owner', function () {
      const from = owner;

      describe('when the token is paused', function () {
        beforeEach(async function () {
          await this.token.pause({ from });
        });

        it('unpauses the token', async function () {
          await this.token.unpause({ from });

          const paused = await this.token.paused();
          assert.equal(paused, false);
        });

        it('emits an Unpause event', async function () {
          const { logs } = await this.token.unpause({ from });

          assert.equal(logs.length, 1);
          assert.equal(logs[0].event, 'Unpause');
        });
      });

      describe('when the token is unpaused', function () {
        it('reverts', async function () {
          await assertRevert(this.token.unpause({ from }));
        });
      });
    });

    describe('when the sender is not the token owner', function () {
      const from = anotherAccount;

      it('reverts', async function () {
        await assertRevert(this.token.unpause({ from }));
      });
    });
  });

  describe('pausable token', function () {
    const from = owner;

    describe('paused', function () {
      it('is not paused by default', async function () {
        const paused = await this.token.paused({ from });

        assert.equal(paused, false);
      });

      it('is paused after being paused', async function () {
        await this.token.pause({ from });
        const paused = await this.token.paused({ from });

        assert.equal(paused, true);
      });

      it('is not paused after being paused and then unpaused', async function () {
        await this.token.pause({ from });
        await this.token.unpause({ from });
        const paused = await this.token.paused();

        assert.equal(paused, false);
      });
    });

    describe('transfer', function () {
      it('allows to transfer when unpaused', async function () {
        await this.token.transfer(recipient, 100, { from: owner });

        const senderBalance = await this.token.balanceOf(owner);
        assert.equal(senderBalance, 0);

        const recipientBalance = await this.token.balanceOf(recipient);
        assert.equal(recipientBalance, 100);
      });

      it('allows to transfer when paused and then unpaused', async function () {
        await this.token.pause({ from: owner });
        await this.token.unpause({ from: owner });

        await this.token.transfer(recipient, 100, { from: owner });

        const senderBalance = await this.token.balanceOf(owner);
        assert.equal(senderBalance, 0);

        const recipientBalance = await this.token.balanceOf(recipient);
        assert.equal(recipientBalance, 100);
      });

      it('reverts when trying to transfer when paused', async function () {
        await this.token.pause({ from: owner });

        await assertRevert(this.token.transfer(recipient, 100, { from: owner }));
      });
    });

    describe('approve', function () {
      it('allows to approve when unpaused', async function () {
        await this.token.approve(anotherAccount, 40, { from: owner });

        const allowance = await this.token.allowance(owner, anotherAccount);
        assert.equal(allowance, 40);
      });

      it('allows to transfer when paused and then unpaused', async function () {
        await this.token.pause({ from: owner });
        await this.token.unpause({ from: owner });

        await this.token.approve(anotherAccount, 40, { from: owner });

        const allowance = await this.token.allowance(owner, anotherAccount);
        assert.equal(allowance, 40);
      });

      it('reverts when trying to transfer when paused', async function () {
        await this.token.pause({ from: owner });

        await assertRevert(this.token.approve(anotherAccount, 40, { from: owner }));
      });
    });

    describe('transfer from', function () {
      beforeEach(async function () {
        await this.token.approve(anotherAccount, 50, { from: owner });
      });

      it('allows to transfer from when unpaused', async function () {
        await this.token.transferFrom(owner, recipient, 40, { from: anotherAccount });

        const senderBalance = await this.token.balanceOf(owner);
        assert.equal(senderBalance, 60);

        const recipientBalance = await this.token.balanceOf(recipient);
        assert.equal(recipientBalance, 40);
      });

      it('allows to transfer when paused and then unpaused', async function () {
        await this.token.pause({ from: owner });
        await this.token.unpause({ from: owner });

        await this.token.transferFrom(owner, recipient, 40, { from: anotherAccount });

        const senderBalance = await this.token.balanceOf(owner);
        assert.equal(senderBalance, 60);

        const recipientBalance = await this.token.balanceOf(recipient);
        assert.equal(recipientBalance, 40);
      });

      it('reverts when trying to transfer from when paused', async function () {
        await this.token.pause({ from: owner });

        await assertRevert(this.token.transferFrom(owner, recipient, 40, { from: anotherAccount }));
      });
    });

    describe('decrease approval', function () {
      beforeEach(async function () {
        await this.token.approve(anotherAccount, 100, { from: owner });
      });

      it('allows to decrease approval when unpaused', async function () {
        await this.token.decreaseApproval(anotherAccount, 40, { from: owner });

        const allowance = await this.token.allowance(owner, anotherAccount);
        assert.equal(allowance, 60);
      });

      it('allows to decrease approval when paused and then unpaused', async function () {
        await this.token.pause({ from: owner });
        await this.token.unpause({ from: owner });

        await this.token.decreaseApproval(anotherAccount, 40, { from: owner });

        const allowance = await this.token.allowance(owner, anotherAccount);
        assert.equal(allowance, 60);
      });

      it('reverts when trying to transfer when paused', async function () {
        await this.token.pause({ from: owner });

        await assertRevert(this.token.decreaseApproval(anotherAccount, 40, { from: owner }));
      });
    });

    describe('increase approval', function () {
      beforeEach(async function () {
        await this.token.approve(anotherAccount, 100, { from: owner });
      });

      it('allows to increase approval when unpaused', async function () {
        await this.token.increaseApproval(anotherAccount, 40, { from: owner });

        const allowance = await this.token.allowance(owner, anotherAccount);
        assert.equal(allowance, 140);
      });

      it('allows to increase approval when paused and then unpaused', async function () {
        await this.token.pause({ from: owner });
        await this.token.unpause({ from: owner });

        await this.token.increaseApproval(anotherAccount, 40, { from: owner });

        const allowance = await this.token.allowance(owner, anotherAccount);
        assert.equal(allowance, 140);
      });

      it('reverts when trying to increase approval when paused', async function () {
        await this.token.pause({ from: owner });

        await assertRevert(this.token.increaseApproval(anotherAccount, 40, { from: owner }));
      });
    });
  });
});
