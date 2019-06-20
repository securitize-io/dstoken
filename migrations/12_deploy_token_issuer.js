const DSEternalStorage = artifacts.require('DSEternalStorageVersioned');
const ESTokenIssuer = artifacts.require('ESTokenIssuerVersioned');

const argv = require('minimist')(process.argv.slice(2));

module.exports = async function(deployer) {
  const storage = await DSEternalStorage.deployed();

  deployer.deploy(ESTokenIssuer, storage.address, `${argv.name}TokenIssuer`);
};
