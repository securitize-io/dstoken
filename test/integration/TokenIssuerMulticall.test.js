const { expectRevert } = require("@openzeppelin/test-helpers");
const latestTime = require("../utils/latestTime");
const snapshotsHelper = require("../utils/snapshots");
const deployContracts = require("../utils").deployContracts;
const complianceType = require("../../utils/globals").complianceType;
const lockManagerType = require("../../utils/globals").lockManagerType;
const investorId = require("../fixtures").InvestorId;
const roles = require("../../utils/globals").roles;

const LOCK_INDEX = 0;
const REASON_CODE = 0;
const REASON_STRING = "Test";

contract(
  "TokenIssuer though MultiCall Proxy Contract",
  function ([owner, wallet, issuerWallet, exchangeWallet, noneWallet]) {
    describe("Partitioned Token Issuance", function () {
      before(async function () {
        await deployContracts(
          this,
          artifacts,
          complianceType.PARTITIONED,
          lockManagerType.PARTITIONED,
          undefined,
          true
        );
        await this.trustService.setRole(this.issuer.address, roles.ISSUER);
        await this.trustService.setRole(
          this.issuerMulticall.address,
          roles.ISSUER
        );
      });

      beforeEach(async function () {
        snapshot = await snapshotsHelper.takeSnapshot();
        snapshotId = snapshot.result;
      });

      afterEach(async function () {
        await snapshotsHelper.revertToSnapshot(snapshotId);
      });

      it("Should issue tokens to a new investor without locks successfully trough the Issuer Multicall Contract", async function () {
        const functionData = this.issuer.contract.methods
          .issueTokens(
            investorId.GENERAL_INVESTOR_ID_1,
            owner,
            [100, 1],
            "a",
            [],
            [],
            investorId.GENERAL_INVESTOR_ID_1,
            "US",
            [0, 0, 0],
            [0, 0, 0]
          )
          .encodeABI();
        const targets = [this.issuer.address];

        await this.issuerMulticall.multicall(targets, [functionData]);
        assert.equal(await this.token.balanceOf.call(owner), 100);
        const partition = await this.token.partitionOf(owner, 0);
        const numOfLocks = await this.lockManager.lockCount(owner, partition);
        assert.equal(numOfLocks, 0);
      });

      it("Should issue tokens to a new investor without attributes through Multicall Proxy", async function () {
        const functionData = this.issuer.contract.methods
          .issueTokens(
            "NewInvestor",
            wallet,
            [100, 1],
            "IssueNewInvestor",
            [],
            [],
            "NewInvestorCollisionHash",
            "US",
            [],
            []
          )
          .encodeABI();
        const targets = [this.issuer.address];

        await this.issuerMulticall.multicall(targets, [functionData]);

        assert.equal(await this.token.balanceOf.call(wallet), 100);
        const partition = await this.token.partitionOf(wallet, 0);
        const numOfLocks = await this.lockManager.lockCount(wallet, partition);
        assert.equal(numOfLocks, 0);
      });

      it("Should revert when passing atributes with size != 3 through Multicall Proxy", async function () {
        const functionData = this.issuer.contract.methods
          .issueTokens(
            "NewInvestorAssert",
            noneWallet,
            [100, 1],
            "IssueNewInvestorAssert",
            [],
            [],
            "NewInvestorCollisionAssertHash",
            "US",
            [0, 0],
            [0, 0]
          )
          .encodeABI();
        const targets = [this.issuer.address];

        await expectRevert.unspecified(
          this.issuerMulticall.multicall(targets, [functionData])
        );
      });

      it("Should issue tokens to a new investor with locks successfully through Multicall proxy", async function () {
        const releaseTime = (await latestTime()) + 1000;
        const funcationData = this.issuer.contract.methods
          .issueTokens(
            investorId.GENERAL_INVESTOR_ID_1,
            owner,
            [100, 1],
            "a",
            [50],
            [releaseTime],
            investorId.GENERAL_INVESTOR_ID_1,
            "US",
            [0, 0, 0],
            [0, 0, 0]
          )
          .encodeABI();
        const targets = [this.issuer.address];
        await this.issuerMulticall.multicall(targets, [funcationData]);
        assert.equal(await this.token.balanceOf.call(owner), 100);
        const transferable = await this.lockManager.getTransferableTokens(
          owner,
          await latestTime()
        );
        assert.equal(transferable.toNumber(), 50);
        const partition = await this.token.partitionOf(owner, 0);
        const numOfLocks = await this.lockManager.lockCount(owner, partition);
        const lockInfo = await this.lockManager.methods[
          "lockInfo(address,uint256,bytes32)"
        ].call(owner, 0, partition);
        assert.equal(lockInfo[2].toNumber(), 50);
        assert.equal(lockInfo[3].toNumber(), releaseTime);
        assert.equal(numOfLocks, 1);
      });
    });

    describe("Normal Token Issuance", function () {
      before(async function () {
        await deployContracts(this, artifacts);
        await this.trustService.setRole(this.issuer.address, roles.ISSUER);
        await this.trustService.setRole(
          this.issuerMulticall.address,
          roles.ISSUER
        );
      });

      beforeEach(async function () {
        snapshot = await snapshotsHelper.takeSnapshot();
        snapshotId = snapshot.result;
      });

      afterEach(async function () {
        await snapshotsHelper.revertToSnapshot(snapshotId);
      });

      it("Should issue tokens to a new investor without locks successfully", async function () {
        const functionData = this.issuer.contract.methods.issueTokens(
          investorId.GENERAL_INVESTOR_ID_1,
          owner,
          [100, 1],
          "a",
          [],
          [],
          investorId.GENERAL_INVESTOR_ID_1,
          "US",
          [0, 0, 0],
          [0, 0, 0]
        ).encodeABI();
        const targets = [this.issuer.address];
        await this.issuerMulticall.multicall(targets, [functionData]);
        assert.equal(await this.token.balanceOf.call(owner), 100);
        const numOfLocks = await this.lockManager.lockCount(owner);
        assert.equal(numOfLocks, 0);
      });

      it("Should issue tokens to a new investor without attributes", async function () {
          const functionData = this.issuer.contract.methods.issueTokens(
          "NewInvestorNormalToken",
          wallet,
          [100, 1],
          "a",
          [],
          [],
          "NewInvestorNormalTokenHash",
          "US",
          [],
          []
        ).encodeABI();
        const targets = [this.issuer.address];
        await this.issuerMulticall.multicall(targets, [functionData]);
        assert.equal(await this.token.balanceOf.call(wallet), 100);
        const numOfLocks = await this.lockManager.lockCount(wallet);
        assert.equal(numOfLocks, 0);
      });

      it("Should revert when trying to issueToken with attributes size != 3", async function () {
        const funcationData = this.issuer.contract.methods.issueTokens(
          "NewInvestorNormalTokenForFAIL",
          noneWallet,
          [100, 1],
          "a",
          [],
          [],
          "NewInvestorNormalTokenHashForFail",
          "US",
          [0, 0, 0, 0],
          [0, 0, 0, 0]
        ).encodeABI();
        const targets = [this.issuer.address];
        await expectRevert.unspecified(
          this.issuerMulticall.multicall(targets, [funcationData])  
        );
      });

      it("Should issue tokens to a new investor with locks successfully", async function () {
        const releaseTime = (await latestTime()) + 1000;
        const functionData = this.issuer.contract.methods.issueTokens(
          investorId.GENERAL_INVESTOR_ID_1,
          owner,
          [100, 1],
          "a",
          [50],
          [releaseTime],
          investorId.GENERAL_INVESTOR_ID_1,
          "US",
          [0, 0, 0],
          [0, 0, 0]
        ).encodeABI();
        const targets = [this.issuer.address];
        await this.issuerMulticall.multicall(targets, [functionData]);
        assert.equal(await this.token.balanceOf.call(owner), 100);
        const transferable = await this.lockManager.getTransferableTokens(
          owner,
          await latestTime()
        );
        assert.equal(transferable.toNumber(), 50);
        const numOfLocks = await this.lockManager.lockCount(owner);
        assert.equal(numOfLocks, 1);
        const lockInfo = await this.lockManager.methods[
          "lockInfo(address,uint256)"
        ].call(owner, 0);
        assert.equal(lockInfo[2].toNumber(), 50);
        assert.equal(lockInfo[3].toNumber(), releaseTime);
      });
    });
  }
);
