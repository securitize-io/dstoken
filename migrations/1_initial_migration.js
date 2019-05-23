var Migrations = artifacts.require('./MigrationsVersioned.sol');

module.exports = function(deployer) {
  deployer.deploy(Migrations);
};
