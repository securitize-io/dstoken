const DSEternalStorage = artifacts.require('DSEternalStorageVersioned');

const configurationManager = require('./utils/configurationManager');

module.exports = function(deployer) {
  if (configurationManager.isTestMode()) {
    return;
  }

  deployer.deploy(DSEternalStorage);
};
