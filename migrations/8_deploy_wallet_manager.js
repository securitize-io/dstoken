const DSEternalStorage = artifacts.require('DSEternalStorageVersioned');
const ESWalletManager = artifacts.require('ESWalletManagerVersioned');

const argv = require('minimist')(process.argv.slice(2));

module.exports = async function(deployer) {
  const storage = await DSEternalStorage.deployed();

  deployer.deploy(
    ESWalletManager,
    storage.address,
    `${argv.name}WalletManager`
  );
};
