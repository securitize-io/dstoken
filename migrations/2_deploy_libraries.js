const ESTrustService = artifacts.require('ESTrustServiceVersioned');
const ESComplianceServiceNotRegulated = artifacts.require(
  'ESComplianceServiceNotRegulatedVersioned'
);
const ESComplianceServiceWhitelisted = artifacts.require(
  'ESComplianceServiceWhitelistedVersioned'
);
const ESComplianceServiceRegulated = artifacts.require(
  'ESComplianceServiceRegulatedVersioned'
);
const EternalStorageClientUintLibrary = artifacts.require(
  'EternalStorageClientUintLibrary'
);
const EternalStorageClientAddressLibrary = artifacts.require(
  'EternalStorageClientAddressLibrary'
);
const EternalStorageClientBooleanLibrary = artifacts.require(
  'EternalStorageClientBooleanLibrary'
);
const EternalStorageClientStringLibrary = artifacts.require(
  'EternalStorageClientStringLibrary'
);
const ESComplianceServiceLibrary = artifacts.require(
  'ESComplianceServiceLibrary'
);
const ESRegistryServiceLibrary = artifacts.require('ESRegistryServiceLibrary');

const ESStandardTokenMock = artifacts.require('ESStandardTokenMockVersioned');
const ESRegistryService = artifacts.require('ESRegistryServiceVersioned');
const ESWalletManager = artifacts.require('ESWalletManagerVersioned');
const ESLockManager = artifacts.require('ESLockManagerVersioned');
const ESInvestorLockManager = artifacts.require(
  'ESInvestorLockManagerVersioned'
);
const DSToken = artifacts.require('DSTokenVersioned');
const ESTokenIssuer = artifacts.require('ESTokenIssuerVersioned');
const ESWalletRegistrar = artifacts.require('ESWalletRegistrarVersioned');
const ESIssuanceInformationManager = artifacts.require(
  'ESIssuanceInformationManagerVersioned'
);
const ESComplianceConfigurationService = artifacts.require(
  'ESComplianceConfigurationServiceVersioned'
);

const argv = require('minimist')(process.argv.slice(2));

const EternalStorageClients = [
  ESTrustService,
  DSToken,
  ESRegistryServiceLibrary,
  ESRegistryService,
  ESComplianceServiceNotRegulated,
  ESComplianceServiceWhitelisted,
  ESComplianceServiceRegulated,
  ESWalletManager,
  ESLockManager,
  ESInvestorLockManager,
  ESIssuanceInformationManager,
  ESStandardTokenMock,
  ESTokenIssuer,
  ESWalletRegistrar,
  ESComplianceConfigurationService,
];

async function deployLibraries(deployer) {
  await deployer
    .deploy(EternalStorageClientUintLibrary)
    .then(() => {
      return deployer.deploy(EternalStorageClientAddressLibrary);
    })
    .then(() => {
      return deployer.deploy(EternalStorageClientBooleanLibrary);
    })
    .then(() => {
      return deployer.deploy(EternalStorageClientStringLibrary);
    })
    .then(() => {
      return deployer.deploy(ESComplianceServiceLibrary);
    })
    .then(() => {
      let promises = [];
      for (const client of EternalStorageClients) {
        promises.push(deployer.link(EternalStorageClientUintLibrary, client));
        promises.push(
          deployer.link(EternalStorageClientAddressLibrary, client)
        );
        promises.push(
          deployer.link(EternalStorageClientBooleanLibrary, client)
        );
        promises.push(deployer.link(EternalStorageClientStringLibrary, client));
      }
      return Promise.all(promises);
    })
    .then(() => {
      return deployer.deploy(ESRegistryServiceLibrary);
    })
    .then(() => {
      return Promise.all([
        deployer.link(ESRegistryServiceLibrary, ESRegistryService),
        deployer.link(ESComplianceServiceLibrary, ESComplianceServiceRegulated),
      ]);
    });
}

module.exports = async function(deployer) {
  const decimals = parseInt(argv.decimals);

  if (
    argv.help ||
    !argv.name ||
    !argv.symbol ||
    isNaN(decimals) ||
    !argv.owners
  ) {
    console.log('Token Deployer');
    console.log(
      'Usage: truffle migrate [OPTIONS] --name <token name>' +
        ' --symbol <token symbol> --decimals <token decimals>'
    );
    console.log('   --reset - re-deploys the contracts');
    console.log('   --no_registry - skip registry service');
    console.log(
      '   --compliance TYPE - compliance service type (NOT_REGULATED,WHITELIST,NORMAL) - if omitted, NORMAL is selected'
    );
    console.log(
      '   --lock_manager TYPE - lock manager type (WALLET,INVESTOR) - if omitted, INVESTOR is selected'
    );
    console.log(
      '   --owners - a space seperated string of owner addresses that own the multisig wallet'
    );
    console.log(
      '   --required_confirmations - the number of required confirmations to execute a multisig wallet transaction'
    );
    console.log('   --help - outputs this help');
    console.log('\n');
    process.exit();
  }

  await deployLibraries(deployer);
};
