const deployContractBehindProxy = require("./utils").deployContractBehindProxy;
const configurationManager = require("./utils/configurationManager");

module.exports = async function(deployer) {
  if (configurationManager.isTestMode()) {
    return;
  }

  if (!configurationManager.noOmnibusWallet) {
    await deployContractBehindProxy(
      artifacts.require("Proxy"),
      configurationManager,
      deployer,
      artifacts.require("OmnibusTBEController"),
      [configurationManager.omnibusWallet]
    );
  } else {
    console.log("Skipping omnibus wallet controller");
  }
};
