const ComplianceServiceRegulated = artifacts.require(
  "ComplianceServiceRegulated"
);
const ComplianceServiceLibrary = artifacts.require("ComplianceServiceLibrary");

const configurationManager = require("./utils/configurationManager");

async function deployLibraries(deployer) {
  await deployer.deploy(ComplianceServiceLibrary);
  await deployer.link(ComplianceServiceLibrary, ComplianceServiceRegulated);
}

module.exports = async function(deployer) {
  if (configurationManager.isTestMode()) {
    await deployLibraries(deployer);
    return;
  }

  const success = configurationManager.setConfiguration();

  if (!success) {
    process.exit();
  }

  await deployLibraries(deployer);
};
