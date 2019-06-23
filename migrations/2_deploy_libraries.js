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

const configurationManager = require('./utils/configurationManager');

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
  const success = configurationManager.setConfiguration();

  if (!success) {
    process.exit();
  }

  await deployLibraries(deployer);
};
