const DeploymentUtils = artifacts.require('DeploymentUtils');
const PartitionsManager = artifacts.require('PartitionsManager');
const TrustService = artifacts.require('TrustService');
const InvestorLockManager = artifacts.require('InvestorLockManager');
const InvestorLockManagerPartitioned = artifacts.require('InvestorLockManagerPartitioned');
const RegistryService = artifacts.require('RegistryService');
const WalletManager = artifacts.require('WalletManager');
const LockManager = artifacts.require('LockManager');
const ComplianceServiceRegulated = artifacts.require('ComplianceServiceRegulated');
const ComplianceServiceWhitelisted = artifacts.require('ComplianceServiceWhitelisted');
const ComplianceServiceRegulatedPartitioned = artifacts.require('ComplianceServiceRegulatedPartitioned');
const ComplianceServiceNotRegulated = artifacts.require('ComplianceServiceNotRegulated');
const ComplianceConfigurationService = artifacts.require('ComplianceConfigurationService');
const DSToken = artifacts.require('DSToken');
const DSTokenPartitioned = artifacts.require('DSTokenPartitioned');
const WalletRegistrar = artifacts.require('WalletRegistrar');
const TokenIssuer = artifacts.require('TokenIssuer');
const OmnibusTBEController = artifacts.require('OmnibusTBEController');
const OmnibusTBEControllerWhitelisted = artifacts.require('OmnibusTBEControllerWhitelisted');
const TransactionRelayer = artifacts.require('TransactionRelayer');
const TokenReallocator = artifacts.require('TokenReallocator');
const Initializable = artifacts.require('Initializable');
const Ownable = artifacts.require('Ownable');
const Proxy = artifacts.require('Proxy');

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const TRUST_SERVICE = 0;
const REGISTRY_SERVICE = 1;
const COMPLIANCE_SERVICE_REGULATED = 2;
const COMPLIANCE_SERVICE_PARTITIONED = 3;
const COMPLIANCE_SERVICE_WHITELISTED = 4;
const COMPLIANCE_SERVICE_NOT_REGULATED = 5;
const COMPLIANCE_CONFIGURATION = 6;
const WALLET_MANAGER = 7;
const LOCK_MANAGER = 8;
const INVESTOR_LOCK_MANAGER = 9;
const INVESTOR_LOCK_MANAGER_PARTITIONED = 10;
const DS_TOKEN = 11;
const DS_TOKEN_PARTITIONED = 12;
const TOKEN_ISSUER = 13;
const WALLET_REGISTRAR = 14;
const PARTITIONS_MANAGER = 15;
const OMNIBUS_TBE_CONTROLLER = 16;
const OMNIBUS_TBE_CONTROLLER_WHITELISTED = 17;
const TRANSACTION_RELAYER = 18;
const TOKEN_REALLOCATOR = 19;

const globals = require('../../utils/globals');
const { roles } = require('../../utils/globals');
const { expectRevert } = require('@openzeppelin/test-helpers');
const services = globals.services;

const deployedProxies = [];

