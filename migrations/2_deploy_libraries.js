const ComplianceServiceRegulated = artifacts.require(
  "ComplianceServiceRegulated"
);
const ComplianceServiceRegulatedPartitioned = artifacts.require(
  "ComplianceServiceRegulatedPartitioned"
);
const ComplianceServiceLibrary = artifacts.require("ComplianceServiceLibrary");
const ComplianceServicePartitionedLibrary = artifacts.require("ComplianceServicePartitionedLibrary");

const configurationManager = require("./utils/configurationManager");

async function deployLibraries(deployer) {
  await deployer.deploy(ComplianceServiceLibrary);
  await deployer.deploy(ComplianceServicePartitionedLibrary);
  await deployer.link(ComplianceServiceLibrary, ComplianceServiceRegulated);
  await deployer.link(ComplianceServiceLibrary, ComplianceServiceRegulatedPartitioned);
  await deployer.link(ComplianceServicePartitionedLibrary, ComplianceServiceRegulatedPartitioned);
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
