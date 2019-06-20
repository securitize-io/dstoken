const DSEternalStorage = artifacts.require('DSEternalStorageVersioned');
const ESRegistryService = artifacts.require('ESRegistryServiceVersioned');

const argv = require('minimist')(process.argv.slice(2));

module.exports = async function(deployer) {
  if (!argv.no_registry) {
    const storage = await DSEternalStorage.deployed();

    return deployer.deploy(
      ESRegistryService,
      storage.address,
      `${argv.name}Registry`
    );
  } else {
    console.log('Skipping registry service');
  }
};
