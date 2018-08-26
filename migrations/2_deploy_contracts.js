/* eslint-disable no-multiple-empty-lines */
var EternalStorage = artifacts.require('./EternalStorage');
const ESTrustService = artifacts.require('ESTrustService');
const ESComplianceServiceNotRegulated = artifacts.require('ESComplianceServiceNotRegulated');
const ESComplianceServiceWhitelisted = artifacts.require('ESComplianceServiceWhitelisted');
const ESComplianceServiceNormal = artifacts.require('ESComplianceServiceWhitelisted'); // TODO: change this!

const ESRegistryService = artifacts.require('ESRegistryService');
const ESWalletManager = artifacts.require('ESWalletManager');
const ESLockManager = artifacts.require('ESLockManager');
const DSToken = artifacts.require('DSToken');
const Proxy = artifacts.require('Proxy');
const argv = require('minimist')(process.argv.slice(2));

const TRUST_SERVICE = 1;
const DS_TOKEN = 2;
const REGISTRY_SERVICE = 4;
const COMPLIANCE_SERVICE = 8;
const COMMS_SERVICE = 16;
const WALLET_MANAGER=32;
const LOCK_MANAGER=64;
const ISSUANCE_INFORMATION_MANAGER=128;

const NONE = 0;
const MASTER = 1;
const ISSUER = 2;
const EXCHANGE = 4;


