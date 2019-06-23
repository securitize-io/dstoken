const DSEternalStorage = artifacts.require('DSEternalStorageVersioned');
const ESTrustService = artifacts.require('ESTrustServiceVersioned');

const configurationManager = require('./utils/configurationManager');

module.exports = async function(deployer) {
  const storage = await DSEternalStorage.deployed();

  deployer.deploy(
    ESTrustService,
    storage.address,
    `${configurationManager.name}TrustManager`
  );
};
