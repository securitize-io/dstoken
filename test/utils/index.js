async function addStorageAdminRules(storageService, servicesAddresses) {
  servicesAddresses.forEach(async address => {
    await storageService.adminAddRole(address, 'write');
  });
}

async function setServicesDependencies(service, depTypes, depAddresses) {
  for (let i = 0; i < depTypes.length; i++) {
    await service.setDSService(depTypes[i], depAddresses[i]);
  }
}

module.exports = {
  addStorageAdminRules,
  setServicesDependencies,
};
