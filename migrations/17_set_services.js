const TrustService = artifacts.require('TrustService');
const RegistryService = artifacts.require('RegistryService');
const WalletManager = artifacts.require('WalletManager');
const TokenIssuer = artifacts.require('TokenIssuer');
const WalletRegistrar = artifacts.require('WalletRegistrar');
const ComplianceConfigurationService = artifacts.require(
  'ComplianceConfigurationService'
);
const OmnibusTBEController = artifacts.require('OmnibusTBEController');
const MultiSigWallet = artifacts.require('MultiSigWallet');
const TransactionRelayer = artifacts.require('TransactionRelayer');
const PartitionsManager = artifacts.require('PartitionsManager');
const configurationManager = require('./utils/configurationManager');
const globals = require('../utils/globals');
const services = globals.services;


module.exports = async function (deployer) {
  if (configurationManager.isTestMode()) {
    return;
  }

  const trustService = await TrustService.at(
    configurationManager.getProxyAddressForContractName('TrustService')
  );
  const abstractComplianceServiceContract = configurationManager.getAbstractComplianceServiceContract(
    artifacts
  );
  const complianceService = await abstractComplianceServiceContract.at(
    configurationManager.getProxyAddressForContractName(
      abstractComplianceServiceContract._json.contractName
    )
  );
  const complianceConfiguration = await ComplianceConfigurationService.at(
    configurationManager.getProxyAddressForContractName(
      'ComplianceConfigurationService'
    )
  );
  const walletManager = await WalletManager.at(
    configurationManager.getProxyAddressForContractName('WalletManager')
  );
  const abstractLockManagerContract = configurationManager.getAbstractLockManagerContract(
    artifacts
  );
  const lockManager = await abstractLockManagerContract.at(
    configurationManager.getProxyAddressForContractName(
      abstractLockManagerContract._json.contractName
    )
  );
  const abstractTokenContract = configurationManager.getAbstractTokenContract(artifacts);
  const token = await abstractTokenContract.at(
    configurationManager.getProxyAddressForContractName(
      abstractTokenContract._json.contractName
    )
  );
  const tokenIssuer = await TokenIssuer.at(
    configurationManager.getProxyAddressForContractName('TokenIssuer')
  );
  let omnibusTBEController;
  if (!configurationManager.noOmnibusWallet) {
    const contractName = configurationManager.getOmnibusTbeControllerContractName();
    omnibusTBEController = await OmnibusTBEController.at(
      configurationManager.getProxyAddressForContractName(contractName)
    );
  }

  const walletRegistrar = await WalletRegistrar.at(
    configurationManager.getProxyAddressForContractName('WalletRegistrar')
  );

  const transactionRelayer = await TransactionRelayer.at(
    configurationManager.getProxyAddressForContractName('TransactionRelayer')
  );

  const multisig = await MultiSigWallet.deployed();
  let partitionsManager;
  if (configurationManager.isPartitioned()) {
    partitionsManager = await PartitionsManager.at(
      configurationManager.getProxyAddressForContractName('PartitionsManager')
    );
  }

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
    registry = await RegistryService.at(
      configurationManager.getProxyAddressForContractName('RegistryService')
    );

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
    await token.setDSService(services.REGISTRY_SERVICE, registry.address, {
      gas: 1e6,
    });

    console.log('Connecting token to token issuer');
    await token.setDSService(services.TOKEN_ISSUER, tokenIssuer.address, {
      gas: 1e6,
    });

    console.log('Connecting token to wallet registrar');
    await token.setDSService(
      services.WALLET_REGISTRAR,
      walletRegistrar.address,
      {
        gas: 1e6,
      }
    );

    console.log('Connecting token issuer to registry');
    await tokenIssuer.setDSService(
      services.REGISTRY_SERVICE,
      registry.address,
      {
        gas: 1e6,
      }
    );
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

    if (!configurationManager.noOmnibusWallet) {
      console.log('Connecting token to omnibus TBE controller');
      await token.setDSService(
        services.OMNIBUS_TBE_CONTROLLER,
        omnibusTBEController.address
      );
      console.log('Connecting compliance manager to TBE controller');
      await complianceService.setDSService(
        services.OMNIBUS_TBE_CONTROLLER,
        omnibusTBEController.address
      );
      console.log('Connecting TBE controller to token');
      await omnibusTBEController.setDSService(
        services.DS_TOKEN,
        token.address
      );
      console.log('Connecting Omnibus TBE Controller to compliance configuration service');
      await omnibusTBEController.setDSService(
        services.COMPLIANCE_CONFIGURATION_SERVICE,
        complianceConfiguration.address,
        {
          gas: 1e6,
        }
      );
      console.log('Connecting Omnibus TBE Controller to trust service');
      await omnibusTBEController.setDSService(
        services.TRUST_SERVICE,
        trustService.address,
        {
          gas: 1e6,
        }
      );
      console.log('Connecting Omnibus TBE Controller to compliance service');
      await omnibusTBEController.setDSService(
        services.COMPLIANCE_SERVICE,
        complianceService.address,
        {
          gas: 1e6,
        }
      );
    }
  }

  if (configurationManager.isPartitioned()) {
    console.log('Connecting token to partitions manager');
    await token.setDSService(services.PARTITIONS_MANAGER, partitionsManager.address, {
      gas: 1e6,
    });
    console.log('Connecting partitions manager to trust service');
    await partitionsManager.setDSService(
      services.TRUST_SERVICE,
      trustService.address
    );
    console.log('Connecting partitions manager to token');
    await partitionsManager.setDSService(
      services.DS_TOKEN,
      token.address
    );
    console.log('Connecting compliance manager to partitions manager');
    await complianceService.setDSService(
      services.PARTITIONS_MANAGER,
      partitionsManager.address
    );
  }

  console.log('Connecting token to trust service');
  await token.setDSService(services.TRUST_SERVICE, trustService.address, {
    gas: 1e6,
  });
  console.log('Connecting token to compliance service');
  await token.setDSService(
    services.COMPLIANCE_SERVICE,
    complianceService.address,
    {
      gas: 1e6,
    }
  );
  console.log('Connecting token to compliance configuration service');
  await token.setDSService(
    services.COMPLIANCE_CONFIGURATION_SERVICE,
    complianceConfiguration.address
  );
  console.log('Connecting token to wallet manager');
  await token.setDSService(services.WALLET_MANAGER, walletManager.address, {
    gas: 1e6,
  });
  console.log('Connecting token to lock manager');
  await token.setDSService(services.LOCK_MANAGER, lockManager.address, {
    gas: 1e6,
  });
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
  console.log('Connecting transaction relayer to token');
  await token.setDSService(services.TRANSACTION_RELAYER, transactionRelayer.address);
  console.log('Connectiong transaction relayer to trust service');
  await transactionRelayer.setDSService(services.TRUST_SERVICE, trustService.address);

  if (!configurationManager.noOmnibusWallet) {
    const walletManager = await WalletManager.at(
      configurationManager.getProxyAddressForContractName("WalletManager")
    );
    console.log("Set omnibus wallet as Platform wallet");
    // Could not be done before connecting the services
    await walletManager.addPlatformWallet(
      configurationManager.omnibusWallet
    );
  }

  console.log(
    `\n\nToken "${configurationManager.name}" (${configurationManager.symbol}) [decimals: ${configurationManager.decimals}] deployment complete`
  );
  console.log('-------------------------');
  tokenType = configurationManager.isPartitioned() ? 'TokenPartitioned' : 'Token';
  console.log(

    `${tokenType} is at address: ${
      token.address
    } | Version: ${await token.getVersion()}`
  );
  console.log(
    `Trust service is at address: ${
      trustService.address
    } | Version: ${await trustService.getVersion()}`
  );
  if (registry) {
    console.log(
      `Investor registry is at address: ${
        registry.address
      } | Version: ${await registry.getVersion()}`
    );

    if (omnibusTBEController) {
      console.log(
        `Omnibus TBE controller is at address: ${
          omnibusTBEController.address
        } | Version: ${await omnibusTBEController.getVersion()}`
      );
    }
  }
  console.log(
    `Compliance service is at address: ${
      complianceService.address
    }, and is of type ${
      configurationManager.complianceManagerType
    } | Version: ${await complianceService.getVersion()}`
  );
  console.log(
    `Compliance configuration service is at address: ${
      complianceConfiguration.address
    } | Version: ${await complianceConfiguration.getVersion()}`
  );
  console.log(
    `Wallet manager is at address: ${
      walletManager.address
    } | Version: ${await walletManager.getVersion()}`
  );
  console.log(
    `Lock manager is at address: ${lockManager.address}, and is of type ${
      configurationManager.lockManagerType
    }. | Version: ${await lockManager.getVersion()}`
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

  if (configurationManager.isPartitioned()) {
    console.log(
      `Partitions Manager is at address: ${
        partitionsManager.address
      } | Version: ${await partitionsManager.getVersion()}`
    );
  }

  if (!registry) {
    console.log('\nNo investors registry was deployed.');
  }
  if (!omnibusTBEController) {
    console.log('\nNo omnibus wallet controller was deployed.');
  }

  console.log(
    `Multisig wallet is at address: ${
      multisig.address
    } | Version: ${await multisig.getVersion()}`
  );

  console.log(
    `Transaction relayer is at address: ${
      transactionRelayer.address
    } | Version: ${await transactionRelayer.getVersion()}`
  );

  console.log('\n');
};
