const DSEternalStorage = artifacts.require('DSEternalStorageVersioned');
const ESTokenIssuer = artifacts.require('ESTokenIssuerVersioned');

const configurationManager = require('./utils/configurationManager');

module.exports = async function(deployer) {
  if (configurationManager.isTestMode()) {
    return;
  }

  const storage = await DSEternalStorage.deployed();

  await deployer.deploy(
    ESTokenIssuer,
    storage.address,
    `${configurationManager.name}TokenIssuer`
  );
};
