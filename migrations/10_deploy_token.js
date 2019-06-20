const DSToken = artifacts.require('DSTokenVersioned');

module.exports = function(deployer) {
  deployer.deploy(DSToken);
};
