const services = require("../../utils/globals").services;
const compliance = require("../../utils/globals").complianceType;
const lockManager = require("../../utils/globals").lockManagerType;

async function deployContracts(
  testObject,
  artifacts,
  complianceType = compliance.NORMAL,
  lockManagerType = lockManager.INVESTOR
) {
  await deployContractBehindProxy(
    artifacts.require("Proxy"),
    artifacts.require("TrustService"),
    testObject,
    "trustService"
  );

  await deployContractBehindProxy(
    artifacts.require("Proxy"),
    artifacts.require("RegistryService"),
    testObject,
    "registryService"
  );

  if (complianceType === compliance.NORMAL) {
    await deployContractBehindProxy(
      artifacts.require("Proxy"),
      artifacts.require("ComplianceServiceRegulated"),
      testObject,
      "complianceService"
    );
  } else if (complianceType === compliance.NOT_REGULATED) {
    await deployContractBehindProxy(
      artifacts.require("Proxy"),
      artifacts.require("ComplianceServiceNotRegulated"),
      testObject,
      "complianceService"
    );
  } else {
    await deployContractBehindProxy(
      artifacts.require("Proxy"),
      artifacts.require("ComplianceServiceWhitelisted"),
      testObject,
      "complianceService"
    );
  }

  if (lockManagerType === lockManager.WALLET) {
    await deployContractBehindProxy(
      artifacts.require("Proxy"),
      artifacts.require("LockManager"),
      testObject,
      "lockManager"
    );
  } else {
    await deployContractBehindProxy(
      artifacts.require("Proxy"),
      artifacts.require("InvestorLockManager"),
      testObject,
      "lockManager"
    );
  }

  await deployContractBehindProxy(
    artifacts.require("Proxy"),
    artifacts.require("ComplianceConfigurationService"),
    testObject,
    "complianceConfiguration"
  );

  await deployContractBehindProxy(
    artifacts.require("Proxy"),
    artifacts.require("WalletManager"),
    testObject,
    "walletManager"
  );

  await deployContractBehindProxy(
    artifacts.require("Proxy"),
    artifacts.require("DSToken"),
    testObject,
    "token",
    ["DSTokenMock", "DST", 18]
  );

  await deployContractBehindProxy(
    artifacts.require("Proxy"),
    artifacts.require("TokenIssuer"),
    testObject,
    "issuer"
  );

  await setServicesDependencies(
    testObject.registryService,
    [
      services.TRUST_SERVICE,
      services.WALLET_MANAGER,
      services.DS_TOKEN,
      services.COMPLIANCE_SERVICE
    ],
    [
      testObject.trustService.address,
      testObject.walletManager.address,
      testObject.token.address,
      testObject.complianceService.address
    ]
  );

  await setServicesDependencies(
    testObject.complianceService,
    [
      services.TRUST_SERVICE,
      services.WALLET_MANAGER,
      services.LOCK_MANAGER,
      services.COMPLIANCE_CONFIGURATION_SERVICE,
      services.REGISTRY_SERVICE,
      services.DS_TOKEN
    ],
    [
      testObject.trustService.address,
      testObject.walletManager.address,
      testObject.lockManager.address,
      testObject.complianceConfiguration.address,
      testObject.registryService.address,
      testObject.token.address
    ]
  );

  await setServicesDependencies(
    testObject.complianceConfiguration,
    [services.TRUST_SERVICE],
    [testObject.trustService.address]
  );

  await setServicesDependencies(
    testObject.token,
    [
      services.TRUST_SERVICE,
      services.COMPLIANCE_SERVICE,
      services.WALLET_MANAGER,
      services.LOCK_MANAGER,
      services.REGISTRY_SERVICE,
      services.TOKEN_ISSUER
    ],
    [
      testObject.trustService.address,
      testObject.complianceService.address,
      testObject.walletManager.address,
      testObject.lockManager.address,
      testObject.registryService.address,
      testObject.issuer.address
    ]
  );

  await setServicesDependencies(
    testObject.walletManager,
    [services.TRUST_SERVICE, services.REGISTRY_SERVICE],
    [testObject.trustService.address, testObject.registryService.address]
  );

  await setServicesDependencies(
    testObject.lockManager,
    [
      services.REGISTRY_SERVICE,
      services.COMPLIANCE_SERVICE,
      services.DS_TOKEN,
      services.TRUST_SERVICE
    ],
    [
      testObject.registryService.address,
      testObject.complianceService.address,
      testObject.token.address,
      testObject.trustService.address
    ]
  );

  await setServicesDependencies(
    testObject.issuer,
    [
      services.REGISTRY_SERVICE,
      services.LOCK_MANAGER,
      services.DS_TOKEN,
      services.TRUST_SERVICE
    ],
    [
      testObject.registryService.address,
      testObject.lockManager.address,
      testObject.token.address,
      testObject.trustService.address
    ]
  );
}

async function deployContractBehindProxy(
  abstractProxy,
  abstractContract,
  testObject,
  contractPropertyToSet,
  initializeParams = []
) {
  const deployedContract = await abstractContract.new();
  const deployedProxy = await abstractProxy.new();
  await deployedProxy.setTarget(deployedContract.address);

  const proxifiedContract = await abstractContract.at(deployedProxy.address);
  await proxifiedContract.initialize(...initializeParams);

  testObject[contractPropertyToSet] = proxifiedContract;
}

async function setServicesDependencies(service, depTypes, depAddresses) {
  for (let i = 0; i < depTypes.length; i++) {
    await service.setDSService(depTypes[i], depAddresses[i]);
  }
}

async function getParamFromTxEvent(
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
  assert.equal(logs.length, 1, "too many logs found!");
  let param = logs[0].args[paramName];
  if (contractFactory != null) {
    let contract = await contractFactory.at(param);
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
  deployContracts,
  deployContractBehindProxy,
  setServicesDependencies,
  getParamFromTxEvent,
  balanceOf
};
