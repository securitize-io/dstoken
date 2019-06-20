const DSEternalStorage = artifacts.require('DSEternalStorageVersioned');
const ESComplianceServiceNotRegulated = artifacts.require(
  'ESComplianceServiceNotRegulatedVersioned'
);
const ESComplianceServiceWhitelisted = artifacts.require(
  'ESComplianceServiceWhitelistedVersioned'
);
const ESComplianceServiceRegulated = artifacts.require(
  'ESComplianceServiceRegulatedVersioned'
);

const argv = require('minimist')(process.argv.slice(2));

module.exports = async function(deployer) {
  const storage = await DSEternalStorage.deployed();
  const complianceManagerType = argv.compliance || 'NORMAL';

  switch (complianceManagerType) {
    case 'NOT_REGULATED':
      console.log('Deploying NOT REGULATED compliance service');
      deployer.deploy(
        ESComplianceServiceNotRegulated,
        storage.address,
        `${argv.name}ComplianceManager`
      );
      break;
    case 'WHITELIST':
      console.log('Deploying WHITELIST compliance service');
      deployer.deploy(
        ESComplianceServiceWhitelisted,
        storage.address,
        `${argv.name}ComplianceManager`
      );
      break;
    case 'NORMAL':
      console.log('Deploying NORMAL compliance service');
      deployer.deploy(
        ESComplianceServiceRegulated,
        storage.address,
        `${argv.name}ComplianceManager`
      );
    default:
      break;
  }
};
