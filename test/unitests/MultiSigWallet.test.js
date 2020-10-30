const MultiSigWallet = artifacts.require('MultiSigWallet');
const TestToken = artifacts.require('TestToken');
const lightwallet = require('eth-lightwallet');
const Promise = require('bluebird');
const assertRevert = require('../utils/assertRevert');

const web3SendTransaction = Promise.promisify(web3.eth.sendTransaction);
const web3GetBalance = Promise.promisify(web3.eth.getBalance);

let DOMAIN_SEPARATOR;

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

contract('MultiSigWallet', function (accounts) {
  let keyFromPw;
  let acct;
  let lightWalletKeyStore;

  const doSign = function (signers, multisigAddr, nonce, destinationAddr, value, data, executor, gasLimit) {
    const domainData = EIP712DOMAINTYPE_HASH +
      NAME_HASH.slice(2) +
      VERSION_HASH.slice(2) +
      CHAINID.toString('16').padStart(64, '0') +
      multisigAddr.slice(2).padStart(64, '0') +
      SALT.slice(2);
    DOMAIN_SEPARATOR = web3.utils.sha3(domainData, { encoding: 'hex' });
    let txInput = TXTYPE_HASH +
      destinationAddr.slice(2).padStart(64, '0') +
      value.toString('16').padStart(64, '0') +
      web3.utils.sha3(data, { encoding: 'hex' }).slice(2) +
      nonce.toString('16').padStart(64, '0') +
      executor.slice(2).padStart(64, '0') +
      gasLimit.toString('16').padStart(64, '0');
    let txInputHash = web3.utils.sha3(txInput, { encoding: 'hex' });
    let input = '0x19' + '01' + DOMAIN_SEPARATOR.slice(2) + txInputHash.slice(2);
    let hash = web3.utils.sha3(input, { encoding: 'hex' });
    let signatures = [];
    let sigV = [];
    let sigR = [];
    let sigS = [];

    for (var i = 0; i < signers.length; i++) {
      let sig = lightwallet.signing.signMsgHash(lightWalletKeyStore, keyFromPw, hash, signers[i]);
      signatures.push(sig);
      sigV.push(sig.v);
      sigR.push('0x' + sig.r.toString('hex'));
      sigS.push('0x' + sig.s.toString('hex'));
    }

    return { sigV: sigV, sigR: sigR, sigS: sigS };
  };

  before((done) => {
    lightwallet.keystore.createVault({
      hdPathString: 'm/44\'/60\'/0\'/0',
      seedPhrase: seedPhrase,
      password: password,
    }, function (err, keystore) {
      lightWalletKeyStore = keystore;
      lightWalletKeyStore.keyFromPassword(password, function (e, privateKey) {
        keyFromPw = privateKey;
        lightWalletKeyStore.generateNewAddress(keyFromPw, 10);
        let acctWithout0x = lightWalletKeyStore.getAddresses();
        acct = acctWithout0x.map((a) => { return a; });
        acct.sort();
        console.log(acct);
        done();
      });
    });
  });

  describe('Calling TestToken transactions with 3 owners and threshold = 2', () => {
    describe('WHEN transferring 1000000 TestToken with an off-chain multisig wallet', () => {
      let tokenInstance;
      let multisig;
      let initialNonce;
      const threshold = 2;
      const ISSUED_TOKENS = 1000000;
      const gasLimit = 200000000;
      const executor = accounts[0];
      const destinationAddress = accounts[1];
      const value = 0;

      beforeEach(async () => {
        const owners = [acct[0], acct[1], acct[2]];

        tokenInstance = await TestToken.new({ from: accounts[0] });
        assert.ok(tokenInstance);

        multisig = await MultiSigWallet.new(owners, threshold, CHAINID, { from: accounts[0] });
        await web3SendTransaction({
          from: accounts[0],
          to: multisig.address,
          value: web3.utils.toWei(web3.utils.toBN(5), 'ether'),
        });

        initialNonce = await multisig.nonce.call();
        assert.equal(initialNonce.toNumber(), 0);

        const issueResult = await tokenInstance.issueTokens(
          multisig.address,
          ISSUED_TOKENS,
          { from: accounts[0] });

        assert.ok(issueResult);

        assert.equal(
          ISSUED_TOKENS,
          await tokenInstance.balanceOf(multisig.address)
        );

        assert.equal(
          0,
          await tokenInstance.balanceOf(destinationAddress)
        );
      });
      describe('AND two owners sign a TestToken.transfer () transaction', () => {
        it('SHOULD transfer tokens from MultiSigWallet to destinationAddress', async () => {
          let signers = [acct[0], acct[1]];

          const data = tokenInstance.contract.methods.transfer(
            destinationAddress,
            ISSUED_TOKENS).encodeABI();

          let sigs = doSign(
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

          let newNonce = await multisig.nonce.call();
          assert.equal(initialNonce.toNumber() + 1, newNonce.toNumber());

          assert.equal(
            0,
            await tokenInstance.balanceOf(multisig.address)
          );

          assert.equal(
            ISSUED_TOKENS,
            await tokenInstance.balanceOf(destinationAddress)
          );
        });
      });
      describe('AND three owners sign a TestToken.transfer () transaction', () => {
        it('SHOULD transfer tokens from MultiSigWallet to destinationAddress', async () => {
          let signers = [acct[0], acct[1], acct[2]];
          const data = tokenInstance.contract.methods.transfer(
            destinationAddress,
            ISSUED_TOKENS).encodeABI();

          let sigs = doSign(
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

          let newNonce = await multisig.nonce.call();
          assert.equal(initialNonce.toNumber() + 1, newNonce.toNumber());

          assert.equal(
            0,
            await tokenInstance.balanceOf(multisig.address)
          );

          assert.equal(
            ISSUED_TOKENS,
            await tokenInstance.balanceOf(destinationAddress)
          );
        });
      });
      describe('AND only one owner sign a TestToken.transfer() transaction', () => {
        it('SHOULD revert', async () => {
          let signers = [acct[0]];
          const data = tokenInstance.contract.methods.transfer(
            destinationAddress,
            ISSUED_TOKENS).encodeABI();

          let sigs = doSign(
            signers.sort(),
            multisig.address,
            initialNonce.toNumber(),
            tokenInstance.address,
            value,
            data,
            executor,
            gasLimit);
          await assertRevert(
            multisig.execute(sigs.sigV,
              sigs.sigR,
              sigs.sigS,
              tokenInstance.address,
              value,
              data,
              executor,
              gasLimit,
              { from: executor, gasLimit })
          );
        });
      });
      describe('AND one owner and one no owner sign a TestToken.transfer() transaction', () => {
        it('SHOULD revert', async () => {
          let signers = [acct[0], acct[9]];
          const data = tokenInstance.contract.methods.transfer(
            destinationAddress,
            ISSUED_TOKENS).encodeABI();

          let sigs = doSign(
            signers.sort(),
            multisig.address,
            initialNonce.toNumber(),
            tokenInstance.address,
            value,
            data,
            executor,
            gasLimit);
          await assertRevert(
            multisig.execute(sigs.sigV,
              sigs.sigR,
              sigs.sigS,
              tokenInstance.address,
              value,
              data,
              executor,
              gasLimit,
              { from: executor, gasLimit })
          );
        });
      });
      describe('AND two no owners sign a TestToken.transfer() transaction', () => {
        it('SHOULD revert', async () => {
          let noOwnerSigners = [acct[8], acct[9]];
          const data = tokenInstance.contract.methods.transfer(
            destinationAddress,
            ISSUED_TOKENS).encodeABI();

          let sigs = doSign(
            noOwnerSigners.sort(),
            multisig.address,
            initialNonce.toNumber(),
            tokenInstance.address,
            value,
            data,
            executor,
            gasLimit);
          await assertRevert(
            multisig.execute(sigs.sigV,
              sigs.sigR,
              sigs.sigS,
              tokenInstance.address,
              value,
              data,
              executor,
              gasLimit,
              { from: executor, gasLimit })
          );
        });
      });
    });
    describe('WHEN transferring 1000000 TestToken with a multisig wallet and ZERO address as executor', () => {
      let tokenInstance;
      let multisig;
      let initialNonce;
      const threshold = 2;
      const ISSUED_TOKENS = 1000000;
      const gasLimit = 200000000;
      const executor = accounts[0];
      const destinationAddress = accounts[1];
      const value = 0;

      beforeEach(async () => {
        const owners = [acct[0], acct[1], acct[2]];
        tokenInstance = await TestToken.new({ from: accounts[0] });
        assert.ok(tokenInstance);

        multisig = await MultiSigWallet.new(owners, threshold, CHAINID, { from: accounts[0] });
        await web3SendTransaction({
          from: accounts[0],
          to: multisig.address,
          value: web3.utils.toWei(web3.utils.toBN(5), 'ether'),
        });

        initialNonce = await multisig.nonce.call();
        assert.equal(initialNonce.toNumber(), 0);

        const issueResult = await tokenInstance.issueTokens(
          multisig.address,
          ISSUED_TOKENS,
          { from: accounts[0] });

        assert.ok(issueResult);

        assert.equal(
          ISSUED_TOKENS,
          await tokenInstance.balanceOf(multisig.address)
        );

        assert.equal(
          0,
          await tokenInstance.balanceOf(destinationAddress)
        );
      });
      describe('AND two owners sign a TestToken.transfer () transaction', () => {
        it('SHOULD transfer tokens from MultiSigWallet to destinationAddress', async () => {
          let signers = [acct[0], acct[1]];

          const data = tokenInstance.contract.methods.transfer(
            destinationAddress,
            ISSUED_TOKENS).encodeABI();

          let sigs = doSign(
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

          let newNonce = await multisig.nonce.call();
          assert.equal(initialNonce.toNumber() + 1, newNonce.toNumber());

          assert.equal(
            0,
            await tokenInstance.balanceOf(multisig.address)
          );

          assert.equal(
            ISSUED_TOKENS,
            await tokenInstance.balanceOf(destinationAddress)
          );
        });
      });
      describe('AND three owners sign a TestToken.transfer () transaction', () => {
        it('SHOULD transfer tokens from MultiSigWallet to destinationAddress', async () => {
          let signers = [acct[0], acct[1], acct[2]];
          const data = tokenInstance.contract.methods.transfer(
            destinationAddress,
            ISSUED_TOKENS).encodeABI();

          let sigs = doSign(
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

          let newNonce = await multisig.nonce.call();
          assert.equal(initialNonce.toNumber() + 1, newNonce.toNumber());

          assert.equal(
            0,
            await tokenInstance.balanceOf(multisig.address)
          );

          assert.equal(
            ISSUED_TOKENS,
            await tokenInstance.balanceOf(destinationAddress)
          );
        });
      });
      describe('AND only one owner sign a TestToken.transfer() transaction', () => {
        it('SHOULD revert', async () => {
          let signers = [acct[0]];
          const data = tokenInstance.contract.methods.transfer(
            destinationAddress,
            ISSUED_TOKENS).encodeABI();

          let sigs = doSign(
            signers.sort(),
            multisig.address,
            initialNonce.toNumber(),
            tokenInstance.address,
            value,
            data,
            ZEROADDR,
            gasLimit);
          await assertRevert(
            multisig.execute(sigs.sigV,
              sigs.sigR,
              sigs.sigS,
              tokenInstance.address,
              value,
              data,
              ZEROADDR,
              gasLimit,
              { from: executor, gasLimit })
          );
        });
      });
      describe('AND one owner and one no owner sign a TestToken.transfer() transaction', () => {
        it('SHOULD revert', async () => {
          let signers = [acct[0], acct[9]];
          const data = tokenInstance.contract.methods.transfer(
            destinationAddress,
            ISSUED_TOKENS).encodeABI();

          let sigs = doSign(
            signers.sort(),
            multisig.address,
            initialNonce.toNumber(),
            tokenInstance.address,
            value,
            data,
            ZEROADDR,
            gasLimit);
          await assertRevert(
            multisig.execute(sigs.sigV,
              sigs.sigR,
              sigs.sigS,
              tokenInstance.address,
              value,
              data,
              ZEROADDR,
              gasLimit,
              { from: executor, gasLimit })
          );
        });
      });
      describe('AND two no owners sign a TestToken.transfer() transaction', () => {
        it('SHOULD revert', async () => {
          let noOwnerSigners = [acct[8], acct[9]];
          const data = tokenInstance.contract.methods.transfer(
            destinationAddress,
            ISSUED_TOKENS).encodeABI();

          let sigs = doSign(
            noOwnerSigners.sort(),
            multisig.address,
            initialNonce.toNumber(),
            tokenInstance.address,
            value,
            data,
            ZEROADDR,
            gasLimit);
          await assertRevert(
            multisig.execute(sigs.sigV,
              sigs.sigR,
              sigs.sigS,
              tokenInstance.address,
              value,
              data,
              ZEROADDR,
              gasLimit,
              { from: executor, gasLimit })
          );
        });
      });
    });
  });
});
