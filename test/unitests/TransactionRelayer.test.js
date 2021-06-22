const MultiSigWallet = artifacts.require('MultiSigWallet');
const TestToken = artifacts.require('TestToken');
const lightwallet = require('eth-lightwallet');
const Promise = require('bluebird');
const assertRevert = require('../utils/assertRevert');
const deployContractBehindProxy = require('../utils').deployContractBehindProxy;
const roles = require('../../utils/globals').roles;
const web3SendTransaction = Promise.promisify(web3.eth.sendTransaction);

let DOMAIN_SEPARATOR;

// eslint-disable-next-line max-len
// keccak256("MultiSigTransaction(address destination,uint256 value,bytes data,uint256 nonce,address executor,uint256 gasLimit)")
const TXTYPE_HASH = '0x18352269123822ee0d5f7ae54168e303ddfc22d7bd1afb2feb38c21fffe27ea7';
const NAME_HASH = '0x378460f4f89643d76dadb1d55fed95ff69d3c2e4b34cc81a5b565a797b10ce30';
const VERSION_HASH = '0xc89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc6';
const EIP712DOMAINTYPE_HASH = '0xd87cd6ef79d4e2b95e15ce8abf732db51ec771f1ca2edccf22a46c729ac56472';
const SALT = '0x6e31104f5170e59a0a98ebdeb5ba99f8b32ef7b56786b1722f81a5fa19dd1629';

const CHAINID = 1;
const seedPhrase = 'cereal face vapor scrub trash traffic disease region swim stick identify grant';
const password = '';
const ZEROADDR = '0x0000000000000000000000000000000000000000';

