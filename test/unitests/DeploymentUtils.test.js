const DeploymentUtils = artifacts.require('DeploymentUtils');
const TrustService = artifacts.require('TrustService');
const InvestorLockManager = artifacts.require('InvestorLockManager');
const InvestorLockManagerPartitioned = artifacts.require('InvestorLockManagerPartitioned');
const RegistryService = artifacts.require('RegistryService');
const WalletManager = artifacts.require('WalletManager');
const ComplianceServiceRegulated = artifacts.require('ComplianceServiceRegulated');
const ComplianceServiceWhitelisted = artifacts.require('ComplianceServiceWhitelisted');
const ComplianceServiceRegulatedPartitioned = artifacts.require('ComplianceServiceRegulatedPartitioned');
const ComplianceConfigurationService = artifacts.require('ComplianceConfigurationService');
const DSToken = artifacts.require('DSToken');
const DSTokenPartitioned = artifacts.require('DSTokenPartitioned');

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const TRUST_SERVICE = 0;
const REGISTRY_SERVICE = 1;
const COMPLIANCE_SERVICE_REGULATED = 2;
const COMPLIANCE_SERVICE_PARTITIONED = 3;
const COMPLIANCE_SERVICE_WHITELISTED = 4;
const COMPLIANCE_CONFIGURATION = 5;
const WALLET_MANAGER = 6;
const INVESTOR_LOCK_MANAGER = 7;
const INVESTOR_LOCK_MANAGER_PARTITIONED = 8;
const DS_TOKEN = 9;
const DS_TOKEN_PARTITIONED = 10;

const globals = require('../../utils/globals');
const services = globals.services;

