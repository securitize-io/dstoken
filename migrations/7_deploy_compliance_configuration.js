const DSEternalStorage = artifacts.require('DSEternalStorageVersioned');
const ESComplianceConfigurationService = artifacts.require(
  'ESComplianceConfigurationServiceVersioned'
);

const configurationManager = require('./utils/configurationManager');

module.exports = async function(deployer) {
  if (configurationManager.isTestMode()) {
    return;
  }

  const storage = await DSEternalStorage.deployed();

  console.log('Deploying compliance configuration service');
  await deployer.deploy(
    ESComplianceConfigurationService,
    storage.address,
    `${configurationManager.name}ComplianceConfiguration`
  );
};
