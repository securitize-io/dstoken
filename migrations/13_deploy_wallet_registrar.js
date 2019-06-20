const DSEternalStorage = artifacts.require('DSEternalStorageVersioned');
const ESWalletRegistrar = artifacts.require('ESWalletRegistrarVersioned');

const argv = require('minimist')(process.argv.slice(2));

module.exports = async function(deployer) {
  const storage = await DSEternalStorage.deployed();

  deployer.deploy(
    ESWalletRegistrar,
    storage.address,
    `${argv.name}WalletRegistrar`
  );
};
