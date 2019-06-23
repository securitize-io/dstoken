const DSEternalStorage = artifacts.require('DSEternalStorageVersioned');
const ESWalletRegistrar = artifacts.require('ESWalletRegistrarVersioned');

const configurationManager = require('./utils/configurationManager');

module.exports = async function(deployer) {
  const storage = await DSEternalStorage.deployed();

  deployer.deploy(
    ESWalletRegistrar,
    storage.address,
    `${configurationManager.name}WalletRegistrar`
  );
};
