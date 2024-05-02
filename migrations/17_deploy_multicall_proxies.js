const deployStandAloneContract = require("./utils").deployStandAloneContract;
const configurationManager = require("./utils/configurationManager");

module.exports = async function (deployer) {
  if (configurationManager.isTestMode()) {
    return;
  }

  await deployStandAloneContract(
    configurationManager,
    deployer,
    artifacts.require("IssuerMulticall")
  );
};
