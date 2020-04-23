const deployContractBehindProxy = require("./utils").deployContractBehindProxy;
const configurationManager = require("./utils/configurationManager");

module.exports = async function(deployer) {
  if (configurationManager.isTestMode()) {
    return;
  }

  const abstractComplianceServiceContract = configurationManager.getAbstractComplianceServiceContract(
    artifacts
  );

  if (abstractComplianceServiceContract) {
    await deployContractBehindProxy(
      artifacts.require("Proxy"),
      configurationManager,
      deployer,
      abstractComplianceServiceContract
    );
  }
};
