import assertRevert from './helpers/assertRevert';
const EternalStorage = artifacts.require('EternalStorage');
const crypto = require('crypto');
const ESTrustService = artifacts.require('ESTrustService');
const ESRegistryService = artifacts.require('ESRegistryService');

const TRUST_SERVICE = 1;

const NONE = 0;
const MASTER = 1;
const ISSUER = 2;
const EXCHANGE = 4;

const investorFullName = 'olegvoytenko';
const investorBirthDate = '28091994';
const investorIdNumber = 'MT753328';
const investorCountry = 'Ukraine';

const investorId = generateInvestorId(investorFullName,investorBirthDate, investorIdNumber);
const investorCollisionHash = generateCollisionHash(investorFullName,investorBirthDate);

const attributeValue1 = 1;

contract('ESRegistryService', function ([owner, noneAccount, account1, account2, account3, account4]) {
  before(async function () {
    this.storage = await EternalStorage.new();
    this.trustService = await ESTrustService.new(this.storage.address, 'DSTokenTestTrustManager');
    this.registryService = await ESRegistryService.new(this.storage.address, 'DSTokenTestESRegistryService');

    await this.storage.adminAddRole(this.trustService.address, 'write');
    await this.storage.adminAddRole(this.registryService.address, 'write');
    await this.trustService.initialize();
    await this.registryService.setDSService(TRUST_SERVICE,this.trustService.address);
  });

  describe('Register the new investor flow', function () {
    it(`Checking the role for the creator account - ${owner} - should be MASTER - ${MASTER}`, async function () {
      const role =  await this.trustService.getRole(owner);

      assert.equal(role.c[0], MASTER);
    });

    it('Trying to register the new investor', async function () {
      const { logs } = await this.registryService.registerInvestor(investorId, investorCollisionHash);

      assert.equal(logs.length, 1);
      assert.equal(logs[0].event, 'DSRegistryServiceInvestorAdded');
      assert.equal(logs[0].args._investorId, investorId);
      assert.equal(logs[0].args._sender, owner);
    });

    // TODO: Check why this test is down
    // it(`Trying to register the new investor using the account - ${account1} with NONE - ${NONE} permissions - should be the error`, async function () {
    //   await assertRevert(await this.registryService.registerInvestor(investorId, investorCollisionHash, {from: account1}));
    // });

    it('Trying to set the country for the investor', async function () {
      const { logs } = await this.registryService.setCountry(investorId, investorCountry);

      assert.equal(logs.length, 1);
      assert.equal(logs[0].event, 'DSRegistryServiceInvestorChanged');
      assert.equal(logs[0].args._investorId, investorId);
      assert.equal(logs[0].args._sender, owner);
    });

    it('Trying to get the country for investor', async function () {
      const country = await this.registryService.getCountry(investorId);

      assert.equal(country, investorCountry);
    });

    it('Trying to get the collision hash', async function () {
      const collisionHash = await this.registryService.getCollisionHash(investorId);

      assert.equal(collisionHash, investorCollisionHash);
    });

    it(`Trying to add the wallet - ${account1}`, async function () {
      const { logs } = await this.registryService.addWallet(account1, investorId);

      assert.equal(logs.length, 1);
      assert.equal(logs[0].event, 'DSRegistryServiceWalletAdded');
      assert.equal(logs[0].args._investorId, investorId);
      assert.equal(logs[0].args._wallet, account1);
      assert.equal(logs[0].args._sender, owner);
    });

    // TODO: Check why this test is down
    // it(`Trying to add the wallet - ${account1}`, async function () {
    //   await assertRevert(await this.registryService.addWallet(account1, investorId, {from: account2}));
    // });

    // TODO: if the wallet already exists - throw.
    // it(`Trying to add the same wallet - should be the error`, async function () {
    //   await assertRevert(await this.registryService.addWallet(account1, investorId));
    // });

    it('Trying to get the investor', async function () {
      const investorID = await this.registryService.getInvestor(account1);

      assert.equal(investorID, investorId);
    });

    it(`Trying to set the attribute`, async function () {
      const { logs } = await this.registryService.setAttribute(investorId, 1, attributeValue1, '17062018', '');

      assert.equal(logs.length, 1);
      assert.equal(logs[0].event, 'DSRegistryServiceInvestorChanged');
      assert.equal(logs[0].args._investorId, investorId);
      assert.equal(logs[0].args._sender, owner);
    });

    it('Trying to get attribute value', async function () {
      const attributeValue = await this.registryService.getAttributeValue(investorId, 1);

      assert.equal(attributeValue.c[0], attributeValue1);
    });
  });
});

function generateInvestorId (fullName, birthDay, idNumber) {
  const hashString = `${fullName}${birthDay}${idNumber}`;
  return crypto.createHash('sha256').update(hashString).digest('hex');
};

function generateCollisionHash (fullName, birthDay) {
  const hashString = `${fullName}${birthDay}`;
  return crypto.createHash('sha256').update(hashString).digest('hex');
};
