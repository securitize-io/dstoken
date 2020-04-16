const assertRevert = require("../utils/assertRevert");
const latestTime = require("../utils/latestTime");
const snapshotsHelper = require("../utils/snapshots");
const deployContracts = require("../utils").deployContracts;
const complianceType = require("../../utils/globals").complianceType;
const lockManagerType = require("../../utils/globals").lockManagerType;
const investorId = require("../fixtures").InvestorId;
const roles = require("../../utils/globals").roles;

// const country = fixtures.Country;

const LOCK_INDEX = 0;
const REASON_CODE = 0;
const REASON_STRING = "Test";

contract("TokenIssuer", function([
  owner,
  wallet,
  issuerWallet,
  exchangeWallet,
  noneWallet
]) {
  describe("Partitioned Token Issuance", function() {
    before(async function() {
      await deployContracts(
        this,
        artifacts,
        complianceType.PARTITIONED,
        lockManagerType.PARTITIONED,
        undefined,
        true
      );
      await this.trustService.setRole(this.issuer.address, roles.ISSUER);
    });

    beforeEach(async function() {
      snapshot = await snapshotsHelper.takeSnapshot();
      snapshotId = snapshot["result"];
    });

    afterEach(async function() {
      await snapshotsHelper.revertToSnapshot(snapshotId);
    });

    it("Should issue tokens to a new investor without locks successfully", async function() {
      await this.issuer.issueTokens(
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
      );
      assert.equal(await this.token.balanceOf.call(owner), 100);
    });

    it("Should issue tokens to a new investor with locks successfully", async function() {
      await this.issuer.issueTokens(
        investorId.GENERAL_INVESTOR_ID_1,
        owner,
        [100, 1],
        "a",
        [50],
        [(await latestTime()) + 1000],
        investorId.GENERAL_INVESTOR_ID_1,
        "US",
        [0, 0, 0],
        [0, 0, 0]
      );
      assert.equal(await this.token.balanceOf.call(owner), 100);
      const transferable = await this.lockManager.getTransferableTokens(
        owner,
        await latestTime()
      );
      assert.equal(transferable.toNumber(), 50);
    });
  });

  describe("Normal Token Issuance", function() {
    before(async function() {
      await deployContracts(this, artifacts);
      await this.trustService.setRole(this.issuer.address, roles.ISSUER);
    });

    beforeEach(async function() {
      snapshot = await snapshotsHelper.takeSnapshot();
      snapshotId = snapshot["result"];
    });

    afterEach(async function() {
      await snapshotsHelper.revertToSnapshot(snapshotId);
    });

    it("Should issue tokens to a new investor without locks successfully", async function() {
      await this.issuer.issueTokens(
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
      );
      assert.equal(await this.token.balanceOf.call(owner), 100);
    });

    it("Should issue tokens to a new investor with locks successfully", async function() {
      await this.issuer.issueTokens(
        investorId.GENERAL_INVESTOR_ID_1,
        owner,
        [100, 1],
        "a",
        [50],
        [(await latestTime()) + 1000],
        investorId.GENERAL_INVESTOR_ID_1,
        "US",
        [0, 0, 0],
        [0, 0, 0]
      );
      assert.equal(await this.token.balanceOf.call(owner), 100);
      const transferable = await this.lockManager.getTransferableTokens(
        owner,
        await latestTime()
      );
      assert.equal(transferable.toNumber(), 50);
    });
  });
});
