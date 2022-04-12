const lightwallet = require('eth-lightwallet');
const ethUtil = require('ethereumjs-util');

class BaseSigner {
  constructor (configuration) {
    this.nameHash = configuration.nameHash;
    this.versionHash = configuration.versionHash;
    this.chainId = configuration.chainId;
    this.salt = configuration.salt;
    this.eip712DomainTypeHash = configuration.eip712DomainTypeHash;
    this.txTypeHash = configuration.txTypeHash;
    this.lightWalletKeyStore = configuration.lightWalletKeyStore;
    this.keyFromPw = configuration.keyFromPw;
  }

  sign (signers,
    multisigAddr,
    nonce,
    destinationAddr,
    value,
    data,
    executor,
    gasLimit,
    txTypeHash = this.txTypeHash,
    nameHash = this.nameHash,
    versionHash = this.versionHash,
    eip712DomainTypeHash = this.eip712DomainTypeHash,
    investorId = null,
    blockLimit = null) {
    const domainData = eip712DomainTypeHash +
      nameHash.slice(2) +
      versionHash.slice(2) +
      this.chainId.toString('16').padStart(64, '0') +
      multisigAddr.slice(2).padStart(64, '0') +
      this.salt.slice(2);
    const domainSepartor = web3.utils.sha3(domainData, { encoding: 'hex' });

    let txInput = txTypeHash +
      destinationAddr.slice(2).padStart(64, '0') +
      value.toString('16').padStart(64, '0') +
      web3.utils.sha3(data, { encoding: 'hex' }).slice(2) +
      nonce.toString('16').padStart(64, '0') +
      executor.slice(2).padStart(64, '0') +
      gasLimit.toString('16').padStart(64, '0');

    txInput += investorId ? ethUtil.keccakFromString(investorId).toString('hex') : '';
    txInput += blockLimit ? blockLimit.toString('16').padStart(64, '0') : '';

    const txInputHash = web3.utils.sha3(txInput, { encoding: 'hex' });
    const input = '0x19' + '01' + domainSepartor.slice(2) + txInputHash.slice(2);
    const hash = web3.utils.sha3(input, { encoding: 'hex' });
    const signatures = [];
    const sigV = [];
    const sigR = [];
    const sigS = [];

    for (let i = 0; i < signers.length; i++) {
      const sig = lightwallet.signing.signMsgHash(this.lightWalletKeyStore, this.keyFromPw, hash, signers[i]);
      signatures.push(sig);
      sigV.push(sig.v);
      sigR.push('0x' + sig.r.toString('hex'));
      sigS.push('0x' + sig.s.toString('hex'));
    }

    return { sigV: sigV, sigR: sigR, sigS: sigS };
  }
}

class MultiSigSigner extends BaseSigner {
  constructor (configuration) {
    super(configuration);
  }

  doSign (signers,
    multisigAddr,
    nonce,
    destinationAddr,
    value,
    data,
    executor,
    gasLimit,
    txTypeHash = this.txTypeHash,
    nameHash = this.nameHash,
    versionHash = this.versionHash,
    eip712DomainTypeHash = this.eip712DomainTypeHash) {
    // eslint-disable-next-line no-return-assign
    return this.sign(signers,
      multisigAddr,
      nonce,
      destinationAddr,
      value,
      data,
      executor,
      gasLimit,
      this.txTypeHash,
      this.nameHash,
      this.versionHash,
      this.eip712DomainTypeHash);
  }
}

class HSMSigner extends BaseSigner {
  constructor (configuration) {
    super(configuration);
  }

  preApproval (signer,
    multisigAddr,
    nonce,
    destinationAddr,
    value,
    data,
    executor,
    gasLimit,
    investorId = null,
    blockLimit = null,
    txTypeHash = this.txTypeHash,
    nameHash = this.nameHash,
    versionHash = this.versionHash,
    eip712DomainTypeHash = this.eip712DomainTypeHash) {
    // eslint-disable-next-line no-return-assign
    const res = this.sign([signer],
      multisigAddr,
      nonce,
      destinationAddr,
      value,
      data,
      executor,
      gasLimit,
      txTypeHash,
      nameHash,
      versionHash,
      eip712DomainTypeHash,
      investorId,
      blockLimit,
    );

    return { sigV: res.sigV[0], sigR: res.sigR[0], sigS: res.sigS[0] };
  }
}

module.exports = {
  MultiSigSigner,
  HSMSigner,
};