contract.only('TransactionRelayer', function ([owner, destinationAddress]) {
  let keyFromPw;
  let acct;
  let lightWalletKeyStore;
  let tokenInstance;
  let initialNonce;
  let executor;
  const ISSUED_TOKENS = 1000000;
  const gasLimit = 200000000;
  const value = 0;

  const doSign = function (
    signers,
    multisigAddr,
    nonce,
    destinationAddr,
    value,
    data,
    executor,
    gasLimit,
    txTypeHash = TXTYPE_HASH,
    nameHash = NAME_HASH,
    versionHash = VERSION_HASH,
    domainTypeHash = EIP712DOMAINTYPE_HASH) {
    const domainData = domainTypeHash +
      nameHash.slice(2) +
      versionHash.slice(2) +
      CHAINID.toString('16').padStart(64, '0') +
      multisigAddr.slice(2).padStart(64, '0') +
      SALT.slice(2);
    DOMAIN_SEPARATOR = web3.utils.sha3(domainData, { encoding: 'hex' });
    let txInput = txTypeHash +
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

  before(async () => {
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
      });
    });

    await deployContractBehindProxy(
      artifacts.require('Proxy'),
      artifacts.require('TrustService'),
      this,
      'trustService'
    );

    await deployContractBehindProxy(
      artifacts.require('Proxy'),
      artifacts.require('TransactionRelayer'),
      this,
      'transactionRelayer',
      [CHAINID]
    );

    console.log('Connectiong transaction relayer to trust service');
    const TRUST_SERVICE = 1;
    await this.transactionRelayer.setDSService(TRUST_SERVICE, this.trustService.address);
  });

  describe(`ERC-20 token smart contract. Transferring ${ISSUED_TOKENS} TestToken to ${destinationAddress}`, () => {
    describe(`WHEN transferring ${ISSUED_TOKENS} TestToken `, () => {
      beforeEach(async () => {
        executor = acct[1];
        tokenInstance = await TestToken.new({ from: owner });
        assert.ok(tokenInstance);

        initialNonce = await this.transactionRelayer.nonce.call();
        assert.ok(initialNonce);
      });
      describe('AND two issuers sign a TestToken.issueTokens() transaction', () => {
        it('SHOULD transfer tokens from Relayer to destinationAddress', async () => {
          let issuers = [acct[0]];

          await this.trustService.setRole(issuers[0], roles.ISSUER, {
            from: owner,
          });

          const role = await this.trustService.getRole(issuers[0]);
          assert.equal(role.words[0], roles.ISSUER);

          const data = tokenInstance.contract.methods.issueTokens(
            destinationAddress,
            ISSUED_TOKENS).encodeABI();

          console.log({ mensaje: '**** NONCE', nonce: initialNonce.toNumber() });
          let sigs = doSign(
            issuers.sort(),
            this.transactionRelayer.address,
            initialNonce.toNumber(),
            tokenInstance.address,
            0,
            data,
            ZEROADDR,
            gasLimit);

          await this.transactionRelayer.execute(
            sigs.sigV[0],
            sigs.sigR[0],
            sigs.sigS[0],
            tokenInstance.address,
            0,
            data,
            ZEROADDR,
            gasLimit,
            { from: executor, gasLimit });

          let newNonce = await this.transactionRelayer.nonce.call();
          assert.equal(initialNonce.toNumber() + 1, newNonce.toNumber());

          assert.equal(
            0,
            await tokenInstance.balanceOf(this.transactionRelayer.address)
          );

          assert.equal(
            ISSUED_TOKENS,
            await tokenInstance.balanceOf(destinationAddress)
          );
        });
      });
      describe('AND three issuers sign a TestToken.issueTokens() transaction', () => {
        it('SHOULD transfer tokens from Relayer to destinationAddress', async () => {
          let issuers = [acct[0], acct[1]];

          await this.trustService.setRole(issuers[1], roles.ISSUER, {
            from: owner,
          });

          const data = tokenInstance.contract.methods.issueTokens(
            destinationAddress,
            ISSUED_TOKENS).encodeABI();

          console.log({ mensaje: '**** NONCE', nonce: initialNonce.toNumber() });
          let sigs = doSign(
            issuers.sort(),
            this.transactionRelayer.address,
            initialNonce.toNumber(),
            tokenInstance.address,
            value,
            data,
            ZEROADDR,
            gasLimit);

          await this.transactionRelayer.execute(
            sigs.sigV[0],
            sigs.sigR[0],
            sigs.sigS[0],
            tokenInstance.address,
            value,
            data,
            ZEROADDR,
            gasLimit,
            { from: executor, gasLimit });

          let newNonce = await this.transactionRelayer.nonce.call();
          assert.equal(initialNonce.toNumber() + 1, newNonce.toNumber());

          assert.equal(
            0,
            await tokenInstance.balanceOf(this.transactionRelayer.address)
          );

          assert.equal(
            ISSUED_TOKENS,
            await tokenInstance.balanceOf(destinationAddress)
          );
        });
      });
      describe('AND three issuers sign a TestToken.issueTokens() transaction', () => {
        it('SHOULD transfer tokens from Relayer to destinationAddress', async () => {
          let issuers = [acct[0], acct[1], acct[2]];

          await this.trustService.setRole(issuers[2], roles.ISSUER, {
            from: owner,
          });

          const data = tokenInstance.contract.methods.issueTokens(
            destinationAddress,
            ISSUED_TOKENS).encodeABI();

          let sigs = doSign(
            issuers.sort(),
            this.transactionRelayer.address,
            initialNonce.toNumber(),
            tokenInstance.address,
            value,
            data,
            ZEROADDR,
            gasLimit);

          await this.transactionRelayer.execute(
            sigs.sigV[0],
            sigs.sigR[0],
            sigs.sigS[0],
            tokenInstance.address,
            value,
            data,
            ZEROADDR,
            gasLimit,
            { from: executor, gasLimit });

          let newNonce = await this.transactionRelayer.nonce.call();
          assert.equal(initialNonce.toNumber() + 1, newNonce.toNumber());

          assert.equal(
            0,
            await tokenInstance.balanceOf(this.transactionRelayer.address)
          );

          assert.equal(
            ISSUED_TOKENS,
            await tokenInstance.balanceOf(destinationAddress)
          );
        });
      });
      describe('AND only one issuer sign a TestToken.issueTokens() transaction', () => {
        it('SHOULD revert', async () => {
          let issuers = [acct[3]];
          const data = tokenInstance.contract.methods.issueTokens(
            destinationAddress,
            ISSUED_TOKENS).encodeABI();

          let sigs = doSign(
            issuers.sort(),
            this.transactionRelayer.address,
            initialNonce.toNumber(),
            tokenInstance.address,
            value,
            data,
            ZEROADDR,
            gasLimit);
          await assertRevert(
            this.transactionRelayer.execute(
              sigs.sigV[0],
              sigs.sigR[0],
              sigs.sigS[0],
              tokenInstance.address,
              value,
              data,
              ZEROADDR,
              gasLimit,
              { from: executor, gasLimit })
          );
        });
      });
      describe('AND one issuer and one no issuer sign a TestToken.issueTokens() transaction', () => {
        it('SHOULD revert', async () => {
          let issuers = [acct[0], acct[7]];
          const data = tokenInstance.contract.methods.issueTokens(
            destinationAddress,
            ISSUED_TOKENS).encodeABI();

          let sigs = doSign(
            issuers.sort(),
            this.transactionRelayer.address,
            initialNonce.toNumber(),
            tokenInstance.address,
            value,
            data,
            ZEROADDR,
            gasLimit);
          await assertRevert(
            this.transactionRelayer.execute(
              sigs.sigV[1],
              sigs.sigR[1],
              sigs.sigS[1],
              tokenInstance.address,
              value,
              data,
              ZEROADDR,
              gasLimit,
              { from: executor, gasLimit })
          );
        });
      });
      describe('AND two no issuers sign a TestToken.issueTokens() transaction', () => {
        it('SHOULD revert', async () => {
          let noIssuersSigners = [acct[8], acct[9]];
          const data = tokenInstance.contract.methods.issueTokens(
            destinationAddress,
            ISSUED_TOKENS).encodeABI();

          let sigs = doSign(
            noIssuersSigners.sort(),
            this.transactionRelayer.address,
            initialNonce.toNumber(),
            tokenInstance.address,
            value,
            data,
            ZEROADDR,
            gasLimit);
          await assertRevert(
            this.transactionRelayer.execute(
              sigs.sigV[0],
              sigs.sigR[0],
              sigs.sigS[0],
              tokenInstance.address,
              value,
              data,
              ZEROADDR,
              gasLimit,
              { from: executor, gasLimit })
          );
        });
      });
      describe('WHEN signing with wrong TXTYPE_HASH ', () => {
        it('SHOULD revert', async () => {
          let issuers = [acct[0]];
          const data = tokenInstance.contract.methods.issueTokens(
            destinationAddress,
            ISSUED_TOKENS).encodeABI();

          let sigs = doSign(
            issuers.sort(),
            this.transactionRelayer.address,
            initialNonce.toNumber(),
            tokenInstance.address,
            value,
            data,
            ZEROADDR,
            gasLimit,
            'wrong hash');
          await assertRevert(
            this.transactionRelayer.execute(
              sigs.sigV[0],
              sigs.sigR[0],
              sigs.sigS[0],
              tokenInstance.address,
              value,
              data,
              ZEROADDR,
              gasLimit,
              { from: executor, gasLimit })
          );
        });
      });
      describe('WHEN signing with wrong NAME_HASH ', () => {
        it('SHOULD revert', async () => {
          let issuers = [acct[0]];
          const data = tokenInstance.contract.methods.issueTokens(
            destinationAddress,
            ISSUED_TOKENS).encodeABI();

          let sigs = doSign(
            issuers.sort(),
            this.transactionRelayer.address,
            initialNonce.toNumber(),
            tokenInstance.address,
            value,
            data,
            ZEROADDR,
            gasLimit,
            TXTYPE_HASH,
            'wrong hash');
          await assertRevert(
            this.transactionRelayer.execute(
              sigs.sigV[0],
              sigs.sigR[0],
              sigs.sigS[0],
              tokenInstance.address,
              value,
              data,
              ZEROADDR,
              gasLimit,
              { from: executor, gasLimit })
          );
        });
      });
      describe('WHEN signing with wrong VERSION_HASH ', () => {
        it('SHOULD revert', async () => {
          let issuers = [acct[0]];
          const data = tokenInstance.contract.methods.issueTokens(
            destinationAddress,
            ISSUED_TOKENS).encodeABI();

          let sigs = doSign(
            issuers.sort(),
            this.transactionRelayer.address,
            initialNonce.toNumber(),
            tokenInstance.address,
            value,
            data,
            ZEROADDR,
            gasLimit,
            TXTYPE_HASH,
            NAME_HASH,
            'wrong hash');
          await assertRevert(
            this.transactionRelayer.execute(
              sigs.sigV[0],
              sigs.sigR[0],
              sigs.sigS[0],
              tokenInstance.address,
              value,
              data,
              ZEROADDR,
              gasLimit,
              { from: executor, gasLimit })
          );
        });
      });
      describe('WHEN signing with wrong EIP712DOMAINTYPE_HASH ', () => {
        it('SHOULD revert', async () => {
          let issuers = [acct[0]];
          const data = tokenInstance.contract.methods.issueTokens(
            destinationAddress,
            ISSUED_TOKENS).encodeABI();

          let sigs = doSign(
            issuers.sort(),
            this.transactionRelayer.address,
            initialNonce.toNumber(),
            tokenInstance.address,
            value,
            data,
            ZEROADDR,
            gasLimit,
            TXTYPE_HASH,
            NAME_HASH,
            VERSION_HASH,
            'WRONG HASH');
          await assertRevert(
            this.transactionRelayer.execute(
              sigs.sigV[0],
              sigs.sigR[0],
              sigs.sigS[0],
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
