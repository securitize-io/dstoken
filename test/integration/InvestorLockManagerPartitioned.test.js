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

contract("InvestorLockManagerPartitioned", function([
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
      complianceType.PARTITIONED,
      lockManagerType.PARTITIONED,
      undefined,
      true
    );

    await this.trustService.setRole(issuerWallet, roles.ISSUER);
    await this.trustService.setRole(exchangeWallet, roles.EXCHANGE);
    await this.registryService.registerInvestor(
      investorId.GENERAL_INVESTOR_ID_1,
      investorId.GENERAL_INVESTOR_COLLISION_HASH_1
    );
    await this.registryService.addWallet(
      wallet,
      investorId.GENERAL_INVESTOR_ID_1
    );
    await this.registryService.addWallet(
      owner,
      investorId.GENERAL_INVESTOR_ID_1
    );

    // should be used when a partition needs to be supplied but no tokens issued
    this.ensuredPartition = (
      await this.partitionsManager.ensurePartition(1, 1)
    ).logs[0].args["_partition"];
    this.releaseTime = (await latestTime()) + 1000;
  });

  beforeEach(async function() {
    snapshot = await snapshotsHelper.takeSnapshot();
    snapshotId = snapshot["result"];
  });

  afterEach(async function() {
    await snapshotsHelper.revertToSnapshot(snapshotId);
  });

  describe("Add Manual Lock Record", function() {
    it("should revert when not specifying partition", async function() {
      await assertRevert(
        this.lockManager.methods[
          "addManualLockRecord(address,uint256,string,uint256)"
        ](owner, 100, REASON_STRING, (await latestTime()) + 1000)
      );
    });

    it("Should revert due to valueLocked = 0", async function() {
      await assertRevert(
        this.lockManager.methods[
          "addManualLockRecord(address,uint256,string,uint256,bytes32)"
        ](
          owner,
          0,
          REASON_STRING,
          (await latestTime()) + 1000,
          this.ensuredPartition
        )
      );
    });

    it("Should revert due to release time < now && > 0", async function() {
      await assertRevert(
        this.lockManager.methods[
          "addManualLockRecord(address,uint256,string,uint256,bytes32)"
        ](
          wallet,
          0,
          REASON_STRING,
          (await latestTime()) - 1000,
          this.ensuredPartition
        )
      );
    });

    it("Should revert when trying to addManualLockRecord with NONE permissions", async function() {
      await assertRevert(
        this.lockManager.methods[
          "addManualLockRecord(address,uint256,string,uint256,bytes32)"
        ](
          wallet,
          100,
          REASON_STRING,
          (await latestTime()) + 1000,
          this.ensuredPartition,
          {from: noneWallet}
        )
      );
    });

    it("Should revert when trying to Add ManualLock Record with roles.EXCHANGE permissions", async function() {
      await assertRevert(
        this.lockManager.methods[
          "addManualLockRecord(address,uint256,string,uint256,bytes32)"
        ](
          wallet,
          100,
          REASON_STRING,
          (await latestTime()) + 1000,
          this.ensuredPartition,
          {from: exchangeWallet}
        )
      );
    });

    it("Trying to Add ManualLock Record with roles.ISSUER permissions - should pass", async function() {
      await this.token.issueTokens(owner, 100);
      const partition = await this.token.partitionOf(owner, 0);
      assert.equal(await this.token.balanceOf(owner), 100);
      assert.equal(
        await this.lockManager.getTransferableTokens(owner, await latestTime()),
        100
      );
      await this.lockManager.methods[
        "addManualLockRecord(address,uint256,string,uint256,bytes32)"
      ](owner, 100, REASON_STRING, (await latestTime()) + 1000, partition, {
        from: issuerWallet
      });
      const lockCount = await this.lockManager.methods[
        "lockCount(address,bytes32)"
      ].call(owner, partition);
      assert.equal(lockCount, 1);
      assert.equal(
        await this.lockManager.getTransferableTokens(owner, await latestTime()),
        0
      );
    });
  });

  describe("RemoveLockRecord", function() {
    it("Should revert when not specifying partition", async function() {
      await assertRevert(this.lockManager.removeLockRecord(wallet, 2));
    });

    it("Should revert due to lockIndex > lastLockNumber", async function() {
      await this.lockManager.methods[
        "addManualLockRecord(address,uint256,string,uint256,bytes32)"
      ](
        wallet,
        100,
        REASON_STRING,
        (await latestTime()) + 1000,
        this.ensuredPartition,
        {from: issuerWallet}
      );
      assert.equal(
        await this.lockManager.methods["lockCount(address,bytes32)"].call(
          wallet,
          this.ensuredPartition
        ),
        1
      );
      await assertRevert(
        this.lockManager.removeLockRecord(wallet, 2, this.ensuredPartition)
      );
    });

    it("Should revert when trying to Remove ManualLock Record with NONE permissions", async function() {
      await this.lockManager.methods[
        "addManualLockRecord(address,uint256,string,uint256,bytes32)"
      ](
        wallet,
        100,
        REASON_STRING,
        (await latestTime()) + 1000,
        this.ensuredPartition,
        {from: issuerWallet}
      );
      assert.equal(
        await this.lockManager.methods["lockCount(address,bytes32)"].call(
          wallet,
          this.ensuredPartition
        ),
        1
      );
      await assertRevert(
        this.lockManager.methods["removeLockRecord(address,uint256,bytes32)"](
          wallet,
          LOCK_INDEX,
          this.ensuredPartition,
          {
            from: noneWallet
          }
        )
      );
    });

    it("Should revert when trying to Remove ManualLock Record with roles.EXCHANGE permissions", async function() {
      await this.lockManager.methods[
        "addManualLockRecord(address,uint256,string,uint256,bytes32)"
      ](
        wallet,
        100,
        REASON_STRING,
        (await latestTime()) + 1000,
        this.ensuredPartition,
        {from: issuerWallet}
      );
      assert.equal(
        await this.lockManager.methods["lockCount(address,bytes32)"].call(
          wallet,
          this.ensuredPartition
        ),
        1
      );
      await assertRevert(
        this.lockManager.methods["removeLockRecord(address,uint256,bytes32)"](
          wallet,
          LOCK_INDEX,
          this.ensuredPartition,
          {
            from: exchangeWallet
          }
        )
      );
    });

    it("Trying to Remove ManualLock Record with roles.ISSUER permissions - should pass", async function() {
      await this.token.issueTokens(owner, 100);
      const partition = await this.token.partitionOf(owner, 0);
      assert.equal(await this.token.balanceOf(owner), 100);
      assert.equal(
        await this.lockManager.getTransferableTokens(owner, await latestTime()),
        100
      );
      await this.lockManager.methods[
        "addManualLockRecord(address,uint256,string,uint256,bytes32)"
      ](owner, 100, REASON_STRING, (await latestTime()) + 1000, partition, {
        from: issuerWallet
      });
      assert.equal(
        await this.lockManager.methods["lockCount(address,bytes32)"].call(
          owner,
          partition
        ),
        1
      );

      assert.equal(
        await this.lockManager.getTransferableTokens(owner, await latestTime()),
        0
      );
      await this.lockManager.methods[
        "removeLockRecord(address,uint256,bytes32)"
      ](owner, LOCK_INDEX, partition, {
        from: issuerWallet
      });
      assert.equal(
        await this.lockManager.getTransferableTokens(owner, await latestTime()),
        100
      );
      assert.equal(
        await this.lockManager.methods["lockCount(address,bytes32)"].call(
          owner,
          partition
        ),
        0
      );
    });
  });

  describe("LockCount", function() {
    it("Should revert when no partition is specified", async function() {
      await assertRevert(
        this.lockManager.methods["lockCount(address)"].call(wallet)
      );
    });

    it("Should return 0 when no locks exist", async function() {
      assert.equal(
        await this.lockManager.methods["lockCount(address,bytes32)"].call(
          wallet,
          this.ensuredPartition
        ),
        0
      );
    });

    it("Should return the number of locks on a partition - 1", async function() {
      await this.lockManager.methods[
        "addManualLockRecord(address,uint256,string,uint256,bytes32)"
      ](
        wallet,
        100,
        REASON_STRING,
        (await latestTime()) + 1000,
        this.ensuredPartition,
        {from: issuerWallet}
      );
      assert.equal(
        await this.lockManager.methods["lockCount(address,bytes32)"].call(
          wallet,
          this.ensuredPartition
        ),
        1
      );
    });
  });

  describe("LockInfo", function() {
    it("Should revert when no partition is specified", async function() {
      await this.lockManager.methods[
        "addManualLockRecord(address,uint256,string,uint256,bytes32)"
      ](
        wallet,
        100,
        REASON_STRING,
        (await latestTime()) + 1000,
        this.ensuredPartition,
        {from: issuerWallet}
      );
      await assertRevert(this.lockManager.lockInfo(wallet, 0));
    });

    it("Should revert due to lockIndex > lastLockNumber", async function() {
      await this.lockManager.methods[
        "addManualLockRecord(address,uint256,string,uint256,bytes32)"
      ](
        wallet,
        100,
        REASON_STRING,
        (await latestTime()) + 1000,
        this.ensuredPartition,
        {from: issuerWallet}
      );
      assert.equal(
        await this.lockManager.methods["lockCount(address,bytes32)"].call(
          wallet,
          this.ensuredPartition
        ),
        1
      );
      await assertRevert(
        this.lockManager.methods["lockInfo(address,uint256,bytes32)"].call(
          wallet,
          1,
          this.ensuredPartition
        )
      );
    });

    it("Should pass", async function() {
      await this.lockManager.methods[
        "addManualLockRecord(address,uint256,string,uint256,bytes32)"
      ](wallet, 100, REASON_STRING, this.releaseTime, this.ensuredPartition, {
        from: issuerWallet
      });
      assert.equal(
        await this.lockManager.methods["lockCount(address,bytes32)"].call(
          wallet,
          this.ensuredPartition
        ),
        1
      );

      let info = await this.lockManager.methods[
        "lockInfo(address,uint256,bytes32)"
      ].call(wallet, LOCK_INDEX, this.ensuredPartition);
      assert.equal(info[0], REASON_CODE);
      assert.equal(info[1], REASON_STRING);
      assert.equal(info[2], 100);
      assert.equal(info[3], this.releaseTime);
    });
  });

  describe("GetTransferableTokens", function() {
    it("Should revert due to time = 0", async function() {
      await assertRevert(this.lockManager.getTransferableTokens(wallet, 0));
    });

    it("Should return 0 when all tokens are locked", async function() {
      await this.token.issueTokensCustom(
        owner,
        50,
        this.releaseTime - 1000,
        0,
        "",
        0
      );
      await this.token.issueTokensCustom(
        owner,
        50,
        this.releaseTime - 900,
        0,
        "",
        0
      );
      const partition = await this.token.partitionOf(owner, 0);
      const partition2 = await this.token.partitionOf(owner, 1);
      assert.equal(await this.token.balanceOf(owner), 100);
      await this.lockManager.methods[
        "addManualLockRecord(address,uint256,string,uint256,bytes32)"
      ](owner, 50, REASON_STRING, this.releaseTime, partition);
      await this.lockManager.methods[
        "addManualLockRecord(address,uint256,string,uint256,bytes32)"
      ](owner, 50, REASON_STRING, this.releaseTime, partition2);
      assert.equal(
        (
          await this.lockManager.getTransferableTokens(
            owner,
            this.releaseTime - 100
          )
        ).toNumber(),
        0
      );
    });

    it("Should return the number of tokens when all tokens are unlocked", async function() {
      await this.token.issueTokens(owner, 100);
      const partition = await this.token.partitionOf(owner, 0);
      assert.equal(await this.token.balanceOf(owner), 100);
      await this.lockManager.methods[
        "addManualLockRecord(address,uint256,string,uint256,bytes32)"
      ](owner, 100, REASON_STRING, this.releaseTime, partition);
      assert.equal(
        await this.lockManager.getTransferableTokens(
          owner,
          this.releaseTime + 1000
        ),
        100
      );
      assert.equal(
        await this.lockManager.methods[
          "getTransferableTokens(address,uint64,bytes32)"
        ].call(owner, this.releaseTime + 1000, partition),
        100
      );
    });

    it("Should return correct values when tokens will be locked with multiple locks", async function() {
      await this.token.issueTokens(owner, 300);
      const partition = await this.token.partitionOf(owner, 0);
      assert.equal(await this.token.balanceOf(owner), 300);
      await this.lockManager.methods[
        "addManualLockRecord(address,uint256,string,uint256,bytes32)"
      ](owner, 100, REASON_STRING, this.releaseTime + 100, partition);
      await this.lockManager.methods[
        "addManualLockRecord(address,uint256,string,uint256,bytes32)"
      ](owner, 100, REASON_STRING, this.releaseTime + 200, partition);
      assert.equal(
        await this.lockManager.getTransferableTokens(owner, await latestTime()),
        100
      );
      assert.equal(
        await this.lockManager.getTransferableTokens(
          owner,
          this.releaseTime + 101
        ),
        200
      );
      assert.equal(
        await this.lockManager.getTransferableTokens(
          owner,
          this.releaseTime + 201
        ),
        300
      );
    });
  });
});
