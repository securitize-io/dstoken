const DSEternalStorage = artifacts.require('DSEternalStorageVersioned');
const ESTrustService = artifacts.require('ESTrustServiceVersioned');
const ESRegistryService = artifacts.require('ESRegistryServiceVersioned');
const ESWalletManager = artifacts.require('ESWalletManagerVersioned');
const DSToken = artifacts.require('DSTokenVersioned');
const ESTokenIssuer = artifacts.require('ESTokenIssuerVersioned');
const ESWalletRegistrar = artifacts.require('ESWalletRegistrarVersioned');
const ESComplianceConfigurationService = artifacts.require(
  'ESComplianceConfigurationServiceVersioned'
);
const Proxy = artifacts.require('ProxyVersioned');

const configurationManager = require('./utils/configurationManager');
const roles = require('../utils/globals').roles;

module.exports = async function(deployer) {
  const storage = await DSEternalStorage.deployed();
  const trustService = await ESTrustService.deployed();
  const complianceService = await configurationManager
    .getAbstractComplianceServiceContract(artifacts)
    .deployed();
  const complianceConfiguration = await ESComplianceConfigurationService.deployed();
  const walletManager = await ESWalletManager.deployed();
  const lockManager = await configurationManager
    .getAbstractLockManagerContract(artifacts)
    .deployed();
  const proxy = await Proxy.deployed();
  const token = await DSToken.at(proxy.address);
  const tokenIssuer = await ESTokenIssuer.deployed();
  const walletRegistrar = await ESWalletRegistrar.deployed();

  // Allow all contracts to write to eternal storage
  console.log('Adding write right on eternal storage to trust service');
  await storage.adminAddRole(trustService.address, 'write');
  console.log('Adding write right on eternal storage to compliance service');
  await storage.adminAddRole(complianceService.address, 'write');
  console.log(
    'Adding write right on eternal storage to compliance configuration service'
  );
  await storage.adminAddRole(complianceConfiguration.address, 'write');
  console.log('Adding write right on eternal await  to wallet manager');
  await storage.adminAddRole(walletManager.address, 'write');
  console.log('Adding write right on eternal storage to lock manager');
  await storage.adminAddRole(lockManager.address, 'write');

  if (!configurationManager.noRegistry) {
    const registry = await ESRegistryService.deployed();

    console.log('Adding write right on eternal storage to registry');
    await storage.adminAddRole(registry.address, 'write');
  }

  console.log('Adding write right on eternal storage to token');
  await storage.adminAddRole(token.address, 'write');
  console.log('Adding write right on eternal storage to token issuer');
  await storage.adminAddRole(tokenIssuer.address, 'write');
  console.log('Adding write right on eternal storage to wallet registrar');
  await storage.adminAddRole(walletRegistrar.address, 'write');
  console.log('Initializing trust service');
  await trustService.initialize();
  console.log('Give issuer permissions to token issuer');
  await trustService.setRole(tokenIssuer.address, roles.ISSUER);
  console.log('Give issuer permissions to wallet registrar');
  await trustService.setRole(walletRegistrar.address, roles.ISSUER);
};
