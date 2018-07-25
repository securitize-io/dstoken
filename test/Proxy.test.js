import assertRevert from './helpers/assertRevert';

const SimpleContractMock = artifacts.require('SimpleContractMock');
const SimpleContractMock2 = artifacts.require('SimpleContractMock2');
const Proxy = artifacts.require('Proxy');

contract('PROXY', function ([owner, recipient, anotherAccount]) {
  beforeEach(async function () {
    this.simpleContract = await SimpleContractMock.new();
    this.proxy = await Proxy.new();
    await this.proxy.setTarget(this.simpleContract.address);
    this.simpleContractProxy = SimpleContractMock.at(this.proxy.address);
  });

  describe('creation', function () {
    it('Should be able to create a mock contract and proxy', async function () {
      // Do nothing
    });
  });
  describe('delegating functions', function () {
    it('should be able to call a function without delegation', async function () {
      let x = await this.simpleContract.getX.call();
      assert.equal(x.valueOf(), 0);
      await this.simpleContract.setX(17);
      x = await this.simpleContract.getX.call();
      assert.equal(x.valueOf(), 17);
    });
    it('should be able to delegate a function call', async function () {
      let x = await this.simpleContractProxy.getX.call();
      assert.equal(x.valueOf(), 0);
      await this.simpleContractProxy.setX(17);
      x = await this.simpleContractProxy.getX.call();
      assert.equal(x.valueOf(), 17);
    });
    it('should recognize correctly the message sender', async function () {
      let tx1 = await this.simpleContractProxy.logSender();
      assert.equal(tx1.logs[0].event, 'SenderLogged');
      assert.equal(tx1.logs[0].args.sender.valueOf(), owner);
    });
  });
  describe('switching implementations', function () {
    it('should be able to switch the proxy implementation', async function () {
      await this.simpleContractProxy.setX(17);
      let x = await this.simpleContractProxy.getX.call();
      assert.equal(x.valueOf(), 17);

      const newSimpleContract = await SimpleContractMock2.new();
      await this.proxy.setTarget(newSimpleContract.address);
      x = await this.simpleContractProxy.getX.call();
      assert.equal(x.valueOf(), 18);
      // Back to the first one
      await this.proxy.setTarget(this.simpleContract.address);
      x = await this.simpleContractProxy.getX.call();
      assert.equal(x.valueOf(), 17);
    });
    it('should not allow switching implementation from a non-owner', async function () {
      const newSimpleContract = await SimpleContractMock.new();
      await assertRevert(this.proxy.setTarget(newSimpleContract.address, { from: anotherAccount }));
    });
  });
});
