const assertRevert = require('../../utils/assertRevert');
const EternalStorage = artifacts.require('DSEternalStorageVersioned');
const ESStandardToken = artifacts.require('DSTokenVersioned');
const ESComplianceServiceNotRegulated = artifacts.require(
  'ESComplianceServiceNotRegulatedVersioned'
);
const ESTrustService = artifacts.require('ESTrustServiceVersioned');
const ESWalletManager = artifacts.require('ESWalletManagerVersioned');
const ESLockManager = artifacts.require('ESLockManagerVersioned');
const ESRegistryService = artifacts.require('ESRegistryServiceVersioned');

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

// TODO: enable tests
contract.skip('ESStandardToken', function([
  _,
  owner,
  recipient,
  anotherAccount,
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
    this.registryService = await ESRegistryService.new(
      this.storage.address,
      'DSTokenTestRegistryService'
    );
    this.token = await ESStandardToken.new();
    await this.storage.adminAddRole(this.trustService.address, 'write');
    await this.storage.adminAddRole(this.complianceService.address, 'write');
    await this.storage.adminAddRole(this.walletManager.address, 'write');
    await this.storage.adminAddRole(this.lockManager.address, 'write');
    await this.storage.adminAddRole(this.registryService.address, 'write');
    await this.storage.adminAddRole(this.token.address, 'write');
    await this.token.initialize(owner, 100, this.storage.address);
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
      LOCK_MANAGER,
      this.lockManager.address
    );
    await this.complianceService.setDSService(
      WALLET_MANAGER,
      this.walletManager.address
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
    await this.lockManager.setDSService(
      TRUST_SERVICE,
      this.trustService.address
    );
    await this.lockManager.setDSService(DS_TOKEN, this.token.address);
    await this.walletManager.setDSService(
      TRUST_SERVICE,
      this.trustService.address
    );
  });

  describe('total supply', function() {
    it('returns the total amount of tokens', async function() {
      const totalSupply = await this.token.totalSupply();

      assert.equal(totalSupply, 100);
    });
  });

  describe('balanceOf', function() {
    describe('when the requested account has no tokens', function() {
      it('returns zero', async function() {
        const balance = await this.token.balanceOf(anotherAccount);

        assert.equal(balance, 0);
      });
    });

    describe('when the requested account has some tokens', function() {
      it('returns the total amount of tokens', async function() {
        const balance = await this.token.balanceOf(owner);

        assert.equal(balance, 100);
      });
    });
  });

  describe('transfer', function() {
    describe('when the recipient is not the zero address', function() {
      const to = recipient;

      describe('when the sender does not have enough balance', function() {
        const amount = 101;

        it('reverts', async function() {
          await assertRevert(this.token.transfer(to, amount, {from: owner}));
        });
      });

      describe('when the sender has enough balance', function() {
        const amount = 100;

        it('transfers the requested amount', async function() {
          await this.token.transfer(to, amount, {from: owner});

          const senderBalance = await this.token.balanceOf(owner);
          assert.equal(senderBalance, 0);

          const recipientBalance = await this.token.balanceOf(to);
          assert.equal(recipientBalance, amount);
        });

        it('emits a transfer event', async function() {
          const {logs} = await this.token.transfer(to, amount, {
            from: owner,
          });

          assert.equal(logs.length, 1);
          assert.equal(logs[0].event, 'Transfer');
          assert.equal(logs[0].args.from, owner);
          assert.equal(logs[0].args.to, to);
          assert(logs[0].args.value.eq(amount));
        });
      });
    });

    describe('when the recipient is the zero address', function() {
      const to = ZERO_ADDRESS;

      it('reverts', async function() {
        await assertRevert(this.token.transfer(to, 100, {from: owner}));
      });
    });
  });

  describe('approve', function() {
    describe('when the spender is not the zero address', function() {
      const spender = recipient;

      describe('when the sender has enough balance', function() {
        const amount = 100;

        it('emits an approval event', async function() {
          const {logs} = await this.token.approve(spender, amount, {
            from: owner,
          });

          assert.equal(logs.length, 1);
          assert.equal(logs[0].event, 'Approval');
          assert.equal(logs[0].args.owner, owner);
          assert.equal(logs[0].args.spender, spender);
          assert(logs[0].args.value.eq(amount));
        });

        describe('when there was no approved amount before', function() {
          it('approves the requested amount', async function() {
            await this.token.approve(spender, amount, {from: owner});

            const allowance = await this.token.allowance(owner, spender);
            assert.equal(allowance, amount);
          });
        });

        describe('when the spender had an approved amount', function() {
          beforeEach(async function() {
            await this.token.approve(spender, 1, {from: owner});
          });

          it('approves the requested amount and replaces the previous one', async function() {
            await this.token.approve(spender, amount, {from: owner});

            const allowance = await this.token.allowance(owner, spender);
            assert.equal(allowance, amount);
          });
        });
      });

      describe('when the sender does not have enough balance', function() {
        const amount = 101;

        it('emits an approval event', async function() {
          const {logs} = await this.token.approve(spender, amount, {
            from: owner,
          });

          assert.equal(logs.length, 1);
          assert.equal(logs[0].event, 'Approval');
          assert.equal(logs[0].args.owner, owner);
          assert.equal(logs[0].args.spender, spender);
          assert(logs[0].args.value.eq(amount));
        });

        describe('when there was no approved amount before', function() {
          it('approves the requested amount', async function() {
            await this.token.approve(spender, amount, {from: owner});

            const allowance = await this.token.allowance(owner, spender);
            assert.equal(allowance, amount);
          });
        });

        describe('when the spender had an approved amount', function() {
          beforeEach(async function() {
            await this.token.approve(spender, 1, {from: owner});
          });

          it('approves the requested amount and replaces the previous one', async function() {
            await this.token.approve(spender, amount, {from: owner});

            const allowance = await this.token.allowance(owner, spender);
            assert.equal(allowance, amount);
          });
        });
      });
    });

    describe('when the spender is the zero address', function() {
      const amount = 100;
      const spender = ZERO_ADDRESS;

      it('approves the requested amount', async function() {
        await this.token.approve(spender, amount, {from: owner});

        const allowance = await this.token.allowance(owner, spender);
        assert.equal(allowance, amount);
      });

      it('emits an approval event', async function() {
        const {logs} = await this.token.approve(spender, amount, {
          from: owner,
        });

        assert.equal(logs.length, 1);
        assert.equal(logs[0].event, 'Approval');
        assert.equal(logs[0].args.owner, owner);
        assert.equal(logs[0].args.spender, spender);
        assert(logs[0].args.value.eq(amount));
      });
    });
  });

  describe('transfer from', function() {
    const spender = recipient;

    describe('when the recipient is not the zero address', function() {
      const to = anotherAccount;

      describe('when the spender has enough approved balance', function() {
        beforeEach(async function() {
          await this.token.approve(spender, 100, {from: owner});
        });

        describe('when the owner has enough balance', function() {
          const amount = 100;

          it('transfers the requested amount', async function() {
            await this.token.transferFrom(owner, to, amount, {from: spender});

            const senderBalance = await this.token.balanceOf(owner);
            assert.equal(senderBalance, 0);

            const recipientBalance = await this.token.balanceOf(to);
            assert.equal(recipientBalance, amount);
          });

          it('decreases the spender allowance', async function() {
            await this.token.transferFrom(owner, to, amount, {from: spender});

            const allowance = await this.token.allowance(owner, spender);
            assert(allowance.eq(0));
          });

          it('emits a transfer event', async function() {
            const {logs} = await this.token.transferFrom(owner, to, amount, {
              from: spender,
            });

            assert.equal(logs.length, 1);
            assert.equal(logs[0].event, 'Transfer');
            assert.equal(logs[0].args.from, owner);
            assert.equal(logs[0].args.to, to);
            assert(logs[0].args.value.eq(amount));
          });
        });

        describe('when the owner does not have enough balance', function() {
          const amount = 101;

          it('reverts', async function() {
            await assertRevert(
              this.token.transferFrom(owner, to, amount, {from: spender})
            );
          });
        });
      });

      describe('when the spender does not have enough approved balance', function() {
        beforeEach(async function() {
          await this.token.approve(spender, 99, {from: owner});
        });

        describe('when the owner has enough balance', function() {
          const amount = 100;

          it('reverts', async function() {
            await assertRevert(
              this.token.transferFrom(owner, to, amount, {from: spender})
            );
          });
        });

        describe('when the owner does not have enough balance', function() {
          const amount = 101;

          it('reverts', async function() {
            await assertRevert(
              this.token.transferFrom(owner, to, amount, {from: spender})
            );
          });
        });
      });
    });

    describe('when the recipient is the zero address', function() {
      const amount = 100;
      const to = ZERO_ADDRESS;

      beforeEach(async function() {
        await this.token.approve(spender, amount, {from: owner});
      });

      it('reverts', async function() {
        await assertRevert(
          this.token.transferFrom(owner, to, amount, {from: spender})
        );
      });
    });
  });

  describe('decrease approval', function() {
    describe('when the spender is not the zero address', function() {
      const spender = recipient;

      describe('when the sender has enough balance', function() {
        const amount = 100;

        it('emits an approval event', async function() {
          const {logs} = await this.token.decreaseApproval(spender, amount, {
            from: owner,
          });

          assert.equal(logs.length, 1);
          assert.equal(logs[0].event, 'Approval');
          assert.equal(logs[0].args.owner, owner);
          assert.equal(logs[0].args.spender, spender);
          assert(logs[0].args.value.eq(0));
        });

        describe('when there was no approved amount before', function() {
          it('keeps the allowance to zero', async function() {
            await this.token.decreaseApproval(spender, amount, {from: owner});

            const allowance = await this.token.allowance(owner, spender);
            assert.equal(allowance, 0);
          });
        });

        describe('when the spender had an approved amount', function() {
          beforeEach(async function() {
            await this.token.approve(spender, amount + 1, {from: owner});
          });

          it('decreases the spender allowance subtracting the requested amount', async function() {
            await this.token.decreaseApproval(spender, amount, {from: owner});

            const allowance = await this.token.allowance(owner, spender);
            assert.equal(allowance, 1);
          });
        });
      });

      describe('when the sender does not have enough balance', function() {
        const amount = 101;

        it('emits an approval event', async function() {
          const {logs} = await this.token.decreaseApproval(spender, amount, {
            from: owner,
          });

          assert.equal(logs.length, 1);
          assert.equal(logs[0].event, 'Approval');
          assert.equal(logs[0].args.owner, owner);
          assert.equal(logs[0].args.spender, spender);
          assert(logs[0].args.value.eq(0));
        });

        describe('when there was no approved amount before', function() {
          it('keeps the allowance to zero', async function() {
            await this.token.decreaseApproval(spender, amount, {from: owner});

            const allowance = await this.token.allowance(owner, spender);
            assert.equal(allowance, 0);
          });
        });

        describe('when the spender had an approved amount', function() {
          beforeEach(async function() {
            await this.token.approve(spender, amount + 1, {from: owner});
          });

          it('decreases the spender allowance subtracting the requested amount', async function() {
            await this.token.decreaseApproval(spender, amount, {from: owner});

            const allowance = await this.token.allowance(owner, spender);
            assert.equal(allowance, 1);
          });
        });
      });
    });

    describe('when the spender is the zero address', function() {
      const amount = 100;
      const spender = ZERO_ADDRESS;

      it('decreases the requested amount', async function() {
        await this.token.decreaseApproval(spender, amount, {from: owner});

        const allowance = await this.token.allowance(owner, spender);
        assert.equal(allowance, 0);
      });

      it('emits an approval event', async function() {
        const {logs} = await this.token.decreaseApproval(spender, amount, {
          from: owner,
        });

        assert.equal(logs.length, 1);
        assert.equal(logs[0].event, 'Approval');
        assert.equal(logs[0].args.owner, owner);
        assert.equal(logs[0].args.spender, spender);
        assert(logs[0].args.value.eq(0));
      });
    });
  });

  describe('increase approval', function() {
    const amount = 100;

    describe('when the spender is not the zero address', function() {
      const spender = recipient;

      describe('when the sender has enough balance', function() {
        it('emits an approval event', async function() {
          const {logs} = await this.token.increaseApproval(spender, amount, {
            from: owner,
          });

          assert.equal(logs.length, 1);
          assert.equal(logs[0].event, 'Approval');
          assert.equal(logs[0].args.owner, owner);
          assert.equal(logs[0].args.spender, spender);
          assert(logs[0].args.value.eq(amount));
        });

        describe('when there was no approved amount before', function() {
          it('approves the requested amount', async function() {
            await this.token.increaseApproval(spender, amount, {from: owner});

            const allowance = await this.token.allowance(owner, spender);
            assert.equal(allowance, amount);
          });
        });

        describe('when the spender had an approved amount', function() {
          beforeEach(async function() {
            await this.token.approve(spender, 1, {from: owner});
          });

          it('increases the spender allowance adding the requested amount', async function() {
            await this.token.increaseApproval(spender, amount, {from: owner});

            const allowance = await this.token.allowance(owner, spender);
            assert.equal(allowance, amount + 1);
          });
        });
      });

      describe('when the sender does not have enough balance', function() {
        const amount = 101;

        it('emits an approval event', async function() {
          const {logs} = await this.token.increaseApproval(spender, amount, {
            from: owner,
          });

          assert.equal(logs.length, 1);
          assert.equal(logs[0].event, 'Approval');
          assert.equal(logs[0].args.owner, owner);
          assert.equal(logs[0].args.spender, spender);
          assert(logs[0].args.value.eq(amount));
        });

        describe('when there was no approved amount before', function() {
          it('approves the requested amount', async function() {
            await this.token.increaseApproval(spender, amount, {from: owner});

            const allowance = await this.token.allowance(owner, spender);
            assert.equal(allowance, amount);
          });
        });

        describe('when the spender had an approved amount', function() {
          beforeEach(async function() {
            await this.token.approve(spender, 1, {from: owner});
          });

          it('increases the spender allowance adding the requested amount', async function() {
            await this.token.increaseApproval(spender, amount, {from: owner});

            const allowance = await this.token.allowance(owner, spender);
            assert.equal(allowance, amount + 1);
          });
        });
      });
    });

    describe('when the spender is the zero address', function() {
      const spender = ZERO_ADDRESS;

      it('approves the requested amount', async function() {
        await this.token.increaseApproval(spender, amount, {from: owner});

        const allowance = await this.token.allowance(owner, spender);
        assert.equal(allowance, amount);
      });

      it('emits an approval event', async function() {
        const {logs} = await this.token.increaseApproval(spender, amount, {
          from: owner,
        });

        assert.equal(logs.length, 1);
        assert.equal(logs[0].event, 'Approval');
        assert.equal(logs[0].args.owner, owner);
        assert.equal(logs[0].args.spender, spender);
        assert(logs[0].args.value.eq(amount));
      });
    });
  });
});