contract.only('DeploymentUtils', function (accounts) {
  let deploymentUtils;
  let trustServiceImplementation;
  let proxyTrustService;
  let registryServiceImplementation;
  let proxyRegistryService;
  let complianceServiceRegulatedImplementation;
  let complianceServiceWhitelistedImplementation;
  let complianceServicePartitionedImplementation;
  let proxyComplianceServiceRegulated;
  let complianceConfigurationServiceImplementation;
  let walletManagerImplementation;
  let investorLockManagerImplementation;
  let investorLockManagerPartitionedImplementation;
  let dsTokenImplementation;
  let dsTokenPartitionedImplementation;

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

    complianceConfigurationServiceImplementation = await ComplianceConfigurationService.new();
    services.push(COMPLIANCE_CONFIGURATION);
    addresses.push(complianceConfigurationServiceImplementation.address);

    walletManagerImplementation = await WalletManager.new();
    services.push(WALLET_MANAGER);
    addresses.push(walletManagerImplementation.address);

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

    await deploymentUtils.setImplementationAddresses(services, addresses);
    const trustImpl = await deploymentUtils.getImplementationAddress(TRUST_SERVICE);
    const registryImpl = await deploymentUtils.getImplementationAddress(REGISTRY_SERVICE);
    const compServiceRegulatedImpl = await deploymentUtils.getImplementationAddress(COMPLIANCE_SERVICE_REGULATED);
    const compServicePartitionedImpl = await deploymentUtils.getImplementationAddress(COMPLIANCE_SERVICE_PARTITIONED);
    const compServiceWhitelistedImpl = await deploymentUtils.getImplementationAddress(COMPLIANCE_SERVICE_WHITELISTED);
    const compConfigurationServiceImpl = await deploymentUtils.getImplementationAddress(COMPLIANCE_CONFIGURATION);
    const walletManagerImpl = await deploymentUtils.getImplementationAddress(WALLET_MANAGER);
    const investorLockManagerImpl = await deploymentUtils.getImplementationAddress(INVESTOR_LOCK_MANAGER);
    const investorLockManagerPartitionedImpl = await deploymentUtils.getImplementationAddress(INVESTOR_LOCK_MANAGER_PARTITIONED);
    const dsTokenImpl = await deploymentUtils.getImplementationAddress(DS_TOKEN);
    const dsTokenPartitionedImpl = await deploymentUtils.getImplementationAddress(DS_TOKEN_PARTITIONED);

    assert.equal(trustImpl, trustServiceImplementation.address);
    assert.equal(registryImpl, registryServiceImplementation.address);
    assert.equal(compServiceRegulatedImpl, complianceServiceRegulatedImplementation.address);
    assert.equal(compServicePartitionedImpl, complianceServicePartitionedImplementation.address);
    assert.equal(compServiceWhitelistedImpl, complianceServiceWhitelistedImplementation.address);
    assert.equal(compConfigurationServiceImpl, complianceConfigurationServiceImplementation.address);
    assert.equal(walletManagerImpl, walletManagerImplementation.address);
    assert.equal(investorLockManagerImpl, investorLockManagerImplementation.address);
    assert.equal(investorLockManagerPartitionedImpl, investorLockManagerPartitionedImplementation.address);
    assert.equal(dsTokenImpl, dsTokenImplementation.address);
    assert.equal(dsTokenPartitionedImpl, dsTokenPartitionedImplementation.address);
  });

  describe('Deploying new TrustService', () => {
    it('Should deploy a new Proxy Trust Service and initialize it', async () => {
      const { logs } = await deploymentUtils.deployTrustService();
      checkProxyContractDeployedEvent(logs);
      proxyTrustService = logs[0].args.proxyAddress;
    });
  });

  describe('Deploying new RegistryService', () => {
    it('Should deploy a new Proxy RegistryService and initialize it', async () => {
      const { logs } = await deploymentUtils.deployRegistryService();
      checkProxyContractDeployedEvent(logs);
      proxyRegistryService = logs[0].args.proxyAddress;
    });
  });

  describe('Deploying new ComplianceServiceRegulated', () => {
    it('Should deploy a new Proxy ComplianceServiceRegulated and initialize it', async () => {
      const { logs } = await deploymentUtils.deployComplianceServiceRegulated();
      checkProxyContractDeployedEvent(logs);
      proxyComplianceServiceRegulated = logs[0].args.proxyAddress;
    });
  });

  describe('Deploying new ComplianceServicePartitioned', () => {
    it('Should deploy a new Proxy ComplianceServicePartitioned and initialize it', async () => {
      const { logs } = await deploymentUtils.deployComplianceServicePartitioned();
      checkProxyContractDeployedEvent(logs);
    });
  });

  describe('Deploying new ComplianceServiceWhitelisted', () => {
    it('Should deploy a new Proxy ComplianceServiceWhitelisted and initialize it', async () => {
      const { logs } = await deploymentUtils.deployComplianceServiceWhitelisted();
      checkProxyContractDeployedEvent(logs);
    });
  });

  describe('Deploying new ComplianceConfigurationService', () => {
    it('Should deploy a new Proxy ComplianceConfigurationService and initialize it', async () => {
      const { logs } = await deploymentUtils.deployConfigurationService();
      checkProxyContractDeployedEvent(logs);
    });
  });

  describe('Deploying new WalletManager', () => {
    it('Should deploy a new Proxy WalletManager and initialize it', async () => {
      const { logs } = await deploymentUtils.deployWalletManager();
      checkProxyContractDeployedEvent(logs);
    });
  });

  describe('Deploying new InvestorLockManager', () => {
    it('Should deploy a new Proxy InvestorLockManager and initialize it', async () => {
      const { logs } = await deploymentUtils.deployInvestorLockManager();
      checkProxyContractDeployedEvent(logs);
    });
  });

  describe('Deploying new InvestorLockManagerPartitioned', () => {
    it('Should deploy a new Proxy InvestorLockManagerPartitioned and initialize it', async () => {
      const { logs } = await deploymentUtils.deployInvestorLockManagerPartitioned();
      checkProxyContractDeployedEvent(logs);
    });
  });

  describe('Deploying new DSToken', () => {
    it('Should deploy a new Proxy DSToken and initialize it', async () => {
      const { logs } = await deploymentUtils.deployDsToken('testing', 'tst', 2);
      checkProxyContractDeployedEvent(logs);
      const token = await DSToken.at(logs[0].args.proxyAddress);

      const name = await token.name.call();
      const symbol = await token.symbol.call();
      const decimals = await token.decimals.call();

      assert.equal(name, 'testing');
      assert.equal(symbol, 'tst');
      assert.equal(decimals, 2);
    });
  });

  describe('Deploying new DSTokenPartitioned', () => {
    it('Should deploy a new Proxy DSTokenPartitioned and initialize it', async () => {
      const { logs } = await deploymentUtils.deployDsTokenPartitioned('testingP', 'tstP', 8);
      checkProxyContractDeployedEvent(logs);
      const token = await DSTokenPartitioned.at(logs[0].args.proxyAddress);

      const name = await token.name.call();
      const symbol = await token.symbol.call();
      const decimals = await token.decimals.call();

      assert.equal(name, 'testingP');
      assert.equal(symbol, 'tstP');
      assert.equal(decimals, 8);
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
});

function checkProxyContractDeployedEvent(logs) {
  assert.equal(logs.length, 1);
  assert.equal(logs[0].event, 'ProxyContractDeployed');
  assert.notEqual(logs[0].args.proxyAddress, ZERO_ADDRESS);
}
