const deployContractBehindProxy = require("./utils").deployContractBehindProxy;
const configurationManager = require("./utils/configurationManager");

module.exports = async function(deployer) {
  if (configurationManager.isTestMode() || !configurationManager.isPartitioned()) {
    return;
  }

  await deployContractBehindProxy(
    artifacts.require("Proxy"),
    configurationManager,
    deployer,
    artifacts.require("PartitionsManager")
  );
};
