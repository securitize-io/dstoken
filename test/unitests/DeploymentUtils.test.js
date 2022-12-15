const DeploymentUtils = artifacts.require('DeploymentUtils');
const TrustService = artifacts.require('TrustService');
const RegistryService = artifacts.require('RegistryService');
const ComplianceServiceRegulated = artifacts.require('ComplianceServiceRegulated');
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const TRUST_SERVICE = 0;
const REGISTRY_SERVICE = 1;
const COMPLIANCE_SERVICE_REGULATED = 2;

contract.only('DeploymentUtils', function (accounts) {
  let deploymentUtils;
  let trustServiceImplementation;
  let registryServiceImplementation;
  let complianceServiceRegulatedImplementation;

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

    await deploymentUtils.setImplementationAddresses(services, addresses);
    const trustImpl = await deploymentUtils.getImplementationAddress(TRUST_SERVICE);
    const registryImpl = await deploymentUtils.getImplementationAddress(REGISTRY_SERVICE);
    const compServiceRegulatedImpl = await deploymentUtils.getImplementationAddress(COMPLIANCE_SERVICE_REGULATED);
    assert.equal(trustImpl, trustServiceImplementation.address);
    assert.equal(registryImpl, registryServiceImplementation.address);
    assert.equal(compServiceRegulatedImpl, complianceServiceRegulatedImplementation.address);
  });

  describe('Deploying new TrustService', () => {
    it('Should deploy a new Proxy Trust Service and initialize it', async () => {
      const { logs } = await deploymentUtils.deployTrustService();
      assert.equal(logs.length, 1);
      assert.equal(logs[0].event, 'ProxyContractDeployed');
      assert.notEqual(logs[0].args.proxyAddress, ZERO_ADDRESS);
    });
  });

  describe('Deploying new RegistryService', () => {
    it('Should deploy a new Proxy RegistryService and initialize it', async () => {
      const { logs } = await deploymentUtils.deployRegistryService();
      assert.equal(logs.length, 1);
      assert.equal(logs[0].event, 'ProxyContractDeployed');
      assert.notEqual(logs[0].args.proxyAddress, ZERO_ADDRESS);
    });
  });

  describe('Deploying new ComplianceServiceRegulated', () => {
    it('Should deploy a new Proxy ComplianceServiceRegulated and initialize it', async () => {
      const { logs } = await deploymentUtils.deployComplianceServiceRegulated();
      assert.equal(logs.length, 1);
      assert.equal(logs[0].event, 'ProxyContractDeployed');
      assert.notEqual(logs[0].args.proxyAddress, ZERO_ADDRESS);
    });
  });
});
