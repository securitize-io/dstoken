const DSEternalStorage = artifacts.require('DSEternalStorageVersioned');
const ESTrustService = artifacts.require('ESTrustServiceVersioned');

const configurationManager = require('./utils/configurationManager');

module.exports = async function(deployer) {
  if (configurationManager.isTestMode()) {
    return;
  }

  const storage = await DSEternalStorage.deployed();

  await deployer.deploy(
    ESTrustService,
    storage.address,
    `${configurationManager.name}TrustManager`
  );
};
