const upgradeProxyImplementation = require("./utils").upgradeProxyImplementation;
const configurationManager = require("./utils/configurationManager");

module.exports = async function(deployer) {
  if (configurationManager.isTestMode()) {
    return;
  }

  if (!configurationManager.proxyDeploymentUtils) {
    throw new Error('Deployment Utils proxy required');
  }

  await upgradeProxyImplementation(
    artifacts.require("Proxy"),
    configurationManager.proxyDeploymentUtils,
    configurationManager,
    deployer,
    artifacts.require("DeploymentUtils")
  );
};
