import assertRevert from './helpers/assertRevert';
const EternalStorage = artifacts.require('DSEternalStorageVersioned');
const crypto = require('crypto');
const ESTrustService = artifacts.require('ESTrustServiceVersioned');
const ESRegistryService = artifacts.require('ESRegistryServiceVersioned');
const ESWalletManager = artifacts.require('ESWalletManagerVersioned');
const DSToken = artifacts.require('DSTokenVersioned');
const Proxy = artifacts.require('ProxyVersioned');

const TRUST_SERVICE=1;
const DS_TOKEN=2;
const REGISTRY_SERVICE=4;
const COMPLIANCE_SERVICE=8;
const COMMS_SERVICE=16;
const WALLET_MANAGER=32;
const LOCK_MANAGER=64;
const ISSUANCE_INFORMATION_MANAGER=128;

const NONE = 0;
const MASTER = 1;
const ISSUER = 2;
const EXCHANGE = 4;

const KYC_APPROVED = 1;
const ACCREDITED = 2;
const QUALIFIED = 4;
const PROFESSIONAL = 8;

const PENDING = 0;
const APPROVED = 1;
const REJECTED = 2;

let investorFullName = 'olegvoytenko';
let investorBirthDate = '28091994';
let investorIdNumber = 'MT753328';
let investorCountry = 'Ukraine';

let investorId = generateInvestorId(investorFullName,investorBirthDate, investorIdNumber);
let investorCollisionHash = generateCollisionHash(investorFullName,investorBirthDate);

let attributeTypes = [KYC_APPROVED, ACCREDITED, QUALIFIED, PROFESSIONAL];
let attributeStatuses = [PENDING, APPROVED, REJECTED];

const expiry = '10072018';
const proofHash = generateRandomInvestorId();

