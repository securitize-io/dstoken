var DSEternalStorage = artifacts.require('DSEternalStorageVersioned');
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
const Proxy = artifacts.require('ProxyVersioned');
const ESTokenIssuer = artifacts.require('ESTokenIssuerVersioned');
const ESWalletRegistrar = artifacts.require('ESWalletRegistrarVersioned');
const ESIssuanceInformationManager = artifacts.require(
  'ESIssuanceInformationManagerVersioned'
);
const ESComplianceConfigurationService = artifacts.require(
  'ESComplianceConfigurationServiceVersioned'
);

module.exports = async function(deployer, test) {
  console.log(test);
  //   const storage = await DSEternalStorage.deployed();
  //   const trustService = await ESTrustService.deployed();
  //   const complianceService = await ESTrustService.deployed();
  //   const trustService = await ESTrustService.deployed();
  //   const trustService = await ESTrustService.deployed();
  //   const trustService = await ESTrustService.deployed();
  //   const trustService = await ESTrustService.deployed();
  //   const trustService = await ESTrustService.deployed();
  //   const trustService = await ESTrustService.deployed();
  //   const trustService = await ESTrustService.deployed();
  //   const trustService = await ESTrustService.deployed();
  //   // Allow all contracts to write to eternal storage
  //   console.log('Adding write right on eternal storage to trust service');
  //   storage.adminAddRole(trustService.address, 'write');
  //   console.log('Adding write right on eternal storage to compliance service');
  //   storage.adminAddRole(complianceService.address, 'write');
  //   console.log(
  //     'Adding write right on eternal storage to compliance configuration service'
  //   );
  //   storage.adminAddRole(complianceConfiguration.address, 'write');
  //   console.log('Adding write right on eternal storage to wallet manager');
  //   storage.adminAddRole(walletManager.address, 'write');
  //   console.log('Adding write right on eternal storage to lock manager');
  //   storage.adminAddRole(lockManager.address, 'write');
  //   console.log('Adding write right on eternal storage to registry');
  //   storage.adminAddRole(registry.address, 'write');
  //   console.log('Adding write right on eternal storage to token');
  //   storage.adminAddRole(token.address, 'write');
  //   console.log('Adding write right on eternal storage to token issuer');
  //   storage.adminAddRole(tokenIssuer.address, 'write');
  //   console.log('Adding write right on eternal storage to wallet registrar');
  //   storage.adminAddRole(walletRegistrar.address, 'write');
  //   console.log('Initializing trust service');
  //   trustService.initialize();
};
