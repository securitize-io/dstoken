const DSEternalStorage = artifacts.require('DSEternalStorageVersioned');

module.exports = function(deployer) {
  deployer.deploy(DSEternalStorage);
};