contract('ESRegistryService', function ([owner, noneAccount, issuerAccount, exchangeAccount, account1, wallet1, wallet2, issuerWallet, exchangeWallet, additionalWallet]) {
  before(async function () {
    this.storage = await EternalStorage.new();
    this.trustService = await ESTrustService.new(this.storage.address, 'DSTokenTestTrustManager');
    this.registryService = await ESRegistryService.new(this.storage.address, 'DSTokenTestESRegistryService');
    this.walletManager = await ESWalletManager.new(this.storage.address, 'DSTokenTestWalletManager');
    this.tokenImpl = await DSToken.new();
    this.proxy = await Proxy.new();
    await this.proxy.setTarget(this.tokenImpl.address);
    this.token = DSToken.at(this.proxy.address);
    await this.token.initialize('DSTokenMock', 'DST', 18, this.storage.address, 'DSTokenMock');

    await this.storage.adminAddRole(this.trustService.address, 'write');
    await this.storage.adminAddRole(this.registryService.address, 'write');
    await this.storage.adminAddRole(this.walletManager.address, 'write');
    await this.storage.adminAddRole(this.token.address, 'write');
    await this.trustService.initialize();
    await this.registryService.setDSService(TRUST_SERVICE, this.trustService.address);
    await this.registryService.setDSService(WALLET_MANAGER,this.walletManager.address);
    await this.registryService.setDSService(DS_TOKEN,this.token.address);
    await this.walletManager.setDSService(REGISTRY_SERVICE,this.registryService.address);
    await this.walletManager.setDSService(TRUST_SERVICE,this.trustService.address);
    await this.token.setDSService(REGISTRY_SERVICE,this.registryService.address);
  });

  describe('Register the new investor flow', function () {
    describe('Register investor', function () {
      it(`Checking the role for the creator account - ${owner} - should be MASTER - ${MASTER}`, async function () {
        const role = await this.trustService.getRole(owner);

        assert.equal(role.c[0], MASTER);
      });

      it('Trying to register the new investor', async function () {
        const {logs} = await this.registryService.registerInvestor(investorId, investorCollisionHash);

        assert.equal(logs.length, 1);
        assert.equal(logs[0].event, 'DSRegistryServiceInvestorAdded');
        assert.equal(logs[0].args._investorId, investorId);
        assert.equal(logs[0].args._sender, owner);
      });

      describe('Register investor: negative tests ', function () {
        it(`Trying to register the same account twice - should be an error`, async function () {
          await assertRevert(this.registryService.registerInvestor(investorId, investorCollisionHash));
        });

        it(`Trying to register the new investor using the account - ${account1} with NONE - ${NONE} permissions - should be the error`, async function () {
          const newInvestorId = generateRandomInvestorId();
          const role = await this.trustService.getRole(account1);

          assert.equal(role.c[0], NONE);
          await assertRevert(this.registryService.registerInvestor(newInvestorId, investorCollisionHash, {from: account1}));
        });
      });
    });

    describe('SET | GET the country', function () {
      it('Trying to set the country for the investor', async function () {
        const { logs } = await this.registryService.setCountry(investorId, investorCountry);

        assert.equal(logs.length, 1);
        assert.equal(logs[0].event, 'DSRegistryServiceInvestorCountryChanged');
        assert.equal(logs[0].args._investorId, investorId);
        assert.equal(logs[0].args._sender, owner);
      });

      it('Trying to get the country for investor', async function () {
        const country = await this.registryService.getCountry(investorId);

        assert.equal(country, investorCountry);
      });

      describe('SET | GET the country: negative tests', function () {
        it(`Trying to set the country using the account with NONE - ${NONE} permissions - should be the error`, async function () {
          const newInvestorId = generateRandomInvestorId();
          const role = await this.trustService.getRole(account1);

          assert.equal(role.c[0], NONE);
          await assertRevert(this.registryService.setCountry(newInvestorId, investorCountry, {from: account1}));
        });

        it('Trying to set the country for the investor with wrong ID - should be the error', async function () {
          const newInvestorId = generateRandomInvestorId();

          await assertRevert(this.registryService.setCountry(newInvestorId, investorCountry));
        });

        // TODO: activate test
        it('Trying to get the country for the investor with wrong ID - should be empty', async function () {
          const newInvestorId = generateRandomInvestorId();

          const country = await this.registryService.getCountry(newInvestorId);
          assert.equal(country, '');
        });
      });
    });

    describe('Collision hash', function () {
      it('Trying to get the collision hash', async function () {
        const collisionHash = await this.registryService.getCollisionHash(investorId);

        assert.equal(collisionHash, investorCollisionHash);
      });

      describe('Collision hash: negative tests', function () {
        it('Trying to get the collision hash for the investor with wrong ID - should be empty', async function () {
          const newInvestorId = generateRandomInvestorId();

          const collisionHash = await this.registryService.getCollisionHash(newInvestorId);

          assert.equal(collisionHash, '');
        });
      });
    });

    describe('Attributes', function () {
      it(`Trying to set and get the attributes`, async function () {
        for (let i = 0; i < attributeTypes.length; i++) {
          for (let j = 0; j < attributeStatuses.length; j++) {
            const {logs} = await this.registryService.setAttribute(investorId, attributeTypes[i], attributeStatuses[j], expiry, proofHash);

            assert.equal(logs.length, 1);
            assert.equal(logs[0].event, 'DSRegistryServiceInvestorAttributeChanged');
            assert.equal(logs[0].args._investorId, investorId);
            assert.equal(logs[0].args._sender, owner);

            const attributeValue = await this.registryService.getAttributeValue(investorId, attributeTypes[i]);

            assert.equal(attributeValue.c[0], attributeStatuses[j]);
          }
        }
      });

      it(`Trying to get the attribute expire`, async function () {
        const attributeExpiry = await this.registryService.getAttributeExpiry(investorId, KYC_APPROVED);

        assert.equal(attributeExpiry, expiry);
      });

      it(`Trying to get the attribute proof hash`, async function () {
        const attributeProofHash = await this.registryService.getAttributeProofHash(investorId, KYC_APPROVED);

        assert.equal(attributeProofHash, proofHash);
      });

      describe('Attributes: negative tests', function () {
        it(`Trying to set the attribute using the account with NONE - ${NONE} permissions - should be the error`, async function () {
          const role = await this.trustService.getRole(account1);

          assert.equal(role.c[0], NONE);
          await assertRevert(this.registryService.setAttribute(investorId, KYC_APPROVED, PENDING, expiry, proofHash, {from: account1}));
        });

        it('Trying to set the attribute for the investor with wrong ID - should be the error', async function () {
          const newInvestorId = generateRandomInvestorId();

          await assertRevert(this.registryService.setAttribute(newInvestorId, KYC_APPROVED, PENDING, expiry, proofHash));
        });

        it('Trying to get the attribute for the investor with wrong ID - should be empty', async function () {
          const newInvestorId = generateRandomInvestorId();

          const value = await this.registryService.getAttributeValue(newInvestorId, KYC_APPROVED);

          assert.equal(value, NONE);
        });

        // TODO: clarify should we prevent this error or no?
        // it('Trying to set the attribute with wrong attributeId - should be the error', async function () {
        //   const wrongAttributeId = 'KYC_APPROVED';
        //
        //   await assertRevert(this.registryService.setAttribute(investorId, wrongAttributeId, PENDING, expiry, proofHash));
        // });

        // TODO: clarify should we prevent this error or no?
        // it('Trying to set the attribute with wrong value - should be the error', async function () {
        //   const wrongValue = 'PENDING';
        //
        //   await assertRevert(this.registryService.setAttribute(investorId, KYC_APPROVED, wrongValue, expiry, proofHash));
        // });

        // TODO: clarify should we prevent this error or no?
        // it('Trying to set the attribute with wrong expire date - should be the error', async function () {
        //   const wrongExpireDate = '13-07-2018';
        //
        //   await assertRevert(this.registryService.setAttribute(investorId, KYC_APPROVED, PENDING, wrongExpireDate, proofHash));
        // });
      });
    });

    describe('Wallets', function () {
      before(async function () {
        await this.trustService.setRole(issuerAccount, ISSUER);
        await this.registryService.addWallet(issuerWallet, investorId, { from: issuerAccount });
        await this.trustService.setRole(exchangeAccount, EXCHANGE);
        await this.registryService.addWallet(exchangeWallet, investorId, { from: exchangeAccount });
      });
      it(`Trying to add the wallet - ${wallet1}`, async function () {
        const { logs } = await this.registryService.addWallet(wallet1, investorId);

        assert.equal(logs.length, 1);
        assert.equal(logs[0].event, 'DSRegistryServiceWalletAdded');
        assert.equal(logs[0].args._investorId, investorId);
        assert.equal(logs[0].args._wallet, wallet1);
        assert.equal(logs[0].args._sender, owner);
      });

      it(`Trying to remove the wallet with MASTER - ${MASTER} permissions`, async function () {
        const { logs } = await this.registryService.removeWallet(wallet1, investorId);

        assert.equal(logs.length, 1);
        assert.equal(logs[0].event, 'DSRegistryServiceWalletRemoved');
      });

      it(`Trying to remove the wallet with ISSUER - ${ISSUER} permissions`, async function () {
        const role = await this.trustService.getRole(issuerAccount);

        assert.equal(role.c[0], ISSUER);

        const { logs } = await this.registryService.removeWallet(issuerWallet, investorId, { from: issuerAccount });

        assert.equal(logs.length, 1);
        assert.equal(logs[0].event, 'DSRegistryServiceWalletRemoved');
      });

      it(`Trying to remove the wallet with EXCHANGE - ${EXCHANGE} permissions (same one that created the wallet)`, async function () {
        const role = await this.trustService.getRole(exchangeAccount);

        assert.equal(role.c[0], EXCHANGE);

        const { logs } = await this.registryService.removeWallet(exchangeWallet, investorId, { from: exchangeAccount });

        assert.equal(logs.length, 1);
        assert.equal(logs[0].event, 'DSRegistryServiceWalletRemoved');
      });

      describe('Wallets: negative tests', function () {
        before(async function () {
          await this.registryService.addWallet(wallet1, investorId);
          this.registryService.addWallet(exchangeWallet, investorId, { from: exchangeAccount });
        });

        it(`Trying to add the wallet with NONE permissions`, async function () {
          const role = await this.trustService.getRole(account1);

          assert.equal(role.c[0], NONE);
          await assertRevert(this.registryService.addWallet(wallet2, investorId, { from: account1 }));
        });

        it(`Trying to add the same wallet - should be the error`, async function () {
          await assertRevert(this.registryService.addWallet(wallet1, investorId));
        });

        it(`Trying to remove the wallet from the investor that doesn't exist - should be the error`, async function () {
          const newInvestorId = generateRandomInvestorId();

          await assertRevert(this.registryService.removeWallet(wallet1, newInvestorId));
        });

        it(`Trying to remove the wallet with the wrong investor - should be the error`, async function () {
          await assertRevert(this.registryService.removeWallet(wallet1, issuerWallet));
        });

        it(`Trying to remove the wallet that doesn't exist - should be the error`, async function () {
          await assertRevert(this.registryService.removeWallet(additionalWallet, investorId));
        });

        it(`Trying to remove the wallet by an exchange which didn't create it - should be the error`, async function () {
          this.trustService.setRole(additionalWallet, EXCHANGE);
          await assertRevert(this.registryService.removeWallet(exchangeWallet, investorId, { from: additionalWallet }));
        });

        it(`Trying to remove the wallet by a wallet without permissions - should be the error`, async function () {
          await assertRevert(this.registryService.removeWallet(exchangeWallet, investorId, { from: wallet1 }));
        });

        it(`A wallet trying to remove itself - should be the error`, async function () {
          await assertRevert(this.registryService.removeWallet(exchangeWallet, investorId, { from: exchangeWallet }));
        });
      });
    });

    describe('Get the investor', function () {
      it('Trying to get the investor', async function () {
        const investorID = await this.registryService.getInvestor(wallet1);

        assert.equal(investorID, investorId);
      });

      it('Trying to get the investor details', async function () {
        const investorDetails = await this.registryService.getInvestorDetails(wallet1);

        assert.equal(investorDetails[0], investorId);
        assert.equal(investorDetails[1], investorCountry);
      });
      describe('Get the investor: negative tests', function () {
        // TODO: activate test
        it('Trying to get the investor using the wrong Wallet - should be empty', async function () {
          const investor = await this.registryService.getInvestor(additionalWallet);

          assert.equal(investor, '');
        });

        it('Trying to get the investor details using the wrong Wallet - should be empty', async function () {
          const investorDetails = await this.registryService.getInvestorDetails(additionalWallet);

          assert.deepEqual(investorDetails, ['','']);
        });
      });
    });
  });
});

function generateInvestorId (fullName, birthDay, idNumber) {
  const hashString = `${fullName}${birthDay}${idNumber}`;
  return crypto.createHash('sha256').update(hashString).digest('hex');
};

function generateRandomInvestorId () {
  const fullName = generateRandomString();
  const birthDay = generateRandomString();
  const idNumber = generateRandomString();
  const hashString = `${fullName}${birthDay}${idNumber}`;

  return crypto.createHash('sha256').update(hashString).digest('hex');
};

function generateCollisionHash (fullName, birthDay) {
  const hashString = `${fullName}${birthDay}`;
  return crypto.createHash('sha256').update(hashString).digest('hex');
};

function generateRandomString () {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};