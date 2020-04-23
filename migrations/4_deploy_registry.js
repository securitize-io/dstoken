const deployContractBehindProxy = require("./utils").deployContractBehindProxy;
const configurationManager = require("./utils/configurationManager");

module.exports = async function(deployer) {
  if (configurationManager.isTestMode()) {
    return;
  }

  if (!configurationManager.noRegistry) {
    await deployContractBehindProxy(
      artifacts.require("Proxy"),
      configurationManager,
      deployer,
      artifacts.require("RegistryService")
    );
  } else {
    console.log("Skipping registry service");
  }
};
