const DSEternalStorage = artifacts.require('DSEternalStorageVersioned');
const ESWalletManager = artifacts.require('ESWalletManagerVersioned');

const configurationManager = require('./utils/configurationManager');

module.exports = async function(deployer) {
  const storage = await DSEternalStorage.deployed();

  deployer.deploy(
    ESWalletManager,
    storage.address,
    `${configurationManager.name}WalletManager`
  );
};