module.exports = function (deployer) {
  const name = argv.name;
  const symbol = argv.symbol;
  const decimals = parseInt(argv.decimals);
  const complianceManagerType = argv.compliance || 'NORMAL';
  if (argv.help || !name || !symbol || !decimals || isNaN(decimals)) {
    console.log('Token Deployer');
    console.log('Usage: truffle migrate [OPTIONS] --name <token name>' +
      ' --symbol <token symbol> --decimals <token decimals>');
    console.log('   --reset - re-deploys the contracts');
    console.log('   --no_registry - skip registry service');
    console.log('   --compliance - compliance service type (NOT_REGULATED,WHITELIST,NORMAL) - if omitted, NORMAL is selected');
    console.log('   --help - outputs this help');
    console.log('\n');
    return;
    //process.exit(0);
  }



  // Deploy eternal storage
  let storage = null;
  let trustService = null;
  let complianceService = null;
  let tokenImpl = null;
  let proxy = null;
  let token = null;
  let registry = null;
  let walletManager = null;
  let lockManager = null;
  let issuanceInformationManager = null;

  // Deploy eternal storage
  deployer.deploy(EternalStorage).then(s => {
    // Deploy trust manager
    storage = s;
    return deployer.deploy(ESTrustService, storage.address, `${name}TrustManager`);
  }).then(s => {
    trustService = s;
    // Deploy registry service, if needed
    if (!argv.no_registry) {
      return deployer.deploy(ESRegistryService, storage.address, `${name}Registry`);
    } else {
      console.log('Skipping registry service');
    }
  }).then(s => {
    registry = s;
    // Deploy compliance service
    switch (complianceManagerType) {
    case 'NOT_REGULATED':
      console.log('deploying NOT REGULATED compliance service');
      return deployer.deploy(ESComplianceServiceNotRegulated, storage.address, `${name}ComplianceManager`);
      break;
    case 'WHITELIST':
      console.log('deploying WHITELIST compliance service');
      return deployer.deploy(ESComplianceServiceWhitelisted, storage.address, `${name}ComplianceManager`);
      break;
    case 'NORMAL':
      console.log('deploying NORMAL compliance service');
      return deployer.deploy(ESComplianceServiceNormal, storage.address, `${name}ComplianceManager`);
    default:
      break;
    }
  }).then(s => {
    // Deploy token
    complianceService = s;
    return deployer.deploy(ESWalletManager, storage.address, `${name}WalletManager`);
  }).then(s => {
    walletManager = s;
    return deployer.deploy(ESLockManager, storage.address, `${name}LockManager`);
  }).then(s => {
    lockManager = s;
    return deployer.deploy(DSToken);
  }).then(s => {
    tokenImpl = s;
    // Deploy proxy
    return deployer.deploy(Proxy);
  }).then(s => {
    proxy = s;
    // Connect proxy to token
    return proxy.setTarget(tokenImpl.address);
  }).then(() => {
    token = DSToken.at(proxy.address);
    // Initialize the token parameters
    return token.initialize(name, symbol, decimals, storage.address, `${name}Token`);
  }).then(() => {
    // Allow all contracts to write to eternal storage
    console.log('Adding write right on eternal storage to trust service');
    return storage.adminAddRole(trustService.address, 'write');
  }).then(() => {
    console.log('Adding write right on eternal storage to compliance service');
    return storage.adminAddRole(complianceService.address, 'write');
  }).then(() => {
    console.log('Adding write right on eternal storage to wallet manager');
    return storage.adminAddRole(walletManager.address, 'write');
  }).then(() => {
    console.log('Adding write right on eternal storage to lock manager');
    return storage.adminAddRole(lockManager.address, 'write');
  }).then(() => {
    if (registry) {
      console.log('Adding write right on eternal storage to registry');
      return storage.adminAddRole(registry.address, 'write');
    }
  }).then(() => {
    console.log('Adding write right on eternal storage to token');
    return storage.adminAddRole(token.address, 'write');
  }).then(() => {
    console.log('Initializing trust service');
    return trustService.initialize();
  }).then(() => {
    console.log('Connecting compliance manager to trust service');
    return complianceService.setDSService(TRUST_SERVICE, trustService.address);
  }).then(() => {
    if (registry) {
      console.log('Connecting compliance manager to registry');
      return complianceService.setDSService(REGISTRY_SERVICE, registry.address);
    }
  }).then(() => {
    console.log('Connecting compliance manager to wallet manager');
    return complianceService.setDSService(WALLET_MANAGER, walletManager.address);
  }).then(() => {
    console.log('Connecting compliance manager to lock manager');
    return complianceService.setDSService(LOCK_MANAGER, lockManager.address);
  }).then(() => {
    if (registry) {
      console.log('Connecting registry to trust service');
      return registry.setDSService(TRUST_SERVICE, trustService.address);
    }
  }).then(() => {
    console.log('Connecting token to trust service');
    return token.setDSService(TRUST_SERVICE, trustService.address);
  }).then(() => {
    console.log('Connecting token to compliance service');
    return token.setDSService(COMPLIANCE_SERVICE, complianceService.address);
  }).then(() => {
    console.log('Connecting token to wallet manager');
    return token.setDSService(WALLET_MANAGER, walletManager.address);
  }).then(() => {
    console.log('Connecting token to lock manager');
    return token.setDSService(LOCK_MANAGER, lockManager.address);
  }).then(() => {
    console.log('Connecting compliance service to token');
    return complianceService.setDSService(DS_TOKEN, token.address);
  }).then(() => {
    console.log('Connecting wallet manager to trust service');
    return walletManager.setDSService(TRUST_SERVICE, trustService.address);
  }).then(() => {
    console.log('Connecting lock manager to trust service');
    return lockManager.setDSService(TRUST_SERVICE, trustService.address);
  }).then(() => {
    console.log('Connecting lock manager to token');
    return lockManager.setDSService(DS_TOKEN, token.address);
  }).then(() => {
    console.log(`\n\nToken ${name} deployment complete`);
    console.log('-------------------------');
    console.log(`Token is at address: ${token.address} (behind proxy)`);
    console.log(`Token implementation is at address: ${tokenImpl.address}`);
    console.log(`Compliance service is at address: ${complianceService.address}, and is of type ${complianceManagerType}.`);
    console.log(`Wallet manager is at address: ${walletManager.address}`);
    console.log(`Lock manager is at address: ${lockManager.address}`);
    console.log(`Trust service is at address: ${trustService.address}`);
    console.log(`Eternal storage is at address: ${storage.address}`);
    if (registry) {
      console.log(`Investor registry is at address: ${registry.address}`);
    } else {
      console.log('No investors registry was deployed');
    }
    console.log('\n');
  }).catch((ex) => {
    console.log('\nAn error occured during token deployment\n');
    console.log(ex);
  });
};
