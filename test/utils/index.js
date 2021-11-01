const services = require('../../utils/globals').services;
const compliance = require('../../utils/globals').complianceType;
const lockManager = require('../../utils/globals').lockManagerType;

const complianceTypeToString = {
  [compliance.NORMAL]: 'ComplianceServiceRegulated',
  [compliance.NOT_REGULATED]: 'ComplianceServiceNotRegulated',
  [compliance.PARTITIONED]: 'ComplianceServiceRegulatedPartitioned',
  [compliance.WHITELIST]: 'ComplianceServiceWhitelisted',
};

const omnibusTbeControllerByComplianceTypeToString = {
  [compliance.NORMAL]: 'OmnibusTBEController',
  [compliance.PARTITIONED]: 'OmnibusTBEController',
  [compliance.NOT_REGULATED]: 'OmnibusTBEControllerWhitelisted',
  [compliance.WHITELIST]: 'OmnibusTBEControllerWhitelisted',
};

const lockManagerTypeToString = {
  [lockManager.INVESTOR]: 'InvestorLockManager',
  [lockManager.WALLET]: 'LockManager',
  [lockManager.PARTITIONED]: 'InvestorLockManagerPartitioned',
};

async function deployContracts (
  testObject,
  artifacts,
  complianceType = compliance.NORMAL,
  lockManagerType = lockManager.INVESTOR,
  omnibusWalletAddresses = undefined,
  partitionsSupport = false,
  omnibusTBEAddress = undefined
) {
  await deployContractBehindProxy(
    artifacts.require('Proxy'),
    artifacts.require('TrustService'),
    testObject,
    'trustService'
  );

  await deployContractBehindProxy(
    artifacts.require('Proxy'),
    artifacts.require('RegistryService'),
    testObject,
    'registryService'
  );

  await deployContractBehindProxy(
    artifacts.require('Proxy'),
    artifacts.require(complianceTypeToString[complianceType]),
    testObject,
    'complianceService'
  );

  await deployContractBehindProxy(
    artifacts.require('Proxy'),
    artifacts.require(lockManagerTypeToString[lockManagerType]),
    testObject,
    'lockManager'
  );

  await deployContractBehindProxy(
    artifacts.require('Proxy'),
    artifacts.require('ComplianceConfigurationService'),
    testObject,
    'complianceConfiguration'
  );

  await deployContractBehindProxy(
    artifacts.require('Proxy'),
    artifacts.require('WalletManager'),
    testObject,
    'walletManager'
  );

  tokenClass = partitionsSupport ? 'DSTokenPartitioned' : 'DSToken';

  await deployContractBehindProxy(
    artifacts.require('Proxy'),
    artifacts.require(tokenClass),
    testObject,
    'token',
    ['DSTokenMock', 'DST', 18]
  );

  await deployContractBehindProxy(
    artifacts.require('Proxy'),
    artifacts.require('TokenIssuer'),
    testObject,
    'issuer'
  );

  await deployContractBehindProxy(
    artifacts.require('Proxy'),
    artifacts.require('TokenReallocator'),
    testObject,
    'reallocator'
  );

  if (partitionsSupport) {
    await deployContractBehindProxy(
      artifacts.require('Proxy'),
      artifacts.require('PartitionsManager'),
      testObject,
      'partitionsManager'
    );

    await setServicesDependencies(
      testObject.partitionsManager,
      [services.DS_TOKEN, services.TRUST_SERVICE],
      [testObject.token.address, testObject.trustService.address]
    );
  }

  if (omnibusTBEAddress) {
    await deployContractBehindProxy(
      artifacts.require('Proxy'),
      artifacts.require(omnibusTbeControllerByComplianceTypeToString[complianceType]),
      testObject,
      'omnibusTBEController',
      [omnibusTBEAddress, partitionsSupport]
    );
  }

  if (omnibusWalletAddresses) {
    for (let i = 1; i <= omnibusWalletAddresses.length; i++) {
      await deployContractBehindProxy(
        artifacts.require('Proxy'),
        artifacts.require('OmnibusWalletController'),
        testObject,
        `omnibusController${i}`,
        [omnibusWalletAddresses[i - 1]]
      );

      await setServicesDependencies(
        testObject[`omnibusController${i}`],
        [
          services.COMPLIANCE_SERVICE,
          services.DS_TOKEN,
          services.TRUST_SERVICE,
        ],
        [
          testObject.complianceService.address,
          testObject.token.address,
          testObject.trustService.address,
        ]
      );
    }
  }

  const partitionsService = partitionsSupport
    ? [services.PARTITIONS_MANAGER]
    : [];
  const partitionsServiceAddress = partitionsSupport
    ? [testObject.partitionsManager.address]
    : [];

  await setServicesDependencies(
    testObject.registryService,
    [
      services.TRUST_SERVICE,
      services.WALLET_MANAGER,
      services.DS_TOKEN,
      services.COMPLIANCE_SERVICE,
    ],
    [
      testObject.trustService.address,
      testObject.walletManager.address,
      testObject.token.address,
      testObject.complianceService.address,
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
      services.DS_TOKEN,
      ...partitionsService,
    ],
    [
      testObject.trustService.address,
      testObject.walletManager.address,
      testObject.lockManager.address,
      testObject.complianceConfiguration.address,
      testObject.registryService.address,
      testObject.token.address,
      ...partitionsServiceAddress,
    ]
  );

  if (omnibusTBEAddress) {
    await setServicesDependencies(testObject.complianceService,
      [services.OMNIBUS_TBE_CONTROLLER],
        [testObject.omnibusTBEController.address]);
  }

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
      services.COMPLIANCE_CONFIGURATION_SERVICE,
      services.WALLET_MANAGER,
      services.LOCK_MANAGER,
      services.REGISTRY_SERVICE,
      services.TOKEN_ISSUER,
      services.TOKEN_REALLOCATOR,
      ...partitionsService,
    ],
    [
      testObject.trustService.address,
      testObject.complianceService.address,
      testObject.complianceConfiguration.address,
      testObject.walletManager.address,
      testObject.lockManager.address,
      testObject.registryService.address,
      testObject.issuer.address,
      testObject.reallocator.address,
      ...partitionsServiceAddress,
    ]
  );

  if (omnibusTBEAddress) {
    await setServicesDependencies(testObject.token,
      [services.OMNIBUS_TBE_CONTROLLER],
      [testObject.omnibusTBEController.address]);

    await setServicesDependencies(
      testObject.omnibusTBEController,
      [
        services.TRUST_SERVICE,
        services.COMPLIANCE_SERVICE,
        services.COMPLIANCE_CONFIGURATION_SERVICE,
        services.DS_TOKEN,
        ...partitionsService,
      ],
      [
        testObject.trustService.address,
        testObject.complianceService.address,
        testObject.complianceConfiguration.address,
        testObject.token.address,
        ...partitionsServiceAddress,
      ]
    );

    await setServicesDependencies(
      testObject.reallocator,
      [
        services.OMNIBUS_TBE_CONTROLLER
      ],
      [
        testObject.omnibusTBEController.address
      ]
    );
  }

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
      services.TRUST_SERVICE,
    ],
    [
      testObject.registryService.address,
      testObject.complianceService.address,
      testObject.token.address,
      testObject.trustService.address,
    ]
  );

  await setServicesDependencies(
    testObject.issuer,
    [
      services.REGISTRY_SERVICE,
      services.LOCK_MANAGER,
      services.DS_TOKEN,
      services.TRUST_SERVICE,
    ],
    [
      testObject.registryService.address,
      testObject.lockManager.address,
      testObject.token.address,
      testObject.trustService.address,
    ]
  );
  if(omnibusTBEAddress) {
    testObject.trustService.setRole(testObject.omnibusTBEController.address, 2);
    testObject.walletManager.addPlatformWallet(omnibusTBEAddress);
  }

  await setServicesDependencies(
    testObject.reallocator,
    [
      services.REGISTRY_SERVICE,
      services.TRUST_SERVICE
    ],
    [
      testObject.registryService.address,
      testObject.trustService.address
    ]
  );
}

async function deployContractBehindProxy (
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

async function setServicesDependencies (service, depTypes, depAddresses) {
  for (let i = 0; i < depTypes.length; i++) {
    await service.setDSService(depTypes[i], depAddresses[i]);
  }
}

async function getParamFromTxEvent (
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
    let contract = await contractFactory.at(param);
    assert.isObject(contract, `getting ${paramName} failed for ${param}`);
    return contract;
  } else {
    return param;
  }
}

function balanceOf (web3, account) {
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
  balanceOf,
};
