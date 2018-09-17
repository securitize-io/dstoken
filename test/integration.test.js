/* eslint-disable comma-spacing,max-len */
import assertRevert from './helpers/assertRevert';
const DSEternalStorage = artifacts.require('DSEternalStorage');
const DSToken = artifacts.require('DSToken');
const ESComplianceServiceRegulated = artifacts.require('ESComplianceServiceRegulated');
const ESWalletManager = artifacts.require('ESWalletManager');
const ESInvestorLockManager = artifacts.require('ESInvestorLockManager');
const ESTrustService = artifacts.require('ESTrustService');
const ESRegistryService = artifacts.require('ESRegistryService');
const ESTokenIssuer = artifacts.require('ESTokenIssuer');

const Proxy = artifacts.require('proxy');
const TRUST_SERVICE = 1;
const DS_TOKEN = 2;
const REGISTRY_SERVICE = 4;
const COMPLIANCE_SERVICE = 8;
const COMMS_SERVICE = 16;
const WALLET_MANAGER = 32;
const LOCK_MANAGER = 64;
const ISSUANCE_INFORMATION_MANAGER = 128;

const NONE = 0;

const MASTER = 1;
const ISSUER = 2;
const EXCHANGE = 4;

const US = 1;
const EU = 2;
const FORBIDDEN = 4;

const US_INVESTOR_ID = 'usInvestorId';
const US_INVESTOR_COLLISION_HASH = 'usInvestorCollisionHash';

const US_INVESTOR_ID_2 = 'usInvestorId2';
const US_INVESTOR_COLLISION_HASH_2 = 'usInvestorCollisionHash2';

const US_INVESTOR_ID_3 = 'usInvestorId3';
const US_INVESTOR_COLLISION_HASH_3 = 'usInvestorCollisionHash3';

const SPAIN_INVESTOR_ID = 'spainInvestorId';
const SPAIN_INVESTOR_COLLISION_HASH = 'spainInvestorCollisionHash';

const SPAIN_INVESTOR_ID_2 = 'spainInvestorId2';
const SPAIN_INVESTOR_COLLISION_HASH_2 = 'spainInvestorCollisionHash2';

const GERMANY_INVESTOR_ID = 'germanyInvestorId';
const GERMANY_INVESTOR_COLLISION_HASH = 'germanyInvestorCollisionHash';

const GERMANY_INVESTOR_ID_2 = 'germanyInvestorId2';
const GERMANY_INVESTOR_COLLISION_HASH_2 = 'germanyInvestorCollisionHash2';

const CHINA_INVESTOR_ID = 'chinaInvestorId';
const CHINA_INVESTOR_COLLISION_HASH = 'chinaInvestorCollisionHash';

const ISRAEL_INVESTOR_ID = 'israelInvestorId';
const ISRAEL_INVESTOR_COLLISION_HASH = 'israelInvestorCollisionHash';

const MINUTES = 60;
const HOURS = 60 * MINUTES;
const DAYS = 24 * HOURS;
const WEEKS = 7 * DAYS;
const YEARS = 365 * DAYS;

let latestTime = require('./utils/latestTime');
let increaseTimeTo = require('./helpers/increaseTime');

let storage;
let trustService;
let complianceService;
let walletManager;
let lockManager;
let tokenImpl;
let proxy;
let registryService;
let token;
let issuer;

