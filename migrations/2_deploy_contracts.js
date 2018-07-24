/* eslint-disable no-multiple-empty-lines */
var EternalStorage = artifacts.require('./EternalStorage');
const ESTrustService = artifacts.require('ESTrustService');
const ESComplianceServiceNotRegulated = artifacts.require('ESComplianceServiceNotRegulated');
const DSToken = artifacts.require('DSToken');
const Proxy = artifacts.require('proxy');

const TRUST_SERVICE = 1;
const DS_TOKEN = 2;
const REGISTRY_SERVICE = 4;
const COMPLIANCE_SERVICE = 8;
const COMMS_SERVICE = 16;

const NONE = 0;
const MASTER = 1;
const ISSUER = 2;
const EXCHANGE = 4;


module.exports = async function (deployer) {
  try {
    // Deploy eternal storage
    let storage = null;
    await deployer.deploy(EternalStorage).then(s => {
      storage = s;
    });

    // Deploy trust manager
    let trustService = null;
    await deployer.deploy(ESTrustService, storage.address, 'DSTokenTestTrustManager').then(s => {
      trustService = s;
    });

    // Deploy compliance manager
    let complianceService = null;
    // TODO: choose compliance manager type
    await deployer.deploy(ESComplianceServiceNotRegulated, storage.address, 'DSTokenTestComplianceManager')
      .then(s => {
        complianceService = s;
      });

    // Deploy token
    let tokenImpl = null;
    await deployer.deploy(DSToken).then(s => {
      tokenImpl = s;
    });

    // Deploy proxy
    let proxy = null;
    await deployer.deploy(Proxy).then(s => {
      proxy = s;
    });


    let token = null;

    // Connect proxy to token
    await deployer.then(() => {
      proxy.setTarget(tokenImpl.address);
      token = DSToken.at(proxy.address);
    });

    // Initialize the token parameters
    await deployer.then(() => {
      token.initialize('DSTokenMock', 'DST', 18, storage.address, 'DSTokenMock');
    });

    // Allow all contracts to write to eternal storage
    await deployer.then(() => storage.adminAddRole(trustService.address, 'write'));
    await deployer.then(() => storage.adminAddRole(complianceService.address, 'write'));
    await deployer.then(() => storage.adminAddRole(token.address, 'write'));

    console.log('Initializing trust service');
    await deployer.then(() => trustService.initialize());

    console.log('Connecting compliance manager to trust service');
    await deployer.then(() => complianceService.setDSService(TRUST_SERVICE, trustService.address));

    console.log('Connecting token to trust service');
    await deployer.then(() => token.setDSService(TRUST_SERVICE, trustService.address));

    console.log('Connecting token to compliance service');

    await deployer.then(() => token.setDSService(COMPLIANCE_SERVICE, complianceService.address));

    console.log('Connecting compliance service to token');
    await deployer.then(() => complianceService.setDSService(DS_TOKEN, token.address));

    console.log('\n\nToken deployment complete');
  } catch (ex) {
    console.log('\n\n--- ERROR ---\n ');
    console.log(' There has been an error deploying the contracts ');
    console.log(' if other contracts were already deployed, they should be considered unstable and discarded ');
    console.log('\n');
    console.log(ex);
  }

  // deployer.deploy(DSTokenMock);
};
