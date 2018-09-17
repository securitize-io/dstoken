import assertRevert from './helpers/assertRevert';
const DSEternalStorage = artifacts.require('DSEternalStorage');
const ESIssuanceInformationManager = artifacts.require('ESIssuanceInformationManager');
const ESTrustService = artifacts.require('ESTrustService');

const TRUST_SERVICE=1;

const NONE = 0;
const MASTER = 1;
const ISSUER = 2;
const EXCHANGE = 4;

contract('ESIssuanceInformationManager', function() {
  before(async function () {
    this.storage = await DSEternalStorage.new();
    this.trustService = await ESTrustService.new(this.storage.address, 'DSTokenTestTrustManager');
    this.issuanceInformationManager = await ESIssuanceInformationManager.new(this.storage.address, 'ESIssuanceInformationManager');
    await this.storage.adminAddRole(this.issuanceInformationManager.address, 'write');
    await this.storage.adminAddRole(this.trustService.address, 'write');
    await this.trustService.initialize();
    await this.issuanceInformationManager.setDSService(TRUST_SERVICE, this.trustService.address);
  });

  describe('Set investor information', function () {
    it(`should not set investor information because account don't have permissions`, async function () {
        await assertRevert(this.issuanceInformationManager.setInvestorInformation("1", 1, "1", { from: web3.eth.accounts[1] }));
    });

    it(`should set investor information right`, async function () {
        let tx1 = await this.issuanceInformationManager.setInvestorInformation("1", 1, "1");
        assert.equal(tx1.logs[0].event, 'DSIssuanceInformationManagerInvestorInformationSet');
        assert.equal(tx1.logs[0].args._id, "1");
        assert.equal(tx1.logs[0].args._informationId, 1);
        assert.equal(tx1.logs[0].args._hash, "1");
        assert.equal(tx1.logs[0].args._sender.valueOf(), web3.eth.accounts[0]);
    });
  });

  describe('Get investor information', function () {
    it(`should get investor information right`, async function () {
        let tx1 = await this.issuanceInformationManager.setInvestorInformation("1", 1, "1");
        assert.equal(tx1.logs[0].event, 'DSIssuanceInformationManagerInvestorInformationSet');
        assert.equal(tx1.logs[0].args._id, "1");
        assert.equal(tx1.logs[0].args._informationId, 1);
        assert.equal(tx1.logs[0].args._hash, "1");
        assert.equal(tx1.logs[0].args._sender.valueOf(), web3.eth.accounts[0]);
        assert.equal("1", await this.issuanceInformationManager.getInvestorInformation("1", 1));
    });
  });

  describe('Set compliance information', function () {
    it(`should not set compliance information because account don't have permissions`, async function () {
        await assertRevert(this.issuanceInformationManager.setComplianceInformation("1", 1, "1", { from: web3.eth.accounts[1] }));
    });

    it(`should set compliance information right`, async function () {
        let tx1 = await this.issuanceInformationManager.setComplianceInformation("1", 1, "1");
        assert.equal(tx1.logs[0].event, 'DSIssuanceInformationManagerComplianceInformationSet');
        assert.equal(tx1.logs[0].args._informationId, 1);
        assert.equal(tx1.logs[0].args._value, "1");
        assert.equal(tx1.logs[0].args._sender.valueOf(), web3.eth.accounts[0]);
    });
  });

  describe('Get compliance information', function () {
    it(`should get compliance information right`, async function () {
        let tx1 = await this.issuanceInformationManager.setComplianceInformation("1", 1, "1");
        assert.equal(tx1.logs[0].event, 'DSIssuanceInformationManagerComplianceInformationSet');
        assert.equal(tx1.logs[0].args._informationId, 1);
        assert.equal(tx1.logs[0].args._value, "1");
        assert.equal(tx1.logs[0].args._sender.valueOf(), web3.eth.accounts[0]);
        assert.equal("1", await this.issuanceInformationManager.getComplianceInformation("1", 1));
    });
  });

});
