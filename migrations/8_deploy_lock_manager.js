const deployContractBehindProxy = require("./utils").deployContractBehindProxy;
const configurationManager = require("./utils/configurationManager");

module.exports = async function(deployer) {
  if (configurationManager.isTestMode()) {
    return;
  }

  const abstractLockManagerContract = configurationManager.getAbstractLockManagerContract(
    artifacts
  );

  await deployContractBehindProxy(
    artifacts.require("Proxy"),
    configurationManager,
    deployer,
    abstractLockManagerContract
  );
};
