const MultiSigWallet = artifacts.require('MultiSigWalletVersioned');

const configurationManager = require('./utils/configurationManager');

module.exports = function(deployer) {
  if (configurationManager.isTestMode()) {
    return;
  }

  deployer.deploy(
    MultiSigWallet,
    configurationManager.owners,
    configurationManager.requiredConfirmations
  );
};
