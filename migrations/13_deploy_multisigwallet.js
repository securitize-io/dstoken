const MultiSigWallet = artifacts.require('MultiSigWallet');
const OffChainMultisigWallet = artifacts.require('OffChainMultisigWallet');
const configurationManager = require('./utils/configurationManager');

module.exports = async function (deployer) {
  if (configurationManager.isTestMode()) {
    return;
  }

  if (configurationManager.multisigWalletType === 'ON-CHAIN') {
    deployer.deploy(
      MultiSigWallet,
      configurationManager.owners,
      configurationManager.requiredConfirmations
    );
  } else {
    deployer.deploy(
      OffChainMultisigWallet,
      configurationManager.owners,
      configurationManager.requiredConfirmations,
      configurationManager.chainId
    );
  }
};
