const DSToken = artifacts.require("DSToken");
const TrustService = artifacts.require("TrustService");
const RegistryService = artifacts.require("RegistryService");
const WalletManager = artifacts.require("WalletManager");
const TokenIssuer = artifacts.require("TokenIssuer");
const WalletRegistrar = artifacts.require("WalletRegistrar");
const ComplianceConfigurationService = artifacts.require(
  "ComplianceConfigurationService"
);
const OmnibusWalletController = artifacts.require("OmnibusWalletController");
const MultiSigWallet = artifacts.require("MultiSigWallet");
const configurationManager = require("./utils/configurationManager");
const services = require("../utils/globals").services;

module.exports = async function(deployer) {
  if (configurationManager.isTestMode()) {
    return;
  }

  const trustService = await TrustService.at(
    configurationManager.getProxyAddressForContractName("TrustService")
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
      "ComplianceConfigurationService"
    )
  );
  const walletManager = await WalletManager.at(
    configurationManager.getProxyAddressForContractName("WalletManager")
  );
  const abstractLockManagerContract = configurationManager.getAbstractLockManagerContract(
    artifacts
  );
  const lockManager = await abstractLockManagerContract.at(
    configurationManager.getProxyAddressForContractName(
      abstractLockManagerContract._json.contractName
    )
  );
  const token = await DSToken.at(
    configurationManager.getProxyAddressForContractName("DSToken")
  );
  const tokenIssuer = await TokenIssuer.at(
    configurationManager.getProxyAddressForContractName("TokenIssuer")
  );
  const walletRegistrar = await WalletRegistrar.at(
    configurationManager.getProxyAddressForContractName("WalletRegistrar")
  );
  const multisig = await MultiSigWallet.deployed();
  let registry;
  let omnibusWalletController;

  console.log("Connecting compliance configuration to trust service");
  await complianceConfiguration.setDSService(
    services.TRUST_SERVICE,
    trustService.address
  );
  console.log("Connecting compliance manager to trust service");
  await complianceService.setDSService(
    services.TRUST_SERVICE,
    trustService.address
  );
  console.log(
    "Connecting compliance manager to compliance configuration service"
  );
  await complianceService.setDSService(
    services.COMPLIANCE_CONFIGURATION_SERVICE,
    complianceConfiguration.address
  );
  console.log("Connecting compliance manager to wallet manager");
  await complianceService.setDSService(
    services.WALLET_MANAGER,
    walletManager.address
  );
  console.log("Connecting compliance manager to lock manager");
  await complianceService.setDSService(
    services.LOCK_MANAGER,
    lockManager.address
  );
  console.log("Connecting compliance service to token");
  await complianceService.setDSService(services.DS_TOKEN, token.address);

  if (!configurationManager.noRegistry) {
    registry = await RegistryService.at(
      configurationManager.getProxyAddressForContractName("RegistryService")
    );

    console.log("Connecting registry to trust service");
    await registry.setDSService(services.TRUST_SERVICE, trustService.address);
    console.log("Connecting registry to wallet manager");
    await registry.setDSService(services.WALLET_MANAGER, walletManager.address);
    console.log("Connecting registry to token");
    await registry.setDSService(services.DS_TOKEN, token.address);
    console.log("Connecting registry to compliance service");
    await registry.setDSService(
      services.COMPLIANCE_SERVICE,
      complianceService.address
    );
    console.log("Connecting token to registry");
    await token.setDSService(services.REGISTRY_SERVICE, registry.address, {
      gas: 1e6
    });

    console.log("Connecting token to token issuer");
    await token.setDSService(services.TOKEN_ISSUER, tokenIssuer.address, {
      gas: 1e6
    });

    console.log("Connecting token to wallet registrar");
    await token.setDSService(
      services.WALLET_REGISTRAR,
      walletRegistrar.address,
      {
        gas: 1e6
      }
    );

    console.log("Connecting token issuer to registry");
    await tokenIssuer.setDSService(
      services.REGISTRY_SERVICE,
      registry.address,
      {
        gas: 1e6
      }
    );
    console.log("Connecting wallet registrar to registry");
    await walletRegistrar.setDSService(
      services.REGISTRY_SERVICE,
      registry.address
    );
    console.log("Connecting wallet manager to registry");
    await walletManager.setDSService(
      services.REGISTRY_SERVICE,
      registry.address
    );
    console.log("Connecting lock manager to registry");
    await lockManager.setDSService(services.REGISTRY_SERVICE, registry.address);
    console.log("Connecting compliance manager to registry");
    await complianceService.setDSService(
      services.REGISTRY_SERVICE,
      registry.address
    );

    if (!configurationManager.noOmnibusWallet) {
      omnibusWalletController = await OmnibusWalletController.at(
        configurationManager.getProxyAddressForContractName(
          "OmnibusWalletController"
        )
      );

      console.log("Connecting omnibus wallet controller to compliance manager");
      await omnibusWalletController.setDSService(
        services.COMPLIANCE_SERVICE,
        complianceService.address
      );

      console.log("Connecting omnibus wallet controller to token");
      await omnibusWalletController.setDSService(
        services.DS_TOKEN,
        token.address
      );

      console.log("Adding omnibus wallet investor to registry");
      await registry.registerInvestor(
        configurationManager.omnibusWalletInvestorId,
        configurationManager.omnibusWalletInvestorId
      );

      console.log("Adding omnibus wallet controller to registry");
      await registry.addOmnibusWallet(
        configurationManager.omnibusWalletInvestorId,
        configurationManager.omnibusWallet,
        omnibusWalletController.address
      );
    }
  }

  console.log("Connecting token to trust service");
  await token.setDSService(services.TRUST_SERVICE, trustService.address, {
    gas: 1e6
  });
  console.log("Connecting token to compliance service");
  await token.setDSService(
    services.COMPLIANCE_SERVICE,
    complianceService.address,
    {
      gas: 1e6
    }
  );
  console.log("Connecting token to wallet manager");
  await token.setDSService(services.WALLET_MANAGER, walletManager.address, {
    gas: 1e6
  });
  console.log("Connecting token to lock manager");
  await token.setDSService(services.LOCK_MANAGER, lockManager.address, {
    gas: 1e6
  });
  console.log("Connecting wallet manager to trust service");
  await walletManager.setDSService(
    services.TRUST_SERVICE,
    trustService.address
  );
  console.log("Connecting lock manager to trust service");
  await lockManager.setDSService(services.TRUST_SERVICE, trustService.address);
  console.log("Connecting lock manager to compliance service");
  await lockManager.setDSService(
    services.COMPLIANCE_SERVICE,
    complianceService.address
  );
  console.log("Connecting lock manager to token");
  await lockManager.setDSService(services.DS_TOKEN, token.address);
  console.log("Connecting token issuer to trust service");
  await tokenIssuer.setDSService(services.TRUST_SERVICE, trustService.address);
  console.log("Connecting token issuer to lock manager");
  await tokenIssuer.setDSService(services.LOCK_MANAGER, lockManager.address);
  console.log("Connecting token issuer to token");
  await tokenIssuer.setDSService(services.DS_TOKEN, token.address);
  console.log("Connecting wallet registrar to trust service");
  await walletRegistrar.setDSService(
    services.TRUST_SERVICE,
    trustService.address
  );

  console.log(
    `\n\nToken "${configurationManager.name}" (${configurationManager.symbol}) [decimals: ${configurationManager.decimals}] deployment complete`
  );
  console.log("-------------------------");
  console.log(
    `Token is at address: ${
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

    if (omnibusWalletController) {
      console.log(
        `Omnibus wallet controller is at address: ${
          omnibusWalletController.address
        } | Version: ${await omnibusWalletController.getVersion()}`
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

  if (!registry) {
    console.log("\nNo investors registry was deployed.");
  }
  if (!omnibusWalletController) {
    console.log("\nNo omnibus wallet controller was deployed.");
  }
  console.log(
    `Multisig wallet is at address: ${
      multisig.address
    } | Version: ${await multisig.getVersion()}`
  );

  console.log("\n");
};
