const DSEternalStorage = artifacts.require('DSEternalStorageVersioned');
const ESWalletRegistrar = artifacts.require('ESWalletRegistrarVersioned');

const configurationManager = require('./utils/configurationManager');

module.exports = async function(deployer) {
  if (configurationManager.isTestMode()) {
    return;
  }

  const storage = await DSEternalStorage.deployed();

  await deployer.deploy(
    ESWalletRegistrar,
    storage.address,
    `${configurationManager.name}WalletRegistrar`
  );
};
