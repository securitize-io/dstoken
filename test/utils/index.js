async function addWriteRoles(storageService, servicesAddresses) {
  servicesAddresses.forEach(async address => {
    await storageService.adminAddRole(address, 'write');
  });
}

async function setServicesDependencies(service, depTypes, depAddresses) {
  for (let i = 0; i < depTypes.length; i++) {
    await service.setDSService(depTypes[i], depAddresses[i]);
  }
}

function getParamFromTxEvent(
  transaction,
  paramName,
  contractFactory,
  eventName
) {
  assert.isObject(transaction);
  let logs = transaction.logs;
  if (eventName != null) {
    logs = logs.filter(l => l.event === eventName);
  }
  assert.equal(logs.length, 1, 'too many logs found!');
  let param = logs[0].args[paramName];
  if (contractFactory != null) {
    let contract = contractFactory.at(param);
    assert.isObject(contract, `getting ${paramName} failed for ${param}`);
    return contract;
  } else {
    return param;
  }
}

function balanceOf(web3, account) {
  return new Promise((resolve, reject) =>
    web3.eth.getBalance(account, (e, balance) =>
      e ? reject(e) : resolve(balance)
    )
  );
}

module.exports = {
  addWriteRoles,
  setServicesDependencies,
  getParamFromTxEvent,
  balanceOf,
};
