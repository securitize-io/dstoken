const deployContractBehindProxy = require("./utils").deployContractBehindProxy;
const configurationManager = require("./utils/configurationManager");

module.exports = async function(deployer) {
  if (configurationManager.isTestMode()) {
    return;
  }

  const abstractTokenContract = configurationManager.getAbstractTokenContract(
    artifacts
  );

  await deployContractBehindProxy(
    artifacts.require("Proxy"),
    configurationManager,
    deployer,
    abstractTokenContract,
    [
      configurationManager.name,
      configurationManager.symbol,
      configurationManager.decimals
    ]
  );
};
