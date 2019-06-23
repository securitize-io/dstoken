const DSEternalStorage = artifacts.require('DSEternalStorageVersioned');
const DSToken = artifacts.require('DSTokenVersioned');
const ESTrustService = artifacts.require('ESTrustServiceVersioned');
const ESRegistryService = artifacts.require('ESRegistryServiceVersioned');
const ESWalletManager = artifacts.require('ESWalletManagerVersioned');
const ESTokenIssuer = artifacts.require('ESTokenIssuerVersioned');
const ESWalletRegistrar = artifacts.require('ESWalletRegistrarVersioned');
const ESComplianceConfigurationService = artifacts.require(
  'ESComplianceConfigurationServiceVersioned'
);
const Proxy = artifacts.require('ProxyVersioned');
const MultiSigWallet = artifacts.require('MultiSigWalletVersioned');

const configurationManager = require('./utils/configurationManager');
const services = require('../utils/globals').services;

module.exports = async function(deployer) {
  if (configurationManager.isTestMode()) {
    return;
  }

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
  const multisig = await MultiSigWallet.deployed();
  const storage = await DSEternalStorage.deployed();
  const tokenImpl = await DSToken.deployed();
  let registry;

  console.log('Connecting compliance configuration to trust service');
  await complianceConfiguration.setDSService(
    services.TRUST_SERVICE,
    trustService.address
  );
  console.log('Connecting compliance manager to trust service');
  await complianceService.setDSService(
    services.TRUST_SERVICE,
    trustService.address
  );
  console.log(
    'Connecting compliance manager to compliance configuration service'
  );
  await complianceService.setDSService(
    services.COMPLIANCE_CONFIGURATION_SERVICE,
    complianceConfiguration.address
  );
  console.log('Connecting compliance manager to wallet manager');
  await complianceService.setDSService(
    services.WALLET_MANAGER,
    walletManager.address
  );
  console.log('Connecting compliance manager to lock manager');
  await complianceService.setDSService(
    services.LOCK_MANAGER,
    lockManager.address
  );
  console.log('Connecting compliance service to token');
  await complianceService.setDSService(services.DS_TOKEN, token.address);

  if (!configurationManager.noRegistry) {
    registry = await ESRegistryService.deployed();

    console.log('Connecting registry to trust service');
    await registry.setDSService(services.TRUST_SERVICE, trustService.address);
    console.log('Connecting registry to wallet manager');
    await registry.setDSService(services.WALLET_MANAGER, walletManager.address);
    console.log('Connecting registry to token');
    await registry.setDSService(services.DS_TOKEN, token.address);
    console.log('Connecting registry to compliance service');
    await registry.setDSService(
      services.COMPLIANCE_SERVICE,
      complianceService.address
    );
    console.log('Connecting token to registry');
    await token.setDSService(services.REGISTRY_SERVICE, registry.address);
    console.log('Connecting token issuer to registry');
    await tokenIssuer.setDSService(services.REGISTRY_SERVICE, registry.address);
    console.log('Connecting wallet registrar to registry');
    await walletRegistrar.setDSService(
      services.REGISTRY_SERVICE,
      registry.address
    );
    console.log('Connecting wallet manager to registry');
    await walletManager.setDSService(
      services.REGISTRY_SERVICE,
      registry.address
    );
    console.log('Connecting lock manager to registry');
    await lockManager.setDSService(services.REGISTRY_SERVICE, registry.address);
    console.log('Connecting compliance manager to registry');
    await complianceService.setDSService(
      services.REGISTRY_SERVICE,
      registry.address
    );
  }

  console.log('Connecting token to trust service');
  await token.setDSService(services.TRUST_SERVICE, trustService.address);
  console.log('Connecting token to compliance service');
  await token.setDSService(
    services.COMPLIANCE_SERVICE,
    complianceService.address
  );
  console.log('Connecting token to wallet manager');
  await token.setDSService(services.WALLET_MANAGER, walletManager.address);
  console.log('Connecting token to lock manager');
  await token.setDSService(services.LOCK_MANAGER, lockManager.address);
  console.log('Connecting wallet manager to trust service');
  await walletManager.setDSService(
    services.TRUST_SERVICE,
    trustService.address
  );
  console.log('Connecting lock manager to trust service');
  await lockManager.setDSService(services.TRUST_SERVICE, trustService.address);
  console.log('Connecting lock manager to compliance service');
  await lockManager.setDSService(
    services.COMPLIANCE_SERVICE,
    complianceService.address
  );
  console.log('Connecting lock manager to token');
  await lockManager.setDSService(services.DS_TOKEN, token.address);
  console.log('Connecting token issuer to trust service');
  await tokenIssuer.setDSService(services.TRUST_SERVICE, trustService.address);
  console.log('Connecting token issuer to lock manager');
  await tokenIssuer.setDSService(services.LOCK_MANAGER, lockManager.address);
  console.log('Connecting token issuer to token');
  await tokenIssuer.setDSService(services.DS_TOKEN, token.address);
  console.log('Connecting wallet registrar to trust service');
  await walletRegistrar.setDSService(
    services.TRUST_SERVICE,
    trustService.address
  );

  console.log(
    `\n\nToken "${configurationManager.name}" (${
      configurationManager.symbol
    }) [decimals: ${configurationManager.decimals}] deployment complete`
  );
  console.log('-------------------------');
  console.log(`Token is at address (2): ${token.address} (behind proxy)`);
  console.log(
    `Trust service is at address (1): ${
      trustService.address
    } | Version: ${await trustService.getVersion()}`
  );
  if (registry) {
    console.log(
      `Investor registry is at address (4): ${
        registry.address
      } | Version: ${await registry.getVersion()}`
    );
  }
  console.log(
    `Compliance service is at address (8): ${
      complianceService.address
    }, and is of type ${
      configurationManager.complianceManagerType
    } | Version: ${await complianceService.getVersion()}`
  );
  console.log(
    `Compliance configuration service is at address (256): ${
      complianceConfiguration.address
    } | Version: ${await complianceConfiguration.getVersion()}`
  );
  console.log(
    `Wallet manager is at address (32): ${
      walletManager.address
    } | Version: ${await walletManager.getVersion()}`
  );
  console.log(
    `Lock manager is at address (64): ${lockManager.address}, and is of type ${
      configurationManager.lockManagerType
    }. | Version: ${await lockManager.getVersion()}`
  );
  console.log(
    `Eternal storage is at address: ${
      storage.address
    } | Version: ${await storage.getVersion()}`
  );
  console.log(
    `Token implementation is at address: ${
      tokenImpl.address
    } | Version: ${await tokenImpl.getVersion()}`
  );
  console.log(
    `Token issuer is at address: ${
      tokenIssuer.address
    } | Version: ${await tokenIssuer.getVersion()}`
  );
  console.log(
    `Wallet registrar is at address: ${
      walletRegistrar.address
    } | Version: ${await walletRegistrar.getVersion()}`
  );

  if (!registry) {
    console.log('\nNo investors registry was deployed.');
  }
  console.log(
    `Multisig wallet is at address: ${
      multisig.address
    } | Version: ${await multisig.getVersion()}`
  );

  console.log('\n');
};
