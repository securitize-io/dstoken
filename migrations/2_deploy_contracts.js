/* eslint-disable no-multiple-empty-lines */
var DSEternalStorage = artifacts.require('DSEternalStorageVersioned');
const ESTrustService = artifacts.require('ESTrustServiceVersioned');
const ESComplianceServiceNotRegulated = artifacts.require(
  'ESComplianceServiceNotRegulatedVersioned'
);
const ESComplianceServiceWhitelisted = artifacts.require(
  'ESComplianceServiceWhitelistedVersioned'
);
const ESComplianceServiceRegulated = artifacts.require(
  'ESComplianceServiceRegulatedVersioned'
);
const EternalStorageClientUintLibrary = artifacts.require(
  'EternalStorageClientUintLibrary'
);
const EternalStorageClientAddressLibrary = artifacts.require(
  'EternalStorageClientAddressLibrary'
);
const EternalStorageClientBooleanLibrary = artifacts.require(
  'EternalStorageClientBooleanLibrary'
);
const EternalStorageClientStringLibrary = artifacts.require(
  'EternalStorageClientStringLibrary'
);
const ESComplianceServiceLibrary = artifacts.require(
  'ESComplianceServiceLibrary'
);
const ESRegistryServiceLibrary = artifacts.require('ESRegistryServiceLibrary');

const ESStandardTokenMock = artifacts.require('ESStandardTokenMockVersioned');
const ESRegistryService = artifacts.require('ESRegistryServiceVersioned');
const ESWalletManager = artifacts.require('ESWalletManagerVersioned');
const ESLockManager = artifacts.require('ESLockManagerVersioned');
const ESInvestorLockManager = artifacts.require(
  'ESInvestorLockManagerVersioned'
);
const DSToken = artifacts.require('DSTokenVersioned');
const Proxy = artifacts.require('ProxyVersioned');
const ESTokenIssuer = artifacts.require('ESTokenIssuerVersioned');
const ESWalletRegistrar = artifacts.require('ESWalletRegistrarVersioned');
const ESIssuanceInformationManager = artifacts.require(
  'ESIssuanceInformationManagerVersioned'
);
const ESComplianceConfigurationService = artifacts.require(
  'ESComplianceConfigurationServiceVersioned'
);

const argv = require('minimist')(process.argv.slice(2));

const EternalStorageClients = [
  ESTrustService,
  DSToken,
  ESRegistryServiceLibrary,
  ESRegistryService,
  ESComplianceServiceNotRegulated,
  ESComplianceServiceWhitelisted,
  ESComplianceServiceRegulated,
  ESWalletManager,
  ESLockManager,
  ESInvestorLockManager,
  ESIssuanceInformationManager,
  ESStandardTokenMock,
  ESTokenIssuer,
  ESWalletRegistrar,
  ESComplianceConfigurationService,
];

const TRUST_SERVICE = 1;
const DS_TOKEN = 2;
const REGISTRY_SERVICE = 4;
const COMPLIANCE_SERVICE = 8;
const COMMS_SERVICE = 16;
const WALLET_MANAGER = 32;
const LOCK_MANAGER = 64;
const ISSUANCE_INFORMATION_MANAGER = 128;
const COMPLIANCE_CONFIGURATION_SERVICE = 256;
const TOKEN_ISSUER = 512;


const NONE = 0;
const MASTER = 1;
const ISSUER = 2;
const EXCHANGE = 4;

deployLibraries = async function(deployer) {
  await Promise.all([
    deployer.deploy(EternalStorageClientUintLibrary),
    deployer.deploy(EternalStorageClientAddressLibrary),
    deployer.deploy(EternalStorageClientBooleanLibrary),
    deployer.deploy(EternalStorageClientStringLibrary),
    deployer.deploy(ESComplianceServiceLibrary),
  ])
    .then(() => {
      let promises = [];
      for (const client of EternalStorageClients) {
        promises.push(deployer.link(EternalStorageClientUintLibrary, client));
        promises.push(
          deployer.link(EternalStorageClientAddressLibrary, client)
        );
        promises.push(
          deployer.link(EternalStorageClientBooleanLibrary, client)
        );
        promises.push(deployer.link(EternalStorageClientStringLibrary, client));
      }
      return Promise.all(promises);
    })
    .then(() => {
      return deployer.deploy(ESRegistryServiceLibrary);
    })
    .then(() => {
      return Promise.all([
        deployer.link(ESRegistryServiceLibrary, ESRegistryService),
        deployer.link(ESComplianceServiceLibrary, ESComplianceServiceRegulated),
      ]);
    });
};