contract('Integration', function ([_, issuerWallet, usInvestor, usInvestorSecondaryWallet, usInvestor2, spainInvestor, germanyInvestor, chinaInvestor, israelInvestor,usInvestor3Wallet,germanyInvestor2Wallet,spainInvestor2Wallet]) {
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  describe('creation', async function () {
    it('should be able to deploy the contracts', async function () {
      // Setting up the environment
      storage = await DSEternalStorage.new();
      trustService = await ESTrustService.new(storage.address, 'DSTokenTestTrustManager');
      complianceService = await ESComplianceServiceRegulated.new(storage.address, 'DSTokenTestComplianceManager');
      await complianceService.initialize(true, true, 0, 0);
      walletManager = await ESWalletManager.new(storage.address, 'DSTokenTestWalletManager');
      lockManager = await ESInvestorLockManager.new(storage.address, 'DSTokenTestLockManager');
      tokenImpl = await DSToken.new();
      proxy = await Proxy.new();
      registryService = await ESRegistryService.new(storage.address, 'DSTokenTestRegistryService');
      issuer = await ESTokenIssuer.new(storage.address,'DSTokenTestIssuer');
    });
    it('should connect the deployed contracts to each other', async function () {
      await proxy.setTarget(tokenImpl.address);
      token = DSToken.at(proxy.address);
      await token.initialize('DSTokenMock', 'DST', 18, storage.address, 'DSTokenMock');
      await storage.adminAddRole(trustService.address, 'write');
      await storage.adminAddRole(complianceService.address, 'write');
      await storage.adminAddRole(walletManager.address, 'write');
      await storage.adminAddRole(lockManager.address, 'write');
      await storage.adminAddRole(registryService.address, 'write');
      await storage.adminAddRole(token.address, 'write');
      await storage.adminAddRole(issuer.address, 'write');
      await trustService.initialize();
      await registryService.setDSService(TRUST_SERVICE, trustService.address);
      await complianceService.setDSService(TRUST_SERVICE, trustService.address);
      await complianceService.setDSService(WALLET_MANAGER, walletManager.address);
      await complianceService.setDSService(LOCK_MANAGER, lockManager.address);
      await complianceService.setDSService(REGISTRY_SERVICE, registryService.address);
      await token.setDSService(TRUST_SERVICE, trustService.address);
      await token.setDSService(COMPLIANCE_SERVICE, complianceService.address);
      await token.setDSService(WALLET_MANAGER, walletManager.address);
      await token.setDSService(LOCK_MANAGER, lockManager.address);
      await token.setDSService(REGISTRY_SERVICE, registryService.address);
      await complianceService.setDSService(DS_TOKEN, token.address);
      await walletManager.setDSService(TRUST_SERVICE, trustService.address);
      await lockManager.setDSService(TRUST_SERVICE, trustService.address);
      await lockManager.setDSService(REGISTRY_SERVICE, registryService.address);
      await lockManager.setDSService(COMPLIANCE_SERVICE, complianceService.address);
      await lockManager.setDSService(DS_TOKEN, token.address);
      await registryService.setDSService(WALLET_MANAGER, walletManager.address);
      await registryService.setDSService(DS_TOKEN, token.address);
      await walletManager.setDSService(REGISTRY_SERVICE, registryService.address);
      await issuer.setDSService(TRUST_SERVICE, trustService.address);
      // await trustService.setRole(ISSUER,issuer.address);
    });
    it('should get the basic details of the token correctly', async function () {
      const name = await token.name.call();
      const symbol = await token.symbol.call();
      const decimals = await token.decimals.call();
      const totalSupply = await token.totalSupply.call();

      assert.equal(name, 'DSTokenMock');
      assert.equal(symbol, 'DST');
      assert.equal(decimals, 18);
      assert.equal(totalSupply, 0);
    });
  });
  describe('issuance',function () {
    it('should setup country compliance',async function () {
      // Basic seed
      await complianceService.setCountryCompliance('USA', US);
      await complianceService.setCountryCompliance('Spain', EU);
      await complianceService.setCountryCompliance('Germany', EU);
      await complianceService.setCountryCompliance('China', FORBIDDEN);
    });
    it('should register investors via multiple calls',async function () {
      // Registering the investors and wallets
      await registryService.registerInvestor(US_INVESTOR_ID, US_INVESTOR_COLLISION_HASH);
      await registryService.setCountry(US_INVESTOR_ID, 'USA');
      await registryService.addWallet(usInvestor, US_INVESTOR_ID);
      await registryService.addWallet(usInvestorSecondaryWallet, US_INVESTOR_ID);

      await registryService.registerInvestor(US_INVESTOR_ID_2, US_INVESTOR_COLLISION_HASH_2);
      await registryService.setCountry(US_INVESTOR_ID_2, 'USA');
      await registryService.addWallet(usInvestor2, US_INVESTOR_ID_2);

      await registryService.registerInvestor(US_INVESTOR_ID_3, US_INVESTOR_COLLISION_HASH_3);
      await registryService.setCountry(US_INVESTOR_ID_3, 'USA');
      await registryService.addWallet(usInvestor3Wallet, US_INVESTOR_ID_3);

      let tx = await registryService.registerInvestor(SPAIN_INVESTOR_ID, SPAIN_INVESTOR_COLLISION_HASH);
      assert.equal(tx.logs[0].event, 'DSRegistryServiceInvestorAdded');
      assert.equal(tx.logs[0].args._investorId.valueOf(), SPAIN_INVESTOR_ID);
      tx = await registryService.setCountry(SPAIN_INVESTOR_ID, 'Spain');
      assert.equal(tx.logs[0].event, 'DSRegistryServiceInvestorChanged');
      assert.equal(tx.logs[0].args._investorId.valueOf(), SPAIN_INVESTOR_ID);
      tx = await registryService.addWallet(spainInvestor, SPAIN_INVESTOR_ID);
      assert.equal(tx.logs[0].event, 'DSRegistryServiceWalletAdded');
      assert.equal(tx.logs[0].args._wallet.valueOf(), spainInvestor);
      assert.equal(tx.logs[0].args._investorId.valueOf(), SPAIN_INVESTOR_ID);


      await registryService.registerInvestor(GERMANY_INVESTOR_ID, GERMANY_INVESTOR_COLLISION_HASH);
      await registryService.setCountry(GERMANY_INVESTOR_ID, 'Germany');
      await registryService.addWallet(germanyInvestor, GERMANY_INVESTOR_ID);

      // await registryService.registerInvestor(CHINA_INVESTOR_ID, CHINA_INVESTOR_COLLISION_HASH);
      // await registryService.setCountry(CHINA_INVESTOR_ID, 'China');
      // await registryService.addWallet(chinaInvestor, CHINA_INVESTOR_ID);
      //
      // await registryService.registerInvestor(ISRAEL_INVESTOR_ID, ISRAEL_INVESTOR_COLLISION_HASH);
      // await registryService.setCountry(ISRAEL_INVESTOR_ID, 'Israel');
      // await registryService.addWallet(israelInvestor, ISRAEL_INVESTOR_ID);

      await registryService.registerInvestor(GERMANY_INVESTOR_ID_2, GERMANY_INVESTOR_COLLISION_HASH_2);
      await registryService.setCountry(GERMANY_INVESTOR_ID_2, 'Germany');
      await registryService.addWallet(germanyInvestor2Wallet, GERMANY_INVESTOR_ID_2);
      await registryService.setAttribute(GERMANY_INVESTOR_ID, 4, 1, 0,'abcde');

      // getRegistryService().getAttributeValue(getRegistryService().getInvestor(_wallet), getRegistryService().QUALIFIED()) != getRegistryService().APPROVED()
    });
    it('should register investors via the token issuer',async function () {
      // await issuer.issueTokens(US_INVESTOR_ID_3,usInvestor3Wallet,1000,0,new Date().getTime(),'',0,US_INVESTOR_COLLISION_HASH_3,'USA');
    });
    it('should be able to issue and have a correct number of eu and us investors', async function () {
      let usInvestorsCount = await complianceService.getUSInvestorsCount.call();
      assert.equal(usInvestorsCount,0);
      let tx = await token.issueTokensCustom(usInvestor, 1000, latestTime(), 0, '', 0);
      assert.equal(tx.logs[0].event, 'Issue');
      assert.equal(tx.logs[0].args.to.valueOf(), usInvestor);
      assert.equal(tx.logs[0].args.value.valueOf(), 1000);
      assert.equal(tx.logs[0].args.valueLocked.valueOf(), 0);

      await token.issueTokensCustom(usInvestor2, 500, latestTime() - 80 * WEEKS, 250, 'TEST', latestTime() + 1 * WEEKS);
      await token.issueTokensCustom(usInvestor3Wallet, 2500, latestTime() - 80 * WEEKS, 0, '',0);
      usInvestorsCount = await complianceService.getUSInvestorsCount.call();
      assert.equal(usInvestorsCount,3);
      let euRetailInvestorsCount = await complianceService.getEURetailInvestorCount.call('Germany');
      assert.equal(euRetailInvestorsCount,0);
      await token.issueTokensCustom(germanyInvestor2Wallet, 500, latestTime(), 0, '', 0);
      euRetailInvestorsCount = await complianceService.getEURetailInvestorCount.call('Germany');
      assert.equal(euRetailInvestorsCount,1);
      tx = await token.issueTokensCustom(germanyInvestor, 1000, latestTime(), 250, 'TEST', latestTime() + 1 * WEEKS);
      assert.equal(tx.logs[0].event, 'Issue');
      assert.equal(tx.logs[0].args.to.valueOf(), germanyInvestor);
      assert.equal(tx.logs[0].args.value.valueOf(), 1000);
      assert.equal(tx.logs[0].args.valueLocked.valueOf(), 250);
      euRetailInvestorsCount = await complianceService.getEURetailInvestorCount.call('Germany');
      assert.equal(euRetailInvestorsCount,1);
    });
  });
  describe('transfers',function () {
    it('should allow some transfers and update the number of eu and us investors', async function () {
      const balanceBeforeTransfer = await token.balanceOf(usInvestor);
      assert.equal(balanceBeforeTransfer,1000);

      const t1 = await complianceService.getComplianceTransferableTokens(usInvestor,latestTime(),latestTime() + 52 * WEEKS);
      assert.equal(t1,0); // should be 0 because of yearly lock
      const t2 = await lockManager.getTransferableTokens(usInvestor2,latestTime());
      assert.equal(t2.valueOf(),250); // 250 tokens are locked manually

      // const t2 = await complianceService.getComplianceTransferableTokens(usInvestor2,latestTime(),latestTime() + 52 * WEEKS)
      // console.log(t2)
      // assert.equal(t2,500); //should be 500 because the accredited lock has passed, and 500 are locked manually

      let res = await complianceService.preTransferCheck(usInvestor,usInvestor2,250);
      assert.equal(res[0].valueOf(),32); // Hold up 1y
      res = await complianceService.preTransferCheck(usInvestor2,usInvestor,500);
      assert.equal(res[0].valueOf(),16); // Tokens manually locked
      res = await complianceService.preTransferCheck(usInvestor2,usInvestor,250);
      assert.equal(res[0].valueOf(),50); // Only full transfer
      res = await complianceService.preTransferCheck(usInvestor3Wallet,usInvestor2,2500);
      assert.equal(res[0].valueOf(),0); // Valid

      //Allow moving between investor's own wallets
      res = await token.balanceOfInvestor(US_INVESTOR_ID)
      assert.equal(res.valueOf(),1000); // 1000 tokens issued
      res = await complianceService.preTransferCheck(usInvestor,usInvestorSecondaryWallet,250);
      assert.equal(res[0].valueOf(),0); // Valid
      let tx = await token.transfer(usInvestorSecondaryWallet,250,{ from: usInvestor });
      res = await token.balanceOfInvestor(US_INVESTOR_ID)
      assert.equal(res.valueOf(),1000); // Should still be 1000


      tx = await token.transfer(usInvestor2,2500,{ from: usInvestor3Wallet });
      assert.equal(tx.logs[0].event, 'Transfer');
      assert.equal(tx.logs[0].args.from.valueOf(), usInvestor3Wallet);
      assert.equal(tx.logs[0].args.to.valueOf(), usInvestor2);
      assert.equal(tx.logs[0].args.value.valueOf(), 2500);
      let usInvestorsCount = await complianceService.getUSInvestorsCount.call();
      assert.equal(usInvestorsCount,2); // should now be 2, because 3 is not holding tokens any more

      res = await complianceService.preTransferCheck(germanyInvestor2Wallet,usInvestor,500);
      assert.equal(res[0].valueOf(),25); // No flowback

      res = await complianceService.preTransferCheck(germanyInvestor2Wallet,germanyInvestor,500);
      assert.equal(res[0].valueOf(),0); // Valid
      tx = await token.transfer(germanyInvestor,500,{ from: germanyInvestor2Wallet });
      let euRetailInvestorsCount = await complianceService.getEURetailInvestorCount.call('Germany');
      assert.equal(euRetailInvestorsCount.valueOf(),0); // We have only one investor, and he's qualified
    });
    it('Manual locks should behave correctly', async function () {
      // germany investor 1 should have 1000 + 500 - 250 transferable tokens

      let tt = await lockManager.getTransferableTokens(germanyInvestor,latestTime());
      assert.equal(tt.valueOf(),1250);

      let tx = await lockManager.addManualLockRecord(germanyInvestor,100,'TEST2',latestTime() + 8 * WEEKS);
      assert.equal(tx.logs[0].event, 'Locked');
      assert.equal(tx.logs[0].args.who.valueOf(), germanyInvestor);
      assert.equal(tx.logs[0].args.value.valueOf(), 100);

      tt = await lockManager.getTransferableTokens(germanyInvestor,latestTime());
      assert.equal(tt.valueOf(),1150);

      // Try to move locked tokens - should fail
      await assertRevert(token.transfer(germanyInvestor2Wallet,1500,{ from: germanyInvestor }));
      // Move forward in time
      web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        params: [2 * WEEKS],
        id: new Date().getTime(),
      });
      // Should still fail
      await assertRevert(token.transfer(germanyInvestor2Wallet,1500,{ from: germanyInvestor }));

      // Remove the manual lock
      tt = await lockManager.lockCount.call(germanyInvestor);
      assert.equal(tt.valueOf(),2);
      tt = await lockManager.lockInfo(germanyInvestor,1);
      assert.equal(tt[2].valueOf(),100);

      tx = await lockManager.removeLockRecord(germanyInvestor,1);
      assert.equal(tx.logs[0].event, 'Unlocked');
      assert.equal(tx.logs[0].args.who.valueOf(), germanyInvestor);
      assert.equal(tx.logs[0].args.value.valueOf(), 100);

      // //Now it should work
      tx = token.transfer(germanyInvestor2Wallet,1500,{ from: germanyInvestor });
    });

    it('should allow upgrading the compliance manager and the token', async function () {

    });
  });
});
