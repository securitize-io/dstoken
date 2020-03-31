const ComplianceServiceRegulated = artifacts.require(
  "ComplianceServiceRegulated"
);
const ComplianceServiceRegulatedPartitioned = artifacts.require(
  "ComplianceServiceRegulatedPartitioned"
);
const DSToken = artifacts.require("DSToken");
const DSTokenPartitioned = artifacts.require("DSTokenPartitioned");
const ComplianceServiceLibrary = artifacts.require("ComplianceServiceLibrary");
const ComplianceServicePartitionedLibrary = artifacts.require("ComplianceServicePartitionedLibrary");
const TokenLibrary = artifacts.require("TokenLibrary");
const TokenPartitionsLibrary = artifacts.require("TokenPartitionsLibrary");
const configurationManager = require("./utils/configurationManager");



async function deployLibraries(deployer) {
  await deployer.deploy(ComplianceServiceLibrary);
  await deployer.deploy(TokenLibrary);
  await deployer.link(ComplianceServiceLibrary, ComplianceServiceRegulated);
  await deployer.link(TokenLibrary, DSToken);
  if (configurationManager.isPartitioned() || configurationManager.isTestMode()) {
    await deployer.deploy(TokenPartitionsLibrary);
    await deployer.deploy(ComplianceServicePartitionedLibrary);
    await deployer.link(ComplianceServicePartitionedLibrary, ComplianceServiceRegulatedPartitioned);
    await deployer.link(ComplianceServiceLibrary, ComplianceServiceRegulatedPartitioned);
    await deployer.link(TokenLibrary, DSTokenPartitioned);
    await deployer.link(TokenPartitionsLibrary, DSTokenPartitioned);
  }
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
