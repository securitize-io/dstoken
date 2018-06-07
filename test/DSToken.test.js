import assertRevert from './helpers/assertRevert';
const EternalStorage = artifacts.require('EternalStorage');
const DSToken = artifacts.require('DSToken');
const ESComplianceServiceNotRegulated = artifacts.require('ESComplianceServiceNotRegulated');

contract('ESStandardToken', function ([_, owner, recipient, anotherAccount]) {
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

  beforeEach(async function () {
    this.storage = await EternalStorage.new();
    this.token = await DSToken.new('DSTokenTest', 'DST', 18, this.storage.address, 'DSTokenTest');
    this.complianceService = await ESComplianceServiceNotRegulated.new(this.storage.address, 'DSTokenTestComplianceManager');
    await this.storage.adminAddRole(this.token.address, 'write');
    // await this.storage.adminAddRole(this.complianceService.address, 'write');
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
});
