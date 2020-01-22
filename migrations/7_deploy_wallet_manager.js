const deployContractBehindProxy = require("./utils").deployContractBehindProxy;
const configurationManager = require("./utils/configurationManager");

module.exports = async function(deployer) {
  if (configurationManager.isTestMode()) {
    return;
  }

  await deployContractBehindProxy(
    artifacts.require("Proxy"),
    configurationManager,
    deployer,
    artifacts.require("WalletManager")
  );
};
