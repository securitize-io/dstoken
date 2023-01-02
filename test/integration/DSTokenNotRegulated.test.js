const DSToken = artifacts.require('DSToken');
const { expectRevert } = require('@openzeppelin/test-helpers');
const snapshotsHelper = require('../utils/snapshots');
const complianceType = require('../../utils/globals').complianceType;
const lockManagerType = require('../../utils/globals').lockManagerType;
const deployContracts = require('../utils').deployContracts;
const investorId = require('../fixtures').InvestorId;

contract('DSToken (not regulated)', function ([
  _,
  owner,
  recipient,
  wallet1,
  wallet2,
  wallet3,
]) {
  let snapshot;
  let snapshotId;
  before(async function () {

  });

  beforeEach(async function () {
    snapshot = await snapshotsHelper.takeSnapshot();
    snapshotId = snapshot.result;
  });

  afterEach(async function () {
    await snapshotsHelper.revertToSnapshot(snapshotId);
  });

  describe('Compliance not regulated', function () {
    before(async function () {
      await deployContracts(
        this,
        artifacts,
        complianceType.NOT_REGULATED,
        lockManagerType.WALLET,
      );
    });

    // beforeEach(async function () {
    //   snapshot = await snapshotsHelper.takeSnapshot();
    //   snapshotId = snapshot.result;
    // });
    //
    // afterEach(async function () {
    //   await snapshotsHelper.revertToSnapshot(snapshotId);
    // });

    describe('Creation', function () {
      it('Should get the basic details of the token correctly', async function () {
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
        await expectRevert.unspecified(token.initialize('DSTokenMock', 'DST', 18));
      });
    });

    describe('Token Initialization', function () {
      it('Token cannot be initialized twice', async function () {
        await expectRevert(this.token.initialize(), 'Contract instance has already been initialized');
      });
    });

    describe('Cap', function () {
      beforeEach(async function () {
        await this.token.setCap(1000);
      });

      it('Cannot be set twice', async function () {
        await expectRevert.unspecified(this.token.setCap(1000));
      });

      it('Doesn\'t prevent issuing tokens within limit', async function () {
        await this.token.issueTokens(owner, 500);
        await this.token.issueTokens(owner, 500);
      });

      it('Prevents issuing too many tokens', async function () {
        await this.token.issueTokens(owner, 500);
        await expectRevert.unspecified(this.token.issueTokens(owner, 501));
      });
    });

    describe('Issuance', function () {
      beforeEach(async function () {
        await this.token.issueTokens(owner, 100);
      });

      it('Should issue tokens to a wallet', async function () {
        const balance = await this.token.balanceOf(owner);
        assert.equal(balance, 100);
      });

      it('Should issue unlocked tokens to a wallet', async function () {
        const balance = await this.token.balanceOf(owner);
        assert.equal(balance, 100);
        await this.token.transfer(recipient, 100, { from: owner });
        const ownerBalance = await this.token.balanceOf(owner);
        assert.equal(ownerBalance, 0);
        const recipientBalance = await this.token.balanceOf(recipient);
        assert.equal(recipientBalance, 100);
      });

      it('Should record the number of total issued token correctly', async function () {
        await this.token.issueTokens(owner, 100);
        await this.token.issueTokens(owner, 100);

        const totalIssued = await this.token.totalIssued();

        assert.equal(totalIssued, 300);
      });

      it('Should record the number of total issued token correctly after burn', async function () {
        await this.token.issueTokens(owner, 100);
        await this.token.issueTokens(owner, 100);
        await this.token.burn(owner, 100, 'test burn');

        const totalIssued = await this.token.totalIssued();
        assert.equal(totalIssued, 300);
      });
    });

    describe('Burn', function () {
      it('Should burn tokens from a specific wallet', async function () {
        await this.token.issueTokens(owner, 100);
        await this.token.burn(owner, 50, 'test burn');

        const balance = await this.token.balanceOf(owner);
        assert.equal(balance, 50);
      });
    });

    describe('Seize', function () {
      beforeEach(async function () {
        await this.walletManager.addIssuerWallet(recipient);
        await this.token.issueTokens(owner, 100);
      });

      it('Should seize tokens correctly', async function () {
        await this.token.seize(owner, recipient, 50, 'test seize');

        const ownerBalance = await this.token.balanceOf(owner);
        assert.equal(ownerBalance, 50);
        const recipientBalance = await this.token.balanceOf(recipient);
        assert.equal(recipientBalance, 50);
      });

      it('Cannot seize more than balance', async function () {
        await expectRevert.unspecified(
          this.token.seize(owner, recipient, 150, 'test seize'),
        );
      });
    });
  });

  describe('Compliance whitelisted', function () {
    before(async function () {
      await deployContracts(
        this,
        artifacts,
        complianceType.WHITELIST,
        lockManagerType.WALLET,
      );
    });

    // beforeEach(async function () {
    //   snapshotWhiteListed = await snapshotsHelper.takeSnapshot();
    //   snapshotWhiteListedId = snapshot.result;
    // });
    //
    // afterEach(async function () {
    //   await snapshotsHelper.revertToSnapshot(snapshotWhiteListedId);
    // });

    describe('Investors', function () {
      it('Create several investors into the Registry service and assign them wallets', async function () {
        await this.registryService.registerInvestor(
          investorId.US_INVESTOR_ID,
          investorId.US_INVESTOR_COLLISION_HASH,
        );
        await this.registryService.registerInvestor(
          investorId.US_INVESTOR_ID_2,
          investorId.US_INVESTOR_COLLISION_HASH_2,
        );
        await this.registryService.addWallet(
          wallet2,
          investorId.US_INVESTOR_ID,
        );
        await this.registryService.addWallet(
          wallet3,
          investorId.US_INVESTOR_ID_2,
        );
      });

      it('Issue Tokens to investors in the Registry (should work)', async function () {
        await this.registryService.registerInvestor(
          investorId.US_INVESTOR_ID,
          investorId.US_INVESTOR_COLLISION_HASH,
        );
        await this.registryService.registerInvestor(
          investorId.US_INVESTOR_ID_2,
          investorId.US_INVESTOR_COLLISION_HASH_2,
        );
        await this.registryService.addWallet(
          wallet2,
          investorId.US_INVESTOR_ID,
        );
        await this.registryService.addWallet(
          wallet3,
          investorId.US_INVESTOR_ID_2,
        );
        await this.token.setCap(1000);
        await this.token.issueTokens(wallet2, 100);
        await this.token.issueTokens(wallet3, 100);
        assert.equal(await this.token.balanceOf(wallet2), 100);
        assert.equal(await this.token.balanceOf(wallet3), 100);
      });

      it('Issue Tokens to investor not in the Registry (should fail) and add new investor and try issuing again (should now work)', async function () {
        await this.token.setCap(1000);
        await expectRevert.unspecified(this.token.issueTokens(wallet1, 100));
        await this.registryService.registerInvestor(
          investorId.US_INVESTOR_ID,
          'anotherAccount',
        );
        await this.registryService.addWallet(
          wallet1,
          investorId.US_INVESTOR_ID,
        );
        await this.token.issueTokens(wallet1, 100);
        assert.equal(await this.token.balanceOf(wallet1), 100);
      });

      it('Transfer tokens from investor in registry to wallet not in registry (should fail)', async function () {
        await this.registryService.registerInvestor(
          investorId.US_INVESTOR_ID,
          investorId.US_INVESTOR_COLLISION_HASH,
        );
        await this.registryService.addWallet(
          wallet2,
          investorId.US_INVESTOR_ID,
        );
        await this.token.setCap(1000);
        await this.token.issueTokens(wallet2, 100);
        assert.equal(await this.token.balanceOf(wallet2), 100);
        await expectRevert.unspecified(this.token.transfer(wallet3, 100, { from: wallet2 }));
      });

      it('Test function getInvestor(InvestorID) before/after adding an investor', async function () {
        assert.equal(await this.registryService.getInvestor(wallet2), 0);
        assert.equal(await this.registryService.getInvestor(wallet3), 0);
        await this.registryService.registerInvestor(
          investorId.US_INVESTOR_ID,
          investorId.US_INVESTOR_COLLISION_HASH,
        );
        await this.registryService.registerInvestor(
          investorId.US_INVESTOR_ID_2,
          investorId.US_INVESTOR_COLLISION_HASH_2,
        );
        await this.registryService.addWallet(
          wallet2,
          investorId.US_INVESTOR_ID,
        );
        await this.registryService.addWallet(
          wallet3,
          investorId.US_INVESTOR_ID_2,
        );
        assert.equal(
          await this.registryService.getInvestor(wallet2),
          investorId.US_INVESTOR_ID,
        );
        assert.equal(
          await this.registryService.getInvestor(wallet3),
          investorId.US_INVESTOR_ID_2,
        );
      });

      it('Transfer tokens from wallet in registry to wallet in registry (should work)', async function () {
        await this.registryService.registerInvestor(
          investorId.US_INVESTOR_ID,
          investorId.US_INVESTOR_COLLISION_HASH,
        );
        await this.registryService.registerInvestor(
          investorId.US_INVESTOR_ID_2,
          investorId.US_INVESTOR_COLLISION_HASH_2,
        );
        await this.registryService.addWallet(
          wallet2,
          investorId.US_INVESTOR_ID,
        );
        await this.registryService.addWallet(
          wallet3,
          investorId.US_INVESTOR_ID_2,
        );
        await this.token.setCap(1000);
        await this.token.issueTokens(wallet2, 100);
        assert.equal(await this.token.balanceOf(wallet2), 100);
        await this.token.transfer(wallet3, 100, { from: wallet2 });
        assert.equal(await this.token.balanceOf(wallet2), 0);
        assert.equal(await this.token.balanceOf(wallet3), 100);
      });
    });
  });
});
