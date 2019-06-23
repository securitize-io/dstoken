const DSEternalStorage = artifacts.require('DSEternalStorageVersioned');
const ESRegistryService = artifacts.require('ESRegistryServiceVersioned');

const configurationManager = require('./utils/configurationManager');

module.exports = async function(deployer) {
  if (configurationManager.isTestMode()) {
    return;
  }

  if (!configurationManager.noRegistry) {
    const storage = await DSEternalStorage.deployed();

    return deployer.deploy(
      ESRegistryService,
      storage.address,
      `${configurationManager.name}Registry`
    );
  } else {
    console.log('Skipping registry service');
  }
};
