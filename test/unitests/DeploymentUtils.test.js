const DeploymentUtils = artifacts.require('DeploymentUtils');
const TrustService = artifacts.require('TrustService');
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const TRUST_SERVICE = 0;
contract.only('DeploymentUtils', function (accounts) {
  let deploymentUtils;
  let trustServiceImplementation;

  before(async () => {
    deploymentUtils = await DeploymentUtils.new();
    trustServiceImplementation = await TrustService.new();
    await deploymentUtils.setImplementationAddresses([TRUST_SERVICE], [trustServiceImplementation.address]);
    const trustImpl = await deploymentUtils.getImplementationAddress(TRUST_SERVICE);
    assert.equal(trustImpl, trustServiceImplementation.address);
  });

  describe('Deploying new TrustService', () => {
    it('Should deploy a new Proxy Trust Service and initialize it', async () => {
      const { logs } = await deploymentUtils.deployTrustService();
      assert.equal(logs.length, 1);
      assert.equal(logs[0].event, 'ProxyContractDeployed');
      assert.notEqual(logs[0].args.proxyAddress, ZERO_ADDRESS);
    });
  });
});
