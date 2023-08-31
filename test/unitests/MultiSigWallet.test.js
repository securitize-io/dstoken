const MultiSigWallet = artifacts.require('MultiSigWallet');
const TestToken = artifacts.require('TestToken');
const lightwallet = require('eth-lightwallet');
const { expectRevert } = require('@openzeppelin/test-helpers');
const { MultiSigSigner } = require('../utils/specialSigners');

// eslint-disable-next-line max-len
// keccak256("MultiSigTransaction(address destination,uint256 value,bytes data,uint256 nonce,address executor,uint256 gasLimit)")
const TXTYPE_HASH = '0x3ee892349ae4bbe61dce18f95115b5dc02daf49204cc602458cd4c1f540d56d7';
// keccak256("Securitize Off-Chain Multisig Wallet")
const NAME_HASH = '0x46d502984e082ba64ca60958f0c45ceb3f34246aa789aa5e5ed15bced9fd4e89';
// keccak256("1")
const VERSION_HASH = '0xc89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc6';
// keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract,bytes32 salt)")
const EIP712DOMAINTYPE_HASH = '0xd87cd6ef79d4e2b95e15ce8abf732db51ec771f1ca2edccf22a46c729ac56472';
// keccak256("Securitize Off-Chain Multisig Wallet SALT")
const SALT = '0xb37745e66c38577667d690143f874b67afebdda0d4baa8b47e7ec4f32a43ff12';

const CHAINID = 1;
const seedPhrase = 'cereal face vapor scrub trash traffic disease region swim stick identify grant';
const password = '';
const ZEROADDR = '0x0000000000000000000000000000000000000000';

let multiSigSigner = null;

