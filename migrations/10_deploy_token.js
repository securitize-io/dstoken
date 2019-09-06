const DSToken = artifacts.require('DSTokenVersioned');

const configurationManager = require('./utils/configurationManager');

module.exports = function(deployer) {
  if (configurationManager.isTestMode()) {
    return;
  }

  deployer.deploy(DSToken);
};
