const DSEternalStorage = artifacts.require('DSEternalStorageVersioned');

const configurationManager = require('./utils/configurationManager');

module.exports = async function(deployer) {
  const abstractComplianceServiceContract = configurationManager.getAbstractLockManagerContract(
    artifacts
  );
  const storage = await DSEternalStorage.deployed();

  console.log(`Deploying ${configurationManager.lockManagerType} lock manager`);
  deployer.deploy(
    abstractComplianceServiceContract,
    storage.address,
    `${configurationManager.name}LockManager`
  );
};
