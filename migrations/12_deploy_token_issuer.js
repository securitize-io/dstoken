const DSEternalStorage = artifacts.require('DSEternalStorageVersioned');
const ESTokenIssuer = artifacts.require('ESTokenIssuerVersioned');

const configurationManager = require('./utils/configurationManager');

module.exports = async function(deployer) {
  const storage = await DSEternalStorage.deployed();

  deployer.deploy(
    ESTokenIssuer,
    storage.address,
    `${configurationManager.name}TokenIssuer`
  );
};
