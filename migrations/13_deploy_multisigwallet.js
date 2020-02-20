const MultiSigWallet = artifacts.require("MultiSigWallet");
const configurationManager = require("./utils/configurationManager");

module.exports = async function(deployer) {
  if (configurationManager.isTestMode()) {
    return;
  }

  deployer.deploy(
    MultiSigWallet,
    configurationManager.owners,
    configurationManager.requiredConfirmations
  );
};
