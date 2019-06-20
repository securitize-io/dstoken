const DSEternalStorage = artifacts.require('DSEternalStorageVersioned');
const ESTrustService = artifacts.require('ESTrustServiceVersioned');

const argv = require('minimist')(process.argv.slice(2));

module.exports = async function(deployer) {
  const storage = await DSEternalStorage.deployed();

  deployer.deploy(ESTrustService, storage.address, `${argv.name}TrustManager`);
};
