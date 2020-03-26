const assertRevert = require("../utils/assertRevert");
const latestTime = require("../utils/latestTime");
const snapshotsHelper = require("../utils/snapshots");
const deployContracts = require("../utils").deployContracts;
const complianceType = require("../../utils/globals").complianceType;
const lockManagerType = require("../../utils/globals").lockManagerType;
const roles = require("../../utils/globals").roles;
const investorId = require("../fixtures").InvestorId;

const LOCK_INDEX = 0;
const REASON_CODE = 0;
const REASON_STRING = "Test";

contract("InvestorLockManager", function([
  owner,
  wallet,
  issuerWallet,
  exchangeWallet,
  noneWallet
]) {
  before(async function() {
    await deployContracts(
      this,
      artifacts,
      complianceType.NOT_REGULATED,
      lockManagerType.INVESTOR
    );
    await this.trustService.setRole(issuerWallet, roles.ISSUER);
    await this.trustService.setRole(exchangeWallet, roles.EXCHANGE);
  });

  beforeEach(async function() {
    snapshot = await snapshotsHelper.takeSnapshot()
    snapshotId = snapshot['result'];
  });

  afterEach(async function() {
    await snapshotsHelper.revertToSnapshot(snapshotId);
  });

  describe("Add Manual Lock Record", function() {
    it("Should revert due to valueLocked = 0", async function() {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1
      );
      await assertRevert(
        this.lockManager.addManualLockRecord(
          wallet,
          0,
          REASON_STRING,
          (await latestTime()) + 1000
        )
      );
    });

    it("Should revert due to release time < now && > 0", async function() {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1
      );
      await assertRevert(
        this.lockManager.addManualLockRecord(
          wallet,
          0,
          REASON_STRING,
          (await latestTime()) - 1000
        )
      );
    });

    it("Trying to Add ManualLock Record with NONE permissions - should be error", async function() {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1
      );
      await assertRevert(
        this.lockManager.addManualLockRecord(
          wallet,
          100,
          REASON_STRING,
          (await latestTime()) + 1000,
          {from: noneWallet}
        )
      );
    });

    it("Trying to Add ManualLock Record with roles.EXCHANGE permissions - should be error", async function() {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1
      );
      await assertRevert(
        this.lockManager.addManualLockRecord(
          wallet,
          100,
          REASON_STRING,
          (await latestTime()) + 1000,
          {from: exchangeWallet}
        )
      );
    });

    it("Trying to Add ManualLock Record with roles.ISSUER permissions - should pass", async function() {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1
      );
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_1
      );
      await this.token.setCap(1000);
      await this.token.issueTokens(owner, 100);
      assert.equal(await this.token.balanceOf(owner), 100);
      assert.equal(
        await this.lockManager.getTransferableTokens(owner, await latestTime()),
        100
      );
      await this.lockManager.addManualLockRecord(
        owner,
        100,
        REASON_STRING,
        (await latestTime()) + 1000,
        {from: issuerWallet}
      );
      assert.equal(await this.lockManager.lockCount(owner), 1);
      assert.equal(
        await this.lockManager.getTransferableTokens(owner, await latestTime()),
        0
      );
    });
  });

  describe("Remove Lock Record:", function() {
    it("Should revert due to lockIndex > lastLockNumber", async function() {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1
      );
      await this.lockManager.addManualLockRecord(
        wallet,
        100,
        REASON_STRING,
        (await latestTime()) + 1000,
        {from: issuerWallet}
      );
      assert.equal(await this.lockManager.lockCount(wallet), 1);
      await assertRevert(this.lockManager.removeLockRecord(wallet, 2));
    });

    it("Trying to Remove ManualLock Record with NONE permissions - should be error", async function() {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1
      );
      await this.lockManager.addManualLockRecord(
        wallet,
        100,
        REASON_STRING,
        (await latestTime()) + 1000,
        {from: issuerWallet}
      );
      assert.equal(await this.lockManager.lockCount(wallet), 1);
      await assertRevert(
        this.lockManager.removeLockRecord(wallet, LOCK_INDEX, {
          from: noneWallet
        })
      );
    });

    it("Trying to Remove ManualLock Record with roles.EXCHANGE permissions - should be error", async function() {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1
      );
      await this.lockManager.addManualLockRecord(
        wallet,
        100,
        REASON_STRING,
        (await latestTime()) + 1000,
        {from: issuerWallet}
      );
      assert.equal(await this.lockManager.lockCount(wallet), 1);
      await assertRevert(
        this.lockManager.removeLockRecord(wallet, LOCK_INDEX, {
          from: exchangeWallet
        })
      );
    });

    it("Trying to Remove ManualLock Record with roles.ISSUER permissions - should pass", async function() {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1
      );
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_1
      );
      await this.token.setCap(1000);
      await this.token.issueTokens(owner, 100);
      assert.equal(await this.token.balanceOf(owner), 100);
      assert.equal(
        await this.lockManager.getTransferableTokens(owner, await latestTime()),
        100
      );
      await this.lockManager.addManualLockRecord(
        owner,
        100,
        REASON_STRING,
        (await latestTime()) + 1000,
        {from: issuerWallet}
      );
      assert.equal(await this.lockManager.lockCount(owner), 1);
      assert.equal(
        await this.lockManager.getTransferableTokens(owner, await latestTime()),
        0
      );
      await this.lockManager.removeLockRecord(owner, LOCK_INDEX, {
        from: issuerWallet
      });
      assert.equal(await this.lockManager.lockCount(owner), 0);
    });
  });

  describe("Lock Count:", function() {
    it("Should return 0", async function() {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1
      );
      assert.equal(await this.lockManager.lockCount(wallet), 0);
    });

    it("Should return 1", async function() {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1
      );
      await this.lockManager.addManualLockRecord(
        wallet,
        100,
        REASON_STRING,
        (await latestTime()) + 1000,
        {from: issuerWallet}
      );
      assert.equal(await this.lockManager.lockCount(wallet), 1);
    });
  });

  describe("Lock info:", function() {
    it("Should revert due to lockIndex > lastLockNumber", async function() {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1
      );
      await this.lockManager.addManualLockRecord(
        wallet,
        100,
        REASON_STRING,
        (await latestTime()) + 1000,
        {from: issuerWallet}
      );
      assert.equal(await this.lockManager.lockCount(wallet), 1);
      await assertRevert(this.lockManager.lockInfo(wallet, 1));
    });

    it("Should pass", async function() {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1
      );
      let realeseTime = (await latestTime()) + 1000;
      await this.lockManager.addManualLockRecord(
        wallet,
        100,
        REASON_STRING,
        realeseTime,
        {from: issuerWallet}
      );
      assert.equal(await this.lockManager.lockCount(wallet), 1);

      let info = await this.lockManager.lockInfo(wallet, LOCK_INDEX);
      assert.equal(info[0], REASON_CODE);
      assert.equal(info[1], REASON_STRING);
      assert.equal(info[2], 100);
      assert.equal(info[3], realeseTime);
    });
  });

  describe("Get Transferable Tokens:", function() {
    it("Should revert due to time = 0", async function() {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1
      );
      await assertRevert(this.lockManager.getTransferableTokens(wallet, 0));
    });

    it("Should return 0 because tokens will be locked", async function() {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1
      );
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_1
      );
      let realeseTime = (await latestTime()) + 1000;
      await this.token.setCap(1000);
      await this.token.issueTokens(owner, 100);
      assert.equal(await this.token.balanceOf(owner), 100);
      await this.lockManager.addManualLockRecord(
        owner,
        100,
        REASON_STRING,
        realeseTime
      );
      assert.equal(
        await this.lockManager.getTransferableTokens(owner, realeseTime - 100),
        0
      );
    });

    it("Should return 100 because tokens will be unlocked", async function() {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1
      );
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_1
      );
      let realeseTime = (await latestTime()) + 1000;
      await this.token.setCap(1000);
      await this.token.issueTokens(owner, 100);
      assert.equal(await this.token.balanceOf(owner), 100);
      await this.lockManager.addManualLockRecord(
        owner,
        100,
        REASON_STRING,
        realeseTime
      );
      assert.equal(
        await this.lockManager.getTransferableTokens(owner, realeseTime + 1000),
        100
      );
    });

    it("Should return correct values when tokens will be locked with multiple locks", async function() {
      await this.registryService.registerInvestor(
        investorId.GENERAL_INVESTOR_ID_1,
        investorId.GENERAL_INVESTOR_COLLISION_HASH_1
      );
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_1
      );
      let realeseTime = (await latestTime()) + 1000;
      await this.token.setCap(1000);
      await this.token.issueTokens(owner, 300);
      assert.equal(await this.token.balanceOf(owner), 300);
      await this.lockManager.addManualLockRecord(
        owner,
        100,
        REASON_STRING,
        realeseTime + 100
      );
      await this.lockManager.addManualLockRecord(
        owner,
        100,
        REASON_STRING,
        realeseTime + 200
      );
      assert.equal(
        await this.lockManager.getTransferableTokens(owner, await latestTime()),
        100
      );
      assert.equal(
        await this.lockManager.getTransferableTokens(owner, realeseTime + 101),
        200
      );
      assert.equal(
        await this.lockManager.getTransferableTokens(owner, realeseTime + 201),
        300
      );
    });
  });
});
