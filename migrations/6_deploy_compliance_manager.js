const DSEternalStorage = artifacts.require('DSEternalStorageVersioned');

const configurationManager = require('./utils/configurationManager');

module.exports = async function(deployer) {
  const storage = await DSEternalStorage.deployed();

  const abstractComplianceServiceContract = configurationManager.getAbstractComplianceServiceContract(
    artifacts
  );

  if (abstractComplianceServiceContract) {
    console.log(
      `Deploying ${
        configurationManager.complianceManagerType
      } compliance service`
    );
    await deployer.deploy(
      abstractComplianceServiceContract,
      storage.address,
      `${configurationManager.name}ComplianceManager`
    );
  }
};
