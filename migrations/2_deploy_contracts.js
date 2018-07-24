/* eslint-disable no-multiple-empty-lines */
var EternalStorage = artifacts.require('./EternalStorage');
const ESTrustService = artifacts.require('ESTrustService');
const ESComplianceServiceNotRegulated = artifacts.require('ESComplianceServiceNotRegulated');
const DSToken = artifacts.require('DSToken');
const Proxy = artifacts.require('proxy');
const argv = require('minimist')(process.argv.slice(2));

const TRUST_SERVICE = 1;
const DS_TOKEN = 2;
const REGISTRY_SERVICE = 4;
const COMPLIANCE_SERVICE = 8;
const COMMS_SERVICE = 16;

const NONE = 0;
const MASTER = 1;
const ISSUER = 2;
const EXCHANGE = 4;


module.exports = function (deployer) {
  const name = argv.name;
  const symbol = argv.symbol;
  const decimals = parseInt(argv.decimals);

  if (!name || !symbol || !decimals || isNaN(decimals)) {
    console.log('Token Deployer');
    console.log('Usage: truffle migrate (--reset) --name <token name>' +
      ' --symbol <token symbol> --decimals <token decimals>');
    throw Error('Invalid Parameters');
  }



  // Deploy eternal storage
  let storage = null;
  let trustService = null;
  let complianceService = null;
  let tokenImpl = null;
  let proxy = null;
  let token = null;
  // Deploy eternal storage
  deployer.deploy(EternalStorage).then(s => {
    // Deploy trust manager
    storage = s;
    return deployer.deploy(ESTrustService, storage.address, `${name}TrustManager`);
  }).then(s => {
    // Deploy compliance manager
    // TODO: choose compliance manager type
    trustService = s;
    return deployer.deploy(ESComplianceServiceNotRegulated, storage.address, `${name}ComplianceManager`);
  }).then(s => {
    // Deploy token
    complianceService = s;
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
    console.log('Adding write right on eternal storage to token');
    return storage.adminAddRole(token.address, 'write');
  }).then(() => {
    console.log('Initializing trust service');
    return trustService.initialize();
  }).then(() => {
    console.log('Connecting compliance manager to trust service');
    return complianceService.setDSService(TRUST_SERVICE, trustService.address);
  }).then(() => {
    console.log('Connecting token to trust service');
    return token.setDSService(TRUST_SERVICE, trustService.address);
  }).then(() => {
    console.log('Connecting token to compliance service');
    return token.setDSService(COMPLIANCE_SERVICE, complianceService.address);
  }).then(() => {
    console.log('Connecting compliance service to token');
    return complianceService.setDSService(DS_TOKEN, token.address);
  }).then(() => {
    console.log(`\n\nToken ${name} deployment complete`);
    console.log('-------------------------');
    console.log(`Token is at address: ${token.address} (behind proxy)`);
    console.log(`Token implementation is at address: ${tokenImpl.address}`);
    console.log(`Compliance service is at address: ${complianceService.address}`);
    console.log(`Trust service is at address: ${trustService.address}`);
    console.log(`Eternal storage is at address: ${storage.address}`);
    console.log('\n');
  }).catch((ex) => {
    console.log('\nAn error occured during token deployment\n');
    console.log(ex);
  });
};
