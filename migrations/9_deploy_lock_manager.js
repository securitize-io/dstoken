const DSEternalStorage = artifacts.require('DSEternalStorageVersioned');
const ESLockManager = artifacts.require('ESLockManagerVersioned');
const ESInvestorLockManager = artifacts.require(
  'ESInvestorLockManagerVersioned'
);

const argv = require('minimist')(process.argv.slice(2));

module.exports = async function(deployer) {
  const storage = await DSEternalStorage.deployed();

  const lockManagerType = argv.lock_manager || 'INVESTOR';

  switch (lockManagerType) {
    case 'WALLET':
      console.log('Deploying WALLET lock manager');
      deployer.deploy(
        ESLockManager,
        storage.address,
        `${argv.name}LockManager`
      );
      break;
    case 'INVESTOR':
      console.log('Deploying INVESTOR lock manager');
      deployer.deploy(
        ESInvestorLockManager,
        storage.address,
        `${argv.name}LockManager`
      );
      break;
    default:
      break;
  }
};