module.exports = function(deployer) {
  deployer.then(async () => {
    if (process.env.TEST_MODE) {
      await deployLibraries(deployer);
      return;
    }
    const name = argv.name;
    const symbol = argv.symbol;
    const decimals = parseInt(argv.decimals);
    const complianceManagerType = argv.compliance || 'NORMAL';
    const lockManagerType = argv.lock_manager || 'INVESTOR';
    if (argv.help || !name || !symbol || !decimals || isNaN(decimals)) {
      console.log('Token Deployer');
      console.log(
        'Usage: truffle migrate [OPTIONS] --name <token name>' +
          ' --symbol <token symbol> --decimals <token decimals>'
      );
      console.log('   --reset - re-deploys the contracts');
      console.log('   --no_registry - skip registry service');
      console.log(
        '   --compliance TYPE - compliance service type (NOT_REGULATED,WHITELIST,NORMAL) - if omitted, NORMAL is selected'
      );
      console.log(
        '   --lock_manager TYPE - lock manager type (WALLET,INVESTOR) - if omitted, INVESTOR is selected'
      );
      console.log('   --help - outputs this help');
      console.log('\n');
      return;
      //process.exit(0);
    }

    // Deploy eternal storage
    let storage = null;
    let trustService = null;
    let complianceServiceLib = null;
    let complianceService = null;
    let complianceConfiguration = null;
    let tokenImpl = null;
    let proxy = null;
    let token = null;
    let registry = null;
    let walletManager = null;
    let lockManager = null;
    let issuanceInformationManager = null;
    let tokenIssuer = null;
    let walletRegistrar = null;

    // Deploy eternal storage
    await deployLibraries(deployer)
      .then(() => {
        return deployer.deploy(DSEternalStorage);
      })
      .then(s => {
        // Deploy trust manager
        storage = s;
        return deployer.deploy(
          ESTrustService,
          storage.address,
          `${name}TrustManager`
        );
      })
      .then(s => {
        trustService = s;
        // Deploy registry service, if needed
        if (!argv.no_registry) {
          return deployer.deploy(
            ESRegistryService,
            storage.address,
            `${name}Registry`
          );
        } else {
          console.log('Skipping registry service');
        }
      })
      .then(s => {
        registry = s;
        // Deploy compliance service
        switch (complianceManagerType) {
          case 'NOT_REGULATED':
            console.log('deploying NOT REGULATED compliance service');
            return deployer.deploy(
              ESComplianceServiceNotRegulated,
              storage.address,
              `${name}ComplianceManager`
            );
            break;
          case 'WHITELIST':
            console.log('deploying WHITELIST compliance service');
            return deployer.deploy(
              ESComplianceServiceWhitelisted,
              storage.address,
              `${name}ComplianceManager`
            );
            break;
          case 'NORMAL':
            console.log('deploying NORMAL compliance service');
            return deployer.deploy(ESComplianceServiceLibrary).then(async s => {
              complianceServiceLib = s;
              await deployer.link(
                ESComplianceServiceLibrary,
                ESComplianceServiceRegulated
              );
              return deployer.deploy(
                ESComplianceServiceRegulated,
                storage.address,
                `${name}ComplianceManager`
              );
            });
          default:
            break;
        }
      })
      .then(s => {
        // Deploy token
        complianceService = s;

        console.log('deploying compliance configuration service');
        return deployer.deploy(
          ESComplianceConfigurationService,
          storage.address,
          `${name}ComplianceConfiguration`
        );
      })
      .then(s => {
        complianceConfiguration = s;
        return deployer.deploy(
          ESWalletManager,
          storage.address,
          `${name}WalletManager`
        );
      })
      .then(s => {
        walletManager = s;

        switch (lockManagerType) {
          case 'WALLET':
            console.log('deploying WALLET lock manager');
            return deployer.deploy(
              ESLockManager,
              storage.address,
              `${name}LockManager`
            );
            break;
          case 'INVESTOR':
            console.log('deploying INVESTOR lock manager');
            return deployer.deploy(
              ESInvestorLockManager,
              storage.address,
              `${name}LockManager`
            );
            break;
          default:
            break;
        }
      })
      .then(s => {
        lockManager = s;
        return deployer.deploy(DSToken);
      })
      .then(s => {
        tokenImpl = s;
        // Deploy proxy
        return deployer.deploy(Proxy);
      })
      .then(s => {
        proxy = s;

        return deployer.deploy(
          ESTokenIssuer,
          storage.address,
          `${name}TokenIssuer`
        );
      })
      .then(s => {
        tokenIssuer = s;

        return deployer.deploy(
          ESWalletRegistrar,
          storage.address,
          `${name}WalletRegistrar`
        );
      })
      .then(s => {
        walletRegistrar = s;

        // Connect proxy to token
        return proxy.setTarget(tokenImpl.address);
      })
      .then(() => {
        token = DSToken.at(proxy.address);
        // Initialize the token parameters
        return token.initialize(
          name,
          symbol,
          decimals,
          storage.address,
          `${name}Token`
        );
      })
      .then(() => {
        // Allow all contracts to write to eternal storage
        console.log('Adding write right on eternal storage to trust service');
        return storage.adminAddRole(trustService.address, 'write');
      })
      .then(() => {
        console.log(
          'Adding write right on eternal storage to compliance service'
        );
        return storage.adminAddRole(complianceService.address, 'write');
      })
      .then(() => {
        console.log(
          'Adding write right on eternal storage to compliance configuration service'
        );
        return storage.adminAddRole(complianceConfiguration.address, 'write');
      })
      .then(() => {
        console.log('Adding write right on eternal storage to wallet manager');
        return storage.adminAddRole(walletManager.address, 'write');
      })
      .then(() => {
        console.log('Adding write right on eternal storage to lock manager');
        return storage.adminAddRole(lockManager.address, 'write');
      })
      .then(() => {
        if (registry) {
          console.log('Adding write right on eternal storage to registry');
          return storage.adminAddRole(registry.address, 'write');
        }
      })
      .then(() => {
        console.log('Adding write right on eternal storage to token');
        return storage.adminAddRole(token.address, 'write');
      })
      .then(() => {
        console.log('Adding write right on eternal storage to token issuer');
        return storage.adminAddRole(tokenIssuer.address, 'write');
      })
      .then(() => {
        console.log('Adding write right on eternal storage to token issuer');
        return storage.adminAddRole(walletRegistrar.address, 'write');
      })
      .then(() => {
        console.log('Initializing trust service');
        return trustService.initialize();
      })
      .then(() => {
        console.log('Connecting compliance configuration to trust service');
        return complianceConfiguration.setDSService(
          TRUST_SERVICE,
          trustService.address
        );
      })

      .then(() => {
        console.log('Connecting compliance manager to trust service');
        return complianceService.setDSService(
          TRUST_SERVICE,
          trustService.address
        );
      })
      .then(() => {
        console.log(
          'Connecting compliance manager to compliance configuration service'
        );
        return complianceService.setDSService(
          COMPLIANCE_CONFIGURATION_SERVICE,
          complianceConfiguration.address
        );
      })
      .then(() => {
        if (registry) {
          console.log('Connecting compliance manager to registry');
          return complianceService.setDSService(
            REGISTRY_SERVICE,
            registry.address
          );
        }
      })
      .then(() => {
        console.log('Connecting compliance manager to wallet manager');
        return complianceService.setDSService(
          WALLET_MANAGER,
          walletManager.address
        );
      })
      .then(() => {
        console.log('Connecting compliance manager to lock manager');
        return complianceService.setDSService(
          LOCK_MANAGER,
          lockManager.address
        );
      })
      .then(() => {
        console.log('Connecting compliance service to token');
        return complianceService.setDSService(DS_TOKEN, token.address);
      })
      .then(() => {
        if (registry) {
          console.log('Connecting registry to trust service');
          return registry.setDSService(TRUST_SERVICE, trustService.address);
        }
      })
      .then(() => {
        if (registry) {
          console.log('Connecting registry to wallet manager');
          return registry.setDSService(WALLET_MANAGER, walletManager.address);
        }
      })
      .then(() => {
        if (registry) {
          console.log('Connecting registry to token');
          return registry.setDSService(DS_TOKEN, token.address);
        }
      })
      .then(() => {
        if (registry) {
          console.log('Connecting registry to compliance service');
          return registry.setDSService(
            COMPLIANCE_SERVICE,
            complianceService.address
          );
        }
      })
      .then(() => {
        console.log('Connecting token to trust service');
        return token.setDSService(TRUST_SERVICE, trustService.address);
      })
      .then(() => {
        console.log('Connecting token to compliance service');
        return token.setDSService(
          COMPLIANCE_SERVICE,
          complianceService.address
        );
      })
      .then(() => {
          console.log('Connecting token to token issuer');
          return token.setDSService(TOKEN_ISSUER, tokenIssuer.address);
      })
      .then(() => {
        console.log('Connecting token to wallet manager');
        return token.setDSService(WALLET_MANAGER, walletManager.address);
      })
      .then(() => {
        console.log('Connecting token to lock manager');
        return token.setDSService(LOCK_MANAGER, lockManager.address);
      })
      .then(() => {
        if (registry) {
          console.log('Connecting token to registry');
          return token.setDSService(REGISTRY_SERVICE, registry.address);
        }
      })
      .then(() => {
        console.log('Connecting wallet manager to trust service');
        return walletManager.setDSService(TRUST_SERVICE, trustService.address);
      })
      .then(() => {
        if (registry) {
          console.log('Connecting wallet manager to registry');
          return walletManager.setDSService(REGISTRY_SERVICE, registry.address);
        }
      })
      .then(() => {
        console.log('Connecting lock manager to trust service');
        return lockManager.setDSService(TRUST_SERVICE, trustService.address);
      })
      .then(() => {
        if (registry) {
          console.log('Connecting lock manager to registry');
          return lockManager.setDSService(REGISTRY_SERVICE, registry.address);
        }
      })
      .then(() => {
        console.log('Connecting lock manager to compliance service');
        return lockManager.setDSService(
          COMPLIANCE_SERVICE,
          complianceService.address
        );
      })
      .then(() => {
        console.log('Connecting lock manager to token');
        return lockManager.setDSService(DS_TOKEN, token.address);
      })
      .then(() => {
        console.log('Connecting token issuer to trust service');
        return tokenIssuer.setDSService(TRUST_SERVICE, trustService.address);
      })
      .then(() => {
        if (registry) {
          console.log('Connecting token issuer to registry');
          return tokenIssuer.setDSService(REGISTRY_SERVICE, registry.address);
        }
      })
      .then(() => {
        console.log('Connecting token issuer to lock manager');
        return tokenIssuer.setDSService(LOCK_MANAGER, lockManager.address);
      })
      .then(() => {
        console.log('Connecting token issuer to token');
        return tokenIssuer.setDSService(DS_TOKEN, token.address);
      })
      .then(() => {
        console.log('Connecting wallet registrar to trust service');
        return walletRegistrar.setDSService(
          TRUST_SERVICE,
          trustService.address
        );
      })
      .then(() => {
        console.log('Connecting wallet registrar to registry');
        return walletRegistrar.setDSService(REGISTRY_SERVICE, registry.address);
      })
      .then(() => {
        console.log('Give issuer permissions to token issuer');
        return trustService.setRole(tokenIssuer.address, ISSUER);
      })
      .then(() => {
        console.log('Give issuer permissions to wallet registrar');
        return trustService.setRole(walletRegistrar.address, ISSUER);
      })
      .then(async () => {
        console.log(
          `\n\nToken "${name}" (${symbol}) [decimals: ${decimals}] deployment complete`
        );
        console.log('-------------------------');
        console.log(
          `Token is at address (2): ${
            token.address
          } (behind proxy) Version: ${await token.getVersion()}`
        );
        console.log(
          `Trust service is at address (1): ${
            trustService.address
          } Version: ${await trustService.getVersion()}`
        );
        if (registry) {
          console.log(
            `Investor registry is at address (4): ${
              registry.address
            } Version: ${await registry.getVersion()}`
          );
        }
        console.log(
          `Compliance service is at address (8): ${
            complianceService.address
          }, and is of type ${complianceManagerType}. Version: ${await complianceService.getVersion()}`
        );
        console.log(
          `Compliance configuration service is at address (256): ${
            complianceConfiguration.address
          }. Version: ${await complianceConfiguration.getVersion()}`
        );
        console.log(
          `Wallet manager is at address (32): ${
            walletManager.address
          } Version: ${await walletManager.getVersion()}`
        );
        console.log(
          `Lock manager is at address (64): ${
            lockManager.address
          }, and is of type ${lockManagerType}. Version: ${await lockManager.getVersion()}`
        );
        console.log(
          `Eternal storage is at address: ${
            storage.address
          } Version: ${await storage.getVersion()}`
        );
        console.log(
          `Token implementation is at address: ${
            tokenImpl.address
          } Version: ${await tokenImpl.getVersion()}`
        );
        console.log(
          `Token issuer is at address: ${
            tokenIssuer.address
          } Version: ${await tokenIssuer.getVersion()}`
        );
        console.log(
          `Wallet registrar is at address: ${
            walletRegistrar.address
          } Version: ${await walletRegistrar.getVersion()}`
        );

        if (!registry) {
          console.log('\nNo investors registry was deployed.');
        }

        console.log('\n');
      })
      .catch(ex => {
        console.log('\nAn error occured during token deployment\n');
        console.log(ex);
      });
  });
};