contract('MultiSigWallet', function (accounts) {
  let keyFromPw;
  let lightWalletKeyStore;
  let acct;
  let tokenInstance;
  let multisig;
  let initialNonce;
  let executor;
  const ISSUED_TOKENS = 1000000;
  const gasLimit = 200000000;
  const destinationAddress = accounts[1];
  const value = 0;

  before((done) => {
    lightwallet.keystore.createVault({
      hdPathString: 'm/44\'/60\'/0\'/0',
      seedPhrase,
      password,
    }, function (err, keystore) {
      lightWalletKeyStore = keystore;
      lightWalletKeyStore.keyFromPassword(password, function (e, privateKey) {
        keyFromPw = privateKey;
        lightWalletKeyStore.generateNewAddress(keyFromPw, 10);
        const acctWithout0x = lightWalletKeyStore.getAddresses();
        acct = acctWithout0x.map((a) => { return a; });
        acct.sort();

        multiSigSigner = new MultiSigSigner({
          nameHash: NAME_HASH,
          versionHash: VERSION_HASH,
          chainId: CHAINID,
          salt: SALT,
          eip712DomainTypeHash: EIP712DOMAINTYPE_HASH,
          txTypeHash: TXTYPE_HASH,
          lightWalletKeyStore,
          keyFromPw,
        });

        done();
      });
    });
  });

  describe('Multisig contract initialization', () => {
    beforeEach(async () => {
      const owners = [acct[0], acct[1], acct[2]];
      executor = acct[0];
      tokenInstance = await TestToken.new({ from: accounts[0] });
      assert.ok(tokenInstance);
    });

    it('SHOULD revert - Owners length > 10', async () => {
      const owners = [acct[0], acct[1], acct[2], acct[3], acct[4], acct[5], acct[6], acct[7], acct[8], acct[9], '0xef7073cbc1E6F4CC8CFA8f297e8e3cA53fa54537'];
      const threshold = 6;
      await expectRevert(MultiSigWallet.new(owners, threshold, CHAINID, { from: accounts[0] }), 'threshold not allowed');
    });

    it('SHOULD revert - Owners length = 1', async () => {
      const owners = [acct[0]];
      const threshold = 1;
      await expectRevert(MultiSigWallet.new(owners, threshold, CHAINID, { from: accounts[0] }), 'threshold not allowed');
    });

    it('SHOULD revert - Threshold > Owners length', async () => {
      const owners = [acct[0]];
      const threshold = 2;
      await expectRevert(MultiSigWallet.new(owners, threshold, CHAINID, { from: accounts[0] }), 'threshold not allowed');
    });

    it('SHOULD revert - Threshold <= Owners length / 2', async () => {
      const owners = [acct[0], acct[1], acct[2], acct[3]];
      const threshold = 2;
      await expectRevert(MultiSigWallet.new(owners, threshold, CHAINID, { from: accounts[0] }), 'threshold not allowed');
    });

    it('SHOULD revert - Duplicate Owner', async () => {
      const owners = [acct[0], acct[0], acct[1], ];
      const threshold = 2;
      await expectRevert(MultiSigWallet.new(owners, threshold, CHAINID, { from: accounts[0] }), 'duplicate owner');
    });

    it('SHOULD Multisig contract be properly instanced', async () => {
      const owners = [acct[0], acct[1], acct[2]];
      const threshold = 2;
      const multisig = await MultiSigWallet.new(owners, threshold, CHAINID, { from: accounts[0] });
      assert.ok(multisig);
    })

    it('SHOULD Multisig contract threshold be properly instanced with 100% of owners', async () => {
      const owners = [acct[0], acct[1], acct[2], acct[3], acct[4], acct[5], acct[6], acct[7], acct[8], acct[9]];
      const threshold = 10;
      const multisig = await MultiSigWallet.new(owners, 6, CHAINID, { from: accounts[0] });
      assert.ok(multisig);
    })
  });

  describe('Calling TestToken transactions with 3 owners and threshold = 2', () => {
    describe('WHEN transferring 1000000 TestToken with an off-chain multisig wallet', () => {
      beforeEach(async () => {
        const owners = [acct[0], acct[1], acct[2]];
        executor = acct[0];
        tokenInstance = await TestToken.new({ from: accounts[0] });
        assert.ok(tokenInstance);
        const threshold = 2;
        multisig = await MultiSigWallet.new(owners, threshold, CHAINID, { from: accounts[0] });

        initialNonce = await multisig.nonce.call();
        assert.equal(initialNonce.toNumber(), 0);

        const issueResult = await tokenInstance.issueTokens(
          multisig.address,
          ISSUED_TOKENS,
          { from: accounts[0] });

        assert.ok(issueResult);

        assert.equal(
          ISSUED_TOKENS,
          await tokenInstance.balanceOf(multisig.address),
        );

        assert.equal(
          0,
          await tokenInstance.balanceOf(destinationAddress),
        );
      });
      describe('AND two owners sign a TestToken.transfer() transaction', () => {
        it('SHOULD transfer tokens from MultiSigWallet to destinationAddress', async () => {
          const signers = [acct[0], acct[1]];

          const data = tokenInstance.contract.methods.transfer(
            destinationAddress,
            ISSUED_TOKENS).encodeABI();

          const sigs = multiSigSigner.doSign(
            signers.sort(),
            multisig.address,
            initialNonce.toNumber(),
            tokenInstance.address,
            value,
            data,
            executor,
            gasLimit);

          await multisig.execute(sigs.sigV,
            sigs.sigR,
            sigs.sigS,
            tokenInstance.address,
            value,
            data,
            executor,
            gasLimit,
            { from: executor, gasLimit });

          const newNonce = await multisig.nonce.call();
          assert.equal(initialNonce.toNumber() + 1, newNonce.toNumber());

          assert.equal(
            0,
            await tokenInstance.balanceOf(multisig.address),
          );

          assert.equal(
            ISSUED_TOKENS,
            await tokenInstance.balanceOf(destinationAddress),
          );
        });
      });
      describe('AND three owners sign a TestToken.transfer() transaction', () => {
        it('SHOULD transfer tokens from MultiSigWallet to destinationAddress', async () => {
          const signers = [acct[0], acct[1], acct[2]];
          const data = tokenInstance.contract.methods.transfer(
            destinationAddress,
            ISSUED_TOKENS).encodeABI();

          const sigs = multiSigSigner.doSign(
            signers.sort(),
            multisig.address,
            initialNonce.toNumber(),
            tokenInstance.address,
            value,
            data,
            executor,
            gasLimit);

          await multisig.execute(sigs.sigV,
            sigs.sigR,
            sigs.sigS,
            tokenInstance.address,
            value,
            data,
            executor,
            gasLimit,
            { from: executor, gasLimit });

          const newNonce = await multisig.nonce.call();
          assert.equal(initialNonce.toNumber() + 1, newNonce.toNumber());

          assert.equal(
            0,
            await tokenInstance.balanceOf(multisig.address),
          );

          assert.equal(
            ISSUED_TOKENS,
            await tokenInstance.balanceOf(destinationAddress),
          );
        });
      });
      describe('AND only one owner sign a TestToken.transfer() transaction', () => {
        it('SHOULD revert', async () => {
          const signers = [acct[0]];
          const data = tokenInstance.contract.methods.transfer(
            destinationAddress,
            ISSUED_TOKENS).encodeABI();

          const sigs = multiSigSigner.doSign(
            signers.sort(),
            multisig.address,
            initialNonce.toNumber(),
            tokenInstance.address,
            value,
            data,
            executor,
            gasLimit);
          await expectRevert.unspecified(
            multisig.execute(sigs.sigV,
              sigs.sigR,
              sigs.sigS,
              tokenInstance.address,
              value,
              data,
              executor,
              gasLimit,
              { from: executor, gasLimit }),
          );
        });
      });
      describe('AND one owner and one no owner sign a TestToken.transfer() transaction', () => {
        it('SHOULD revert', async () => {
          const signers = [acct[0], acct[9]];
          const data = tokenInstance.contract.methods.transfer(
            destinationAddress,
            ISSUED_TOKENS).encodeABI();

          const sigs = multiSigSigner.doSign(
            signers.sort(),
            multisig.address,
            initialNonce.toNumber(),
            tokenInstance.address,
            value,
            data,
            executor,
            gasLimit);
          await expectRevert.unspecified(
            multisig.execute(sigs.sigV,
              sigs.sigR,
              sigs.sigS,
              tokenInstance.address,
              value,
              data,
              executor,
              gasLimit,
              { from: executor, gasLimit }),
          );
        });
      });
      describe('AND two no owners sign a TestToken.transfer() transaction', () => {
        it('SHOULD revert', async () => {
          const noOwnerSigners = [acct[8], acct[9]];
          const data = tokenInstance.contract.methods.transfer(
            destinationAddress,
            ISSUED_TOKENS).encodeABI();

          const sigs = multiSigSigner.doSign(
            noOwnerSigners.sort(),
            multisig.address,
            initialNonce.toNumber(),
            tokenInstance.address,
            value,
            data,
            executor,
            gasLimit);
          await expectRevert.unspecified(
            multisig.execute(sigs.sigV,
              sigs.sigR,
              sigs.sigS,
              tokenInstance.address,
              value,
              data,
              executor,
              gasLimit,
              { from: executor, gasLimit }),
          );
        });
      });
    });
    describe('WHEN transferring 1000000 TestToken with a multisig wallet and ZERO address as executor', () => {
      beforeEach(async () => {
        const owners = [acct[0], acct[1], acct[2]];
        executor = acct[1];
        tokenInstance = await TestToken.new({ from: accounts[0] });
        assert.ok(tokenInstance);
        const threshold = 2;
        multisig = await MultiSigWallet.new(owners, threshold, CHAINID, { from: accounts[0] });

        initialNonce = await multisig.nonce.call();
        assert.equal(initialNonce.toNumber(), 0);

        const issueResult = await tokenInstance.issueTokens(
          multisig.address,
          ISSUED_TOKENS,
          { from: accounts[0] });

        assert.ok(issueResult);

        assert.equal(
          ISSUED_TOKENS,
          await tokenInstance.balanceOf(multisig.address),
        );

        assert.equal(
          0,
          await tokenInstance.balanceOf(destinationAddress),
        );
      });
      describe('AND two owners sign a TestToken.transfer() transaction', () => {
        it('SHOULD transfer tokens from MultiSigWallet to destinationAddress', async () => {
          const signers = [acct[0], acct[1]];

          const data = tokenInstance.contract.methods.transfer(
            destinationAddress,
            ISSUED_TOKENS).encodeABI();

          const sigs = multiSigSigner.doSign(
            signers.sort(),
            multisig.address,
            initialNonce.toNumber(),
            tokenInstance.address,
            value,
            data,
            ZEROADDR,
            gasLimit);

          await multisig.execute(sigs.sigV,
            sigs.sigR,
            sigs.sigS,
            tokenInstance.address,
            value,
            data,
            ZEROADDR,
            gasLimit,
            { from: executor, gasLimit });

          const newNonce = await multisig.nonce.call();
          assert.equal(initialNonce.toNumber() + 1, newNonce.toNumber());

          assert.equal(
            0,
            await tokenInstance.balanceOf(multisig.address),
          );

          assert.equal(
            ISSUED_TOKENS,
            await tokenInstance.balanceOf(destinationAddress),
          );
        });
      });
      describe('AND three owners sign a TestToken.transfer() transaction', () => {
        it('SHOULD transfer tokens from MultiSigWallet to destinationAddress', async () => {
          const signers = [acct[0], acct[1], acct[2]];
          const data = tokenInstance.contract.methods.transfer(
            destinationAddress,
            ISSUED_TOKENS).encodeABI();

          const sigs = multiSigSigner.doSign(
            signers.sort(),
            multisig.address,
            initialNonce.toNumber(),
            tokenInstance.address,
            value,
            data,
            ZEROADDR,
            gasLimit);

          await multisig.execute(sigs.sigV,
            sigs.sigR,
            sigs.sigS,
            tokenInstance.address,
            value,
            data,
            ZEROADDR,
            gasLimit,
            { from: executor, gasLimit });

          const newNonce = await multisig.nonce.call();
          assert.equal(initialNonce.toNumber() + 1, newNonce.toNumber());

          assert.equal(
            0,
            await tokenInstance.balanceOf(multisig.address),
          );

          assert.equal(
            ISSUED_TOKENS,
            await tokenInstance.balanceOf(destinationAddress),
          );
        });
      });
      describe('AND only one owner sign a TestToken.transfer() transaction', () => {
        it('SHOULD revert', async () => {
          const signers = [acct[0]];
          const data = tokenInstance.contract.methods.transfer(
            destinationAddress,
            ISSUED_TOKENS).encodeABI();

          const sigs = multiSigSigner.doSign(
            signers.sort(),
            multisig.address,
            initialNonce.toNumber(),
            tokenInstance.address,
            value,
            data,
            ZEROADDR,
            gasLimit);
          await expectRevert.unspecified(
            multisig.execute(sigs.sigV,
              sigs.sigR,
              sigs.sigS,
              tokenInstance.address,
              value,
              data,
              ZEROADDR,
              gasLimit,
              { from: executor, gasLimit }),
          );
        });
      });
      describe('AND one owner and one no owner sign a TestToken.transfer() transaction', () => {
        it('SHOULD revert', async () => {
          const signers = [acct[0], acct[9]];
          const data = tokenInstance.contract.methods.transfer(
            destinationAddress,
            ISSUED_TOKENS).encodeABI();

          const sigs = multiSigSigner.doSign(
            signers.sort(),
            multisig.address,
            initialNonce.toNumber(),
            tokenInstance.address,
            value,
            data,
            ZEROADDR,
            gasLimit);
          await expectRevert.unspecified(
            multisig.execute(sigs.sigV,
              sigs.sigR,
              sigs.sigS,
              tokenInstance.address,
              value,
              data,
              ZEROADDR,
              gasLimit,
              { from: executor, gasLimit }),
          );
        });
      });
      describe('AND two no owners sign a TestToken.transfer() transaction', () => {
        it('SHOULD revert', async () => {
          const noOwnerSigners = [acct[8], acct[9]];
          const data = tokenInstance.contract.methods.transfer(
            destinationAddress,
            ISSUED_TOKENS).encodeABI();

          const sigs = multiSigSigner.doSign(
            noOwnerSigners.sort(),
            multisig.address,
            initialNonce.toNumber(),
            tokenInstance.address,
            value,
            data,
            ZEROADDR,
            gasLimit);
          await expectRevert.unspecified(
            multisig.execute(sigs.sigV,
              sigs.sigR,
              sigs.sigS,
              tokenInstance.address,
              value,
              data,
              ZEROADDR,
              gasLimit,
              { from: executor, gasLimit }),
          );
        });
      });
    });
    describe('WHEN trying to transfer 1000000 TestToken with not signer-owner msg.sender', () => {
      const notSignerExecutor = accounts[0];

      beforeEach(async () => {
        const owners = [acct[0], acct[1], acct[2]];

        tokenInstance = await TestToken.new({ from: accounts[0] });
        assert.ok(tokenInstance);
        const threshold = 2;
        multisig = await MultiSigWallet.new(owners, threshold, CHAINID, { from: accounts[0] });

        initialNonce = await multisig.nonce.call();
        assert.equal(initialNonce.toNumber(), 0);

        const issueResult = await tokenInstance.issueTokens(
          multisig.address,
          ISSUED_TOKENS,
          { from: accounts[0] });

        assert.ok(issueResult);

        assert.equal(
          ISSUED_TOKENS,
          await tokenInstance.balanceOf(multisig.address),
        );

        assert.equal(
          0,
          await tokenInstance.balanceOf(destinationAddress),
        );
      });
      describe('AND two owners sign a TestToken.transfer() transaction', () => {
        it('SHOULD revert because msg.sender is not a signer-owner', async () => {
          const signers = [acct[0], acct[1]];

          const data = tokenInstance.contract.methods.transfer(
            destinationAddress,
            ISSUED_TOKENS).encodeABI();

          const sigs = multiSigSigner.doSign(
            signers.sort(),
            multisig.address,
            initialNonce.toNumber(),
            tokenInstance.address,
            value,
            data,
            notSignerExecutor,
            gasLimit);
          await expectRevert.unspecified(
            multisig.execute(sigs.sigV,
              sigs.sigR,
              sigs.sigS,
              tokenInstance.address,
              value,
              data,
              notSignerExecutor,
              gasLimit,
              { from: notSignerExecutor, gasLimit }),
          );

          const newNonce = await multisig.nonce.call();
          assert.equal(initialNonce.toNumber(), newNonce.toNumber());

          assert.equal(
            ISSUED_TOKENS,
            await tokenInstance.balanceOf(multisig.address),
          );

          assert.equal(
            0,
            await tokenInstance.balanceOf(destinationAddress),
          );
        });
      });
      describe('AND two owners sign a TestToken.transfer() transaction using ZERO address as executor', () => {
        it('SHOULD revert because msg.sender is not an owner-singer', async () => {
          const signers = [acct[0], acct[1]];

          const data = tokenInstance.contract.methods.transfer(
            destinationAddress,
            ISSUED_TOKENS).encodeABI();

          const sigs = multiSigSigner.doSign(
            signers.sort(),
            multisig.address,
            initialNonce.toNumber(),
            tokenInstance.address,
            value,
            data,
            ZEROADDR,
            gasLimit);

          await expectRevert.unspecified(
            multisig.execute(sigs.sigV,
              sigs.sigR,
              sigs.sigS,
              tokenInstance.address,
              value,
              data,
              ZEROADDR,
              gasLimit,
              { from: notSignerExecutor, gasLimit },
            ));

          const newNonce = await multisig.nonce.call();
          assert.equal(initialNonce.toNumber(), newNonce.toNumber());

          assert.equal(
            ISSUED_TOKENS,
            await tokenInstance.balanceOf(multisig.address),
          );

          assert.equal(
            0,
            await tokenInstance.balanceOf(destinationAddress),
          );
        });
      });
      describe('AND three owners sign a TestToken.transfer() transaction', () => {
        it('SHOULD revert because msg.sender is not an owner-singer', async () => {
          const signers = [acct[0], acct[1], acct[2]];
          const data = tokenInstance.contract.methods.transfer(
            destinationAddress,
            ISSUED_TOKENS).encodeABI();

          const sigs = multiSigSigner.doSign(
            signers.sort(),
            multisig.address,
            initialNonce.toNumber(),
            tokenInstance.address,
            value,
            data,
            notSignerExecutor,
            gasLimit);
          await expectRevert.unspecified(
            multisig.execute(sigs.sigV,
              sigs.sigR,
              sigs.sigS,
              tokenInstance.address,
              value,
              data,
              notSignerExecutor,
              gasLimit,
              { from: notSignerExecutor, gasLimit }),
          );

          const newNonce = await multisig.nonce.call();
          assert.equal(initialNonce.toNumber(), newNonce.toNumber());

          assert.equal(
            ISSUED_TOKENS,
            await tokenInstance.balanceOf(multisig.address),
          );

          assert.equal(
            0,
            await tokenInstance.balanceOf(destinationAddress),
          );
        });
      });
    });
  });
});
