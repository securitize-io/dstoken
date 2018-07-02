import assertRevert from './helpers/assertRevert';
const EternalStorage = artifacts.require('EternalStorage');
const DSToken = artifacts.require('DSToken');
const ESComplianceServiceNotRegulated = artifacts.require('ESComplianceServiceNotRegulated');
const ESTrustService = artifacts.require('ESTrustService');

const TRUST_SERVICE=1;
const DS_TOKEN=2;
const REGISTRY_SERVICE=4;
const COMPLIANCE_SERVICE=8;
const COMMS_SERVICE=16;

const NONE = 0;
const MASTER = 1;
const ISSUER = 2;
const EXCHANGE = 4;

contract('ESStandardToken', function ([_, owner, recipient, anotherAccount]) {
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

  beforeEach(async function () {

    this.storage = await EternalStorage.new();
    this.token = await DSToken.new('DSTokenTest', 'DST', 18, this.storage.address, 'DSTokenTest');
    this.complianceService = await ESComplianceServiceNotRegulated.new(this.storage.address, 'DSTokenTestComplianceManager');
    this.trustService = await ESTrustService.new(this.storage.address, 'DSTokenTestTrustManager');
    await this.storage.adminAddRole(this.trustService.address, 'write');
    await this.trustService.initialize();
    await this.storage.adminAddRole(this.token.address, 'write');
    await this.storage.adminAddRole(this.complianceService.address, 'write');
    await this.token.setDSService(COMPLIANCE_SERVICE,this.complianceService.address);
    await this.token.setDSService(TRUST_SERVICE,this.trustService.address);
    await this.complianceService.setDSService(DS_TOKEN,this.token.address);
  });

  describe('creation', function () {
    it('should get the basic details of the token correctly', async function () {
      const name = await this.token.name.call();
      const symbol = await this.token.symbol.call();
      const decimals = await this.token.decimals.call();
      const totalSupply = await this.token.totalSupply.call();

      assert.equal(name, 'DSTokenTest');
      assert.equal(symbol, 'DST');
      assert.equal(decimals.valueOf(), 18);
      assert.equal(totalSupply.valueOf(), 0);
    });
  });

  describe('cap', function() {
    it('cannot be set twice', async function() {
      await this.token.setCap(1000);
      await assertRevert(this.token.setCap(1000));
    });

    it('doesn\'t prevent issuing tokens within limit', async function() {
      await this.token.setCap(1000);
      await this.token.issueTokens(owner, 500);
      await this.token.issueTokens(owner, 500);
    });

    it('prevents issuing too many tokens', async function() {
      await this.token.setCap(1000);
      await this.token.issueTokens(owner, 500);
      await assertRevert(this.token.issueTokens(owner, 501));
    });
  });

  describe('issuance', function () {
    it('should issue tokens to a wallet', async function () {
      await this.token.issueTokens(owner, 100);
      const balance = await this.token.balanceOf(owner);
      assert.equal(balance, 100);
    });
  });
});
