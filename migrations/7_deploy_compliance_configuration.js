const DSEternalStorage = artifacts.require('DSEternalStorageVersioned');
const ESComplianceConfigurationService = artifacts.require(
  'ESComplianceConfigurationServiceVersioned'
);

const argv = require('minimist')(process.argv.slice(2));

module.exports = async function(deployer) {
  const storage = await DSEternalStorage.deployed();

  console.log('Deploying compliance configuration service');
  return deployer.deploy(
    ESComplianceConfigurationService,
    storage.address,
    `${argv.name}ComplianceConfiguration`
  );
};
