const deployContractBehindProxy = require("./utils").deployContractBehindProxy;
const configurationManager = require("./utils/configurationManager");

module.exports = async function(deployer) {
  if (configurationManager.isTestMode()) {
    return;
  }

  if (!configurationManager.noOmnibusWallet) {
    const abstractOmnibusTbeController = configurationManager.getAbstractOmnibusTbeControllerContract(
      artifacts
    );

    await deployContractBehindProxy(
      artifacts.require("Proxy"),
      configurationManager,
      deployer,
      abstractOmnibusTbeController,
      [configurationManager.omnibusWallet, configurationManager.isPartitioned()]
    );
  } else {
    console.log("Skipping omnibus wallet controller");
  }
};