contract('DeploymentUtils', function (accounts) {
  const newMasterAddress = accounts[2];
  let deploymentUtils;
  let trustServiceImplementation;
  let proxyTrustService;
  let registryServiceImplementation;
  let proxyRegistryService;
  let complianceServiceRegulatedImplementation;
  let complianceServiceWhitelistedImplementation;
  let complianceServicePartitionedImplementation;
  let complianceServiceNotRegulatedImplementation;
  let proxyComplianceServiceRegulated;
  let complianceConfigurationServiceImplementation;
  let walletManagerImplementation;
  let lockManagerImplementation;
  let investorLockManagerImplementation;
  let investorLockManagerPartitionedImplementation;
  let dsTokenImplementation;
  let dsTokenPartitionedImplementation;
  let tokenIssuerImplementation;
  let walletRegistrarImplementation;
  let partitionsManagerImplementation;
  let omnibusTbeControllerImplementation;
  let omnibusTbeControllerWhitelistedImplementation;
  let transactionRelayerImplementation;
  let tokenReallocatorImplementation;

  before(async () => {
    const services = [];
    const addresses = [];
    deploymentUtils = await DeploymentUtils.new();

    trustServiceImplementation = await TrustService.new();
    services.push(TRUST_SERVICE);
    addresses.push(trustServiceImplementation.address);

    registryServiceImplementation = await RegistryService.new();
    services.push(REGISTRY_SERVICE);
    addresses.push(registryServiceImplementation.address);

    complianceServiceRegulatedImplementation = await ComplianceServiceRegulated.new();
    services.push(COMPLIANCE_SERVICE_REGULATED);
    addresses.push(complianceServiceRegulatedImplementation.address);

    complianceServiceWhitelistedImplementation = await ComplianceServiceWhitelisted.new();
    services.push(COMPLIANCE_SERVICE_WHITELISTED);
    addresses.push(complianceServiceWhitelistedImplementation.address);

    complianceServicePartitionedImplementation = await ComplianceServiceRegulatedPartitioned.new();
    services.push(COMPLIANCE_SERVICE_PARTITIONED);
    addresses.push(complianceServicePartitionedImplementation.address);

    //complianceServiceNotRegulatedImplementation
    complianceServiceNotRegulatedImplementation = await ComplianceServiceNotRegulated.new();
    services.push(COMPLIANCE_SERVICE_NOT_REGULATED);
    addresses.push(complianceServiceNotRegulatedImplementation.address);

    complianceConfigurationServiceImplementation = await ComplianceConfigurationService.new();
    services.push(COMPLIANCE_CONFIGURATION);
    addresses.push(complianceConfigurationServiceImplementation.address);

    walletManagerImplementation = await WalletManager.new();
    services.push(WALLET_MANAGER);
    addresses.push(walletManagerImplementation.address);

    lockManagerImplementation = await LockManager.new();
    services.push(LOCK_MANAGER);
    addresses.push(lockManagerImplementation.address);

    investorLockManagerImplementation = await InvestorLockManager.new();
    services.push(INVESTOR_LOCK_MANAGER);
    addresses.push(investorLockManagerImplementation.address);

    investorLockManagerPartitionedImplementation = await InvestorLockManagerPartitioned.new();
    services.push(INVESTOR_LOCK_MANAGER_PARTITIONED);
    addresses.push(investorLockManagerPartitionedImplementation.address);

    dsTokenImplementation = await DSToken.new();
    services.push(DS_TOKEN);
    addresses.push(dsTokenImplementation.address);

    dsTokenPartitionedImplementation = await DSTokenPartitioned.new();
    services.push(DS_TOKEN_PARTITIONED);
    addresses.push(dsTokenPartitionedImplementation.address);

    tokenIssuerImplementation = await TokenIssuer.new();
    services.push(TOKEN_ISSUER);
    addresses.push(tokenIssuerImplementation.address);

    walletRegistrarImplementation = await WalletRegistrar.new();
    services.push(WALLET_REGISTRAR);
    addresses.push(walletRegistrarImplementation.address);

    partitionsManagerImplementation = await PartitionsManager.new();
    services.push(PARTITIONS_MANAGER);
    addresses.push(partitionsManagerImplementation.address);

    omnibusTbeControllerImplementation = await OmnibusTBEController.new();
    services.push(OMNIBUS_TBE_CONTROLLER);
    addresses.push(omnibusTbeControllerImplementation.address);

    omnibusTbeControllerWhitelistedImplementation = await OmnibusTBEControllerWhitelisted.new();
    services.push(OMNIBUS_TBE_CONTROLLER_WHITELISTED);
    addresses.push(omnibusTbeControllerWhitelistedImplementation.address);

    transactionRelayerImplementation = await TransactionRelayer.new();
    services.push(TRANSACTION_RELAYER);
    addresses.push(transactionRelayerImplementation.address);

    tokenReallocatorImplementation = await TokenReallocator.new();
    services.push(TOKEN_REALLOCATOR);
    addresses.push(tokenReallocatorImplementation.address);

    await deploymentUtils.setImplementationAddresses(services, addresses);
    const trustImpl = await deploymentUtils.getImplementationAddress(TRUST_SERVICE);
    const registryImpl = await deploymentUtils.getImplementationAddress(REGISTRY_SERVICE);
    const compServiceRegulatedImpl = await deploymentUtils.getImplementationAddress(COMPLIANCE_SERVICE_REGULATED);
    const compServicePartitionedImpl = await deploymentUtils.getImplementationAddress(COMPLIANCE_SERVICE_PARTITIONED);
    const compServiceWhitelistedImpl = await deploymentUtils.getImplementationAddress(COMPLIANCE_SERVICE_WHITELISTED);
    const compServiceNotRegulatedImpl = await deploymentUtils.getImplementationAddress(COMPLIANCE_SERVICE_NOT_REGULATED);
    const compConfigurationServiceImpl = await deploymentUtils.getImplementationAddress(COMPLIANCE_CONFIGURATION);
    const walletManagerImpl = await deploymentUtils.getImplementationAddress(WALLET_MANAGER);
    const lockManagerImpl = await deploymentUtils.getImplementationAddress(LOCK_MANAGER);
    const investorLockManagerImpl = await deploymentUtils.getImplementationAddress(INVESTOR_LOCK_MANAGER);
    const investorLockManagerPartitionedImpl = await deploymentUtils.getImplementationAddress(INVESTOR_LOCK_MANAGER_PARTITIONED);
    const dsTokenImpl = await deploymentUtils.getImplementationAddress(DS_TOKEN);
    const dsTokenPartitionedImpl = await deploymentUtils.getImplementationAddress(DS_TOKEN_PARTITIONED);
    const tokenIssuerImpl = await deploymentUtils.getImplementationAddress(TOKEN_ISSUER);
    const walletRegistrarImpl = await deploymentUtils.getImplementationAddress(WALLET_REGISTRAR);
    const partitionsManagerImpl = await deploymentUtils.getImplementationAddress(PARTITIONS_MANAGER);
    const omnibusTbeControllerImpl = await deploymentUtils.getImplementationAddress(OMNIBUS_TBE_CONTROLLER);
    const omnibusTbeControllerWhitelistedImpl = await deploymentUtils.getImplementationAddress(OMNIBUS_TBE_CONTROLLER_WHITELISTED);
    const transactionRelayerImpl = await deploymentUtils.getImplementationAddress(TRANSACTION_RELAYER);
    const tokenReallocatorImpl = await deploymentUtils.getImplementationAddress(TOKEN_REALLOCATOR);

    assert.equal(trustImpl, trustServiceImplementation.address);
    assert.equal(registryImpl, registryServiceImplementation.address);
    assert.equal(compServiceRegulatedImpl, complianceServiceRegulatedImplementation.address);
    assert.equal(compServicePartitionedImpl, complianceServicePartitionedImplementation.address);
    assert.equal(compServiceWhitelistedImpl, complianceServiceWhitelistedImplementation.address);
    assert.equal(compConfigurationServiceImpl, complianceConfigurationServiceImplementation.address);
    assert.equal(compServiceNotRegulatedImpl, complianceServiceNotRegulatedImplementation.address);
    assert.equal(walletManagerImpl, walletManagerImplementation.address);
    assert.equal(lockManagerImpl, lockManagerImplementation.address);
    assert.equal(investorLockManagerImpl, investorLockManagerImplementation.address);
    assert.equal(investorLockManagerPartitionedImpl, investorLockManagerPartitionedImplementation.address);
    assert.equal(dsTokenImpl, dsTokenImplementation.address);
    assert.equal(dsTokenPartitionedImpl, dsTokenPartitionedImplementation.address);
    assert.equal(tokenIssuerImpl, tokenIssuerImplementation.address);
    assert.equal(walletRegistrarImpl, walletRegistrarImplementation.address);
    assert.equal(partitionsManagerImpl, partitionsManagerImplementation.address);
    assert.equal(omnibusTbeControllerImpl, omnibusTbeControllerImplementation.address);
    assert.equal(omnibusTbeControllerWhitelistedImpl, omnibusTbeControllerWhitelistedImplementation.address);
    assert.equal(transactionRelayerImpl, transactionRelayerImplementation.address);
    assert.equal(tokenReallocatorImpl, tokenReallocatorImplementation.address);
  });

  describe('Deploying new TrustService', () => {
    it('Should deploy a new Proxy Trust Service and initialize it', async () => {
      const { logs } = await deploymentUtils.deployTrustService();
      await checkProxyContractDeployedEvent(logs);
      proxyTrustService = logs[0].args.proxyAddress;
    });
  });

  describe('Deploying new RegistryService', () => {
    it('Should deploy a new Proxy RegistryService and initialize it', async () => {
      const { logs } = await deploymentUtils.deployRegistryService();
      await checkProxyContractDeployedEvent(logs);
      proxyRegistryService = logs[0].args.proxyAddress;
      deployedProxies.push*(proxyRegistryService);
    });
  });

  describe('Deploying new ComplianceServiceNotRegulated', () => {
    it('Should deploy a new Proxy ComplianceServiceRegulated and initialize it', async () => {
      const { logs } = await deploymentUtils.deployComplianceServiceNotRegulated();
      await checkProxyContractDeployedEvent(logs);
      proxyComplianceServiceRegulated = logs[0].args.proxyAddress;
      deployedProxies.push(logs[0].args.proxyAddress);
    });
  });


  describe('Deploying new ComplianceServiceRegulated', () => {
    it('Should deploy a new Proxy ComplianceServiceRegulated and initialize it', async () => {
      const { logs } = await deploymentUtils.deployComplianceServiceRegulated();
      await checkProxyContractDeployedEvent(logs);
      proxyComplianceServiceRegulated = logs[0].args.proxyAddress;
      deployedProxies.push(logs[0].args.proxyAddress);
    });
  });

  describe('Deploying new ComplianceServicePartitioned', () => {
    it('Should deploy a new Proxy ComplianceServicePartitioned and initialize it', async () => {
      const { logs } = await deploymentUtils.deployComplianceServicePartitioned();
      await checkProxyContractDeployedEvent(logs);
      deployedProxies.push(logs[0].args.proxyAddress);
    });
  });

  describe('Deploying new ComplianceServiceWhitelisted', () => {
    it('Should deploy a new Proxy ComplianceServiceWhitelisted and initialize it', async () => {
      const { logs } = await deploymentUtils.deployComplianceServiceWhitelisted();
      await checkProxyContractDeployedEvent(logs);
      deployedProxies.push(logs[0].args.proxyAddress);
    });
  });

  describe('Deploying new ComplianceConfigurationService', () => {
    it('Should deploy a new Proxy ComplianceConfigurationService and initialize it', async () => {
      const { logs } = await deploymentUtils.deployConfigurationService();
      await checkProxyContractDeployedEvent(logs);
      deployedProxies.push(logs[0].args.proxyAddress);
    });
  });

  describe('Deploying new WalletManager', () => {
    it('Should deploy a new Proxy WalletManager and initialize it', async () => {
      const { logs } = await deploymentUtils.deployWalletManager();
      await checkProxyContractDeployedEvent(logs);
      deployedProxies.push(logs[0].args.proxyAddress);
    });
  });

  describe('Deploying new LockManager', () => {
    it('Should deploy a new Proxy InvestorLockManager and initialize it', async () => {
      const { logs } = await deploymentUtils.deployLockManager();
      await checkProxyContractDeployedEvent(logs);
      deployedProxies.push(logs[0].args.proxyAddress);
    });
  });

  describe('Deploying new InvestorLockManager', () => {
    it('Should deploy a new Proxy InvestorLockManager and initialize it', async () => {
      const { logs } = await deploymentUtils.deployInvestorLockManager();
      await checkProxyContractDeployedEvent(logs);
      deployedProxies.push(logs[0].args.proxyAddress);
    });
  });

  describe('Deploying new InvestorLockManagerPartitioned', () => {
    it('Should deploy a new Proxy InvestorLockManagerPartitioned and initialize it', async () => {
      const { logs } = await deploymentUtils.deployInvestorLockManagerPartitioned();
      await checkProxyContractDeployedEvent(logs);
      deployedProxies.push(logs[0].args.proxyAddress);
    });
  });

  describe('Deploying new PartitionsManager', () => {
    it('Should deploy a new Proxy Partitions Manager and initialize it', async () => {
      const { logs } = await deploymentUtils.deployPartitionsManager();
      await checkProxyContractDeployedEvent(logs);
      deployedProxies.push(logs[0].args.proxyAddress);
    });
  });

  describe('Deploying new DSToken', () => {
    it('Should deploy a new Proxy DSToken and initialize it', async () => {
      const { logs } = await deploymentUtils.deployDsToken('testing', 'tst', 2);
      await checkProxyContractDeployedEvent(logs);
      const token = await DSToken.at(logs[0].args.proxyAddress);

      const name = await token.name.call();
      const symbol = await token.symbol.call();
      const decimals = await token.decimals.call();

      assert.equal(name, 'testing');
      assert.equal(symbol, 'tst');
      assert.equal(decimals, 2);
      deployedProxies.push(logs[0].args.proxyAddress);
    });
  });

  describe('Deploying new OmnibusTBE Controller', () => {
    it('Should deploy a new Proxy OmnibusTbeController and initialize it', async () => {
      const isPartitioned = false;
      const { logs } = await deploymentUtils.deployOmnibusTbeController(accounts[1], isPartitioned);
      await checkProxyContractDeployedEvent(logs);
      deployedProxies.push(logs[0].args.proxyAddress);
    });

    it('Should deploy a new Proxy OmnibusTbeController Partitioned and initialize it', async () => {
      const isPartitioned = true;
      const { logs } = await deploymentUtils.deployOmnibusTbeController(accounts[1], isPartitioned);
      await checkProxyContractDeployedEvent(logs);
      deployedProxies.push(logs[0].args.proxyAddress);
    });
  });

  describe('Deploying new OmnibusTBE Controller Whitelisted', () => {
    it('Should deploy a new Proxy OmnibusTbeControllerWhitelisted and initialize it', async () => {
      const isPartitioned = false;
      const { logs } = await deploymentUtils.deployOmnibusTbeControllerWhitelisted(accounts[1], isPartitioned);
      await checkProxyContractDeployedEvent(logs);
      deployedProxies.push(logs[0].args.proxyAddress);
    });
  });

  describe('Deploying new DSTokenPartitioned', () => {
    it('Should deploy a new Proxy DSTokenPartitioned and initialize it', async () => {
      const { logs } = await deploymentUtils.deployDsTokenPartitioned('testingP', 'tstP', 8);
      await checkProxyContractDeployedEvent(logs);
      const token = await DSTokenPartitioned.at(logs[0].args.proxyAddress);

      const name = await token.name.call();
      const symbol = await token.symbol.call();
      const decimals = await token.decimals.call();

      assert.equal(name, 'testingP');
      assert.equal(symbol, 'tstP');
      assert.equal(decimals, 8);
      deployedProxies.push(logs[0].args.proxyAddress);
    });
  });

  describe('Deploying new TokenIssuer', () => {
    it('Should deploy a new Proxy TokenIssuer and initialize it', async () => {
      const { logs } = await deploymentUtils.deployTokenIssuer();
      await checkProxyContractDeployedEvent(logs);
      deployedProxies.push(logs[0].args.proxyAddress);
    });
  });

  describe('Deploying new WalletRegistrar', () => {
    it('Should deploy a new Proxy WalletRegistrar and initialize it', async () => {
      const { logs } = await deploymentUtils.deployWalletRegistrar();
      await checkProxyContractDeployedEvent(logs);
      deployedProxies.push(logs[0].args.proxyAddress);
    });
  });

  describe('Deploying new TransactionRealyer', () => {
    it('Should deploy a new Proxy TransactionRealyer and initialize it', async () => {
      const chainId = await web3.eth.getChainId();
      const { logs } = await deploymentUtils.deployTransactionRelayer(chainId);
      await checkProxyContractDeployedEvent(logs);
      deployedProxies.push(logs[0].args.proxyAddress);
    });
  });

  describe('Deploying new TokenReallocator', () => {
    it('Should deploy a new Proxy TokenReallocator and initialize it', async () => {
      const { logs } = await deploymentUtils.deployTokenReallocator();
      await checkProxyContractDeployedEvent(logs);
      deployedProxies.push(logs[0].args.proxyAddress);
    });
  });

  describe('Set DSServices', () => {
    it('Should set DSServices', async () => {
      await deploymentUtils.setDSServices(
        proxyComplianceServiceRegulated,
        [services.TRUST_SERVICE, services.REGISTRY_SERVICE],
        [proxyTrustService, proxyRegistryService]
      );
      const proxyCompliance = await ComplianceServiceRegulated.at(proxyComplianceServiceRegulated);
      const dsTrustService = await proxyCompliance.getDSService(services.TRUST_SERVICE);
      const dsRegistryService = await proxyCompliance.getDSService(services.REGISTRY_SERVICE);
      assert.equal(dsTrustService, proxyTrustService);
      assert.equal(dsRegistryService, proxyRegistryService);
    });
  });

  describe('Transfer Ownership to master', () => {
    it('Should fail when trying to transfer ownership of max allowed addresses', async function () {
      let proxiesArray = [];
      const MAX_PROXIES = 20;
      for (let i = 0; i < (MAX_PROXIES + 1); i++) {
        proxiesArray.push(proxyRegistryService);
      }
      await expectRevert.unspecified(
        deploymentUtils.transferOwnershipToMaster(
          newMasterAddress,
          proxiesArray
        )
      );
    });
    it('Should transfer ownership to new master', async () => {
      await deploymentUtils.transferOwnershipToMaster(
        newMasterAddress,
        deployedProxies
      );
      for (const proxyAddress of deployedProxies) {
        const ownable = await Ownable.at(proxyAddress);
        const proxy = await Proxy.at(proxyAddress);
        const newOwner = await ownable.owner();
        const newProxyOwner = await proxy.owner.call();
        assert.equal(newOwner, newMasterAddress);
        assert.equal(newProxyOwner, newMasterAddress);
      }
    });
    it('Should transfer ownership of trustService to a new master account', async () => {
      await deploymentUtils.transferTrustServiceOwnershipToMaster(newMasterAddress, proxyTrustService);
      const proxy = await Proxy.at(proxyTrustService);
      const newProxyOwner = await proxy.owner.call();
      assert.equal(newProxyOwner, newMasterAddress);
    });
  });
});

async function checkProxyContractDeployedEvent(logs) {
  assert.equal(logs.length, 1);
  assert.equal(logs[0].event, 'ProxyContractDeployed');
  assert.notEqual(logs[0].args.proxyAddress, ZERO_ADDRESS);
  await checkInitializedContract(logs[0].args.proxyAddress);
}

async function checkInitializedContract(proxyAddress) {
  const initializable = await Initializable.at(proxyAddress);
  const initialized = await initializable.initialized.call();
  assert.equal(initialized, true);
}
