const MultisigWallet = artifacts.require('MultisigWallet');
const configurationManager = require('./utils/configurationManager');

module.exports = async function (deployer) {
  if (configurationManager.isTestMode()) {
    return;
  }

  deployer.deploy(
    MultisigWallet,
    configurationManager.owners,
    configurationManager.requiredConfirmations,
    configurationManager.chainId
  );
};
