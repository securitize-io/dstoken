const deployContracts = require("../utils").deployContracts;
const snapshotsHelper = require("../utils/snapshots");
const complianceType = require("../../utils/globals").complianceType;
const lockManagerType = require("../../utils/globals").lockManagerType;
const country = require("../fixtures").Country;
const compliance = require("../fixtures").Compliance;

contract("ComplianceConfigurationService", function([owner]) {
  before(async function() {
    await deployContracts(
      this,
      artifacts,
      complianceType.NORMAL,
      lockManagerType.WALLET
    );
  });

  beforeEach(async function() {
    snapshot = await snapshotsHelper.takeSnapshot();
    snapshotId = snapshot["result"];
  });

  afterEach(async function() {
    await snapshotsHelper.revertToSnapshot(snapshotId);
  });

  describe("setAll", function() {
    it("Should set all rules and emit events correctly", async function() {
      const tx = await this.complianceConfiguration.setAll(
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        [true, true, true]
      );

      assert.equal(tx.logs[0].event, "DSComplianceUIntRuleSet");
      assert.equal(tx.logs[0].args.ruleName, "totalInvestorsLimit");
      assert.equal(tx.logs[0].args.prevValue.toNumber(), 0);
      assert.equal(tx.logs[0].args.newValue.toNumber(), 1);

      assert.equal(tx.logs[1].event, "DSComplianceUIntRuleSet");
      assert.equal(tx.logs[1].args.ruleName, "minUSTokens");
      assert.equal(tx.logs[1].args.prevValue.toNumber(), 0);
      assert.equal(tx.logs[1].args.newValue.toNumber(), 2);

      assert.equal(tx.logs[2].event, "DSComplianceUIntRuleSet");
      assert.equal(tx.logs[2].args.ruleName, "minEUTokens");
      assert.equal(tx.logs[2].args.prevValue.toNumber(), 0);
      assert.equal(tx.logs[2].args.newValue.toNumber(), 3);

      assert.equal(tx.logs[3].event, "DSComplianceUIntRuleSet");
      assert.equal(tx.logs[3].args.ruleName, "usInvestorsLimit");
      assert.equal(tx.logs[3].args.prevValue.toNumber(), 0);
      assert.equal(tx.logs[3].args.newValue.toNumber(), 4);

      assert.equal(tx.logs[4].event, "DSComplianceUIntRuleSet");
      assert.equal(tx.logs[4].args.ruleName, "usAccreditedInvestorsLimit");
      assert.equal(tx.logs[4].args.prevValue.toNumber(), 0);
      assert.equal(tx.logs[4].args.newValue.toNumber(), 5);

      assert.equal(tx.logs[5].event, "DSComplianceUIntRuleSet");
      assert.equal(tx.logs[5].args.ruleName, "nonAccreditedInvestorsLimit");
      assert.equal(tx.logs[5].args.prevValue.toNumber(), 0);
      assert.equal(tx.logs[5].args.newValue.toNumber(), 6);

      assert.equal(tx.logs[6].event, "DSComplianceUIntRuleSet");
      assert.equal(tx.logs[6].args.ruleName, "maxUSInvestorsPercentage");
      assert.equal(tx.logs[6].args.prevValue.toNumber(), 0);
      assert.equal(tx.logs[6].args.newValue.toNumber(), 7);

      assert.equal(tx.logs[7].event, "DSComplianceUIntRuleSet");
      assert.equal(tx.logs[7].args.ruleName, "blockFlowbackEndTime");
      assert.equal(tx.logs[7].args.prevValue.toNumber(), 0);
      assert.equal(tx.logs[7].args.newValue.toNumber(), 8);

      assert.equal(tx.logs[8].event, "DSComplianceUIntRuleSet");
      assert.equal(tx.logs[8].args.ruleName, "nonUSLockPeriod");
      assert.equal(tx.logs[8].args.prevValue.toNumber(), 0);
      assert.equal(tx.logs[8].args.newValue.toNumber(), 9);

      assert.equal(tx.logs[9].event, "DSComplianceUIntRuleSet");
      assert.equal(tx.logs[9].args.ruleName, "minimumTotalInvestors");
      assert.equal(tx.logs[9].args.prevValue.toNumber(), 0);
      assert.equal(tx.logs[9].args.newValue.toNumber(), 10);

      assert.equal(tx.logs[10].event, "DSComplianceUIntRuleSet");
      assert.equal(tx.logs[10].args.ruleName, "minimumHoldingsPerInvestor");
      assert.equal(tx.logs[10].args.prevValue.toNumber(), 0);
      assert.equal(tx.logs[10].args.newValue.toNumber(), 11);

      assert.equal(tx.logs[11].event, "DSComplianceUIntRuleSet");
      assert.equal(tx.logs[11].args.ruleName, "maximumHoldingsPerInvestor");
      assert.equal(tx.logs[11].args.prevValue.toNumber(), 0);
      assert.equal(tx.logs[11].args.newValue.toNumber(), 12);

      assert.equal(tx.logs[12].event, "DSComplianceUIntRuleSet");
      assert.equal(tx.logs[12].args.ruleName, "euRetailInvestorsLimit");
      assert.equal(tx.logs[12].args.prevValue.toNumber(), 0);
      assert.equal(tx.logs[12].args.newValue.toNumber(), 13);

      assert.equal(tx.logs[13].event, "DSComplianceUIntRuleSet");
      assert.equal(tx.logs[13].args.ruleName, "usLockPeriod");
      assert.equal(tx.logs[13].args.prevValue.toNumber(), 0);
      assert.equal(tx.logs[13].args.newValue.toNumber(), 14);

      assert.equal(tx.logs[14].event, "DSComplianceUIntRuleSet");
      assert.equal(tx.logs[14].args.ruleName, "jpInvestorsLimit");
      assert.equal(tx.logs[14].args.prevValue.toNumber(), 0);
      assert.equal(tx.logs[14].args.newValue.toNumber(), 15);

      assert.equal(tx.logs[15].event, "DSComplianceBoolRuleSet");
      assert.equal(tx.logs[15].args.ruleName, "forceFullTransfer");
      assert.equal(tx.logs[15].args.prevValue, false);
      assert.equal(tx.logs[15].args.newValue, true);

      assert.equal(tx.logs[16].event, "DSComplianceBoolRuleSet");
      assert.equal(tx.logs[16].args.ruleName, "forceAccredited");
      assert.equal(tx.logs[16].args.prevValue, false);
      assert.equal(tx.logs[16].args.newValue, true);

      assert.equal(tx.logs[17].event, "DSComplianceBoolRuleSet");
      assert.equal(tx.logs[17].args.ruleName, "forceAccreditedUS");
      assert.equal(tx.logs[17].args.prevValue, false);
      assert.equal(tx.logs[17].args.newValue, true);

      const result = await this.complianceConfiguration.getAll();

      assert.deepEqual(
        result[0].map(val => val.toNumber()),
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
      );

      assert.deepEqual(result[1], [true, true, true]);
    });

    it("Should set country compliance correctly", async function() {
      const tx = await this.complianceConfiguration.setCountryCompliance(
        country.USA,
        compliance.US
      );

      assert.equal(tx.logs[0].event, "DSComplianceStringToUIntMapRuleSet");
      assert.equal(tx.logs[0].args.ruleName, "countryCompliance");
      assert.equal(tx.logs[0].args.keyValue, country.USA);
      assert.equal(tx.logs[0].args.prevValue.toNumber(), compliance.NONE);
      assert.equal(tx.logs[0].args.newValue.toNumber(), compliance.US);
    });
  });
});
