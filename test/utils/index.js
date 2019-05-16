const services = require('./globals').services;

async function addStorageAdminRules(storageService, servicesAddresses) {
  servicesAddresses.forEach(async address => {
    await storageService.adminAddRole(address, 'write');
  });
}

async function setRegisteryDepServices(
  registryService,
  trustServiceAddress,
  walletManagerAddress,
  tokenAddress,
  complianceServiceAddress
) {
  await registryService.setDSService(
    services.TRUST_SERVICE,
    trustServiceAddress
  );
  await registryService.setDSService(
    services.WALLET_MANAGER,
    walletManagerAddress
  );

  await registryService.setDSService(services.DS_TOKEN, tokenAddress);
  await registryService.setDSService(
    services.COMPLIANCE_SERVICE,
    complianceServiceAddress
  );
}

async function setWalletManagerDepServices(
  walletManager,
  registryServiceAddress,
  trustServiceAddress
) {
  await walletManager.setDSService(
    services.REGISTRY_SERVICE,
    registryServiceAddress
  );
  await walletManager.setDSService(services.TRUST_SERVICE, trustServiceAddress);
}

async function setTokenDepServices(token, registryServiceAddress) {
  await token.setDSService(services.REGISTRY_SERVICE, registryServiceAddress);
}

async function setComplianceDepServices(
  complianceService,
  trustServiceAddress,
  walletManagerAddress,
  lockManagerAddress,
  complianceConfAddress,
  registryServiceAddress,
  tokenAddress
) {
  await complianceService.setDSService(
    services.TRUST_SERVICE,
    trustServiceAddress
  );
  await complianceService.setDSService(
    services.WALLET_MANAGER,
    walletManagerAddress
  );
  await complianceService.setDSService(
    services.LOCK_MANAGER,
    lockManagerAddress
  );
  await complianceService.setDSService(
    services.COMPLIANCE_CONFIGURATION_SERVICE,
    complianceConfAddress
  );

  await complianceService.setDSService(
    services.REGISTRY_SERVICE,
    registryServiceAddress
  );
  await complianceService.setDSService(services.DS_TOKEN, tokenAddress);
}

async function setLockManagerDepServices(
  lockManager,
  trustServiceAddress,
  registryServiceAddress,
  complianceServiceAddress,
  tokenAddress
) {
  await lockManager.setDSService(services.TRUST_SERVICE, trustServiceAddress);
  await lockManager.setDSService(
    services.REGISTRY_SERVICE,
    registryServiceAddress
  );
  await lockManager.setDSService(
    services.COMPLIANCE_SERVICE,
    complianceServiceAddress
  );
  await lockManager.setDSService(services.DS_TOKEN, tokenAddress);
}

async function setComplianceConfDepServices(
  complianceConfiguration,
  trustServiceAddress
) {
  await complianceConfiguration.setDSService(
    services.TRUST_SERVICE,
    trustServiceAddress
  );
}

module.exports = {
  addStorageAdminRules,
  setRegisteryDepServices,
  setWalletManagerDepServices,
  setTokenDepServices,
  setComplianceDepServices,
  setLockManagerDepServices,
  setComplianceConfDepServices,
};
