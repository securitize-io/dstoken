const assertRevert = require("../utils/assertRevert");
const deployContracts = require("../utils").deployContracts;
const fixtures = require("../fixtures");
const complianceType = require("../../utils/globals").complianceType;
const lockManagerType = require("../../utils/globals").lockManagerType;
const investorId = fixtures.InvestorId;
const assetTrackingMode = fixtures.AssetTrackingMode;
const attributeType = fixtures.AttributeType;
const attributeStatus = fixtures.AttributeStatus;
const country = fixtures.Country;
const compliance = fixtures.Compliance;

async function assertCounters(testObject, expectedValues) {
  const totalInvestorsCount = await testObject.complianceService.getTotalInvestorsCount();
  const usInvestorsCount = await testObject.complianceService.getUSInvestorsCount();
  const accreditedInvestorsCount = await testObject.complianceService.getAccreditedInvestorsCount();

  assert.equal(
    totalInvestorsCount.toNumber(),
    expectedValues.totalInvestorsCount
  );
  assert.equal(usInvestorsCount.toNumber(), expectedValues.usInvestorsCount);
  assert.equal(
    accreditedInvestorsCount.toNumber(),
    expectedValues.accreditedInvestorsCount
  );
}

async function assertBalances(testObject, investorWallet, expectedBalances) {
  const investorBalance = await testObject.token.balanceOfInvestor(
    investorId.GENERAL_INVESTOR_ID_1
  );
  const omnibusBalance = await testObject.token.balanceOfInvestor(
    investorId.OMNIBUS_WALLET_INVESTOR_ID_1
  );
  const investorInternalBalance = await testObject.omnibusController.balances(
    investorWallet
  );

  assert.equal(investorBalance.toNumber(), expectedBalances.investorBalance);
  assert.equal(omnibusBalance.toNumber(), expectedBalances.omnibusBalance);
  assert.equal(
    investorInternalBalance.toNumber(),
    expectedBalances.investorInternalBalance
  );
}

async function assertInternalBalances(
  testObject,
  investorWallet1,
  investorWallet2,
  expectedBalances
) {
  const investor1Balance = await testObject.token.balanceOfInvestor(
    investorId.GENERAL_INVESTOR_ID_1
  );
  const investor2Balance = await testObject.token.balanceOfInvestor(
    investorId.GENERAL_INVESTOR_ID_2
  );
  const omnibusBalance = await testObject.token.balanceOfInvestor(
    investorId.OMNIBUS_WALLET_INVESTOR_ID_1
  );
  const investor1InternalBalance = await testObject.omnibusController.balances(
    investorWallet1
  );
  const investor2InternalBalance = await testObject.omnibusController.balances(
    investorWallet2
  );

  assert.equal(investor1Balance.toNumber(), expectedBalances.investor1Balance);
  assert.equal(investor2Balance.toNumber(), expectedBalances.investor2Balance);
  assert.equal(omnibusBalance.toNumber(), expectedBalances.omnibusBalance);
  assert.equal(
    investor1InternalBalance.toNumber(),
    expectedBalances.investor1InternalBalance
  );
  assert.equal(
    investor2InternalBalance.toNumber(),
    expectedBalances.investor2InternalBalance
  );
}

async function assertEvent(contract, expectedEvent, expectedParams) {
  const events = await contract.getPastEvents("allEvents");

  assert.equal(events[0].event, expectedEvent);

  for (const key of Object.keys(expectedParams)) {
    assert.equal(events[0].returnValues[key], expectedParams[key]);
  }
}

contract("OmnibusWalletController", function([
  owner,
  omnibusWallet,
  investorWallet1,
  investorWallet2
]) {
  beforeEach(async function() {
    await deployContracts(
      this,
      artifacts,
      complianceType.NORMAL,
      lockManagerType.INVESTOR,
      omnibusWallet
    );
    await this.registryService.registerInvestor(
      investorId.OMNIBUS_WALLET_INVESTOR_ID_1,
      investorId.OMNIBUS_WALLET_INVESTOR_ID_1
    );

    await this.registryService.addOmnibusWallet(
      investorId.OMNIBUS_WALLET_INVESTOR_ID_1,
      omnibusWallet,
      this.omnibusController.address
    );

    await this.registryService.setAttribute(
      investorId.OMNIBUS_WALLET_INVESTOR_ID_1,
      attributeType.ACCREDITED,
      attributeStatus.APPROVED,
      "",
      ""
    );

    await this.registryService.registerInvestor(
      investorId.GENERAL_INVESTOR_ID_1,
      investorId.GENERAL_INVESTOR_ID_1
    );

    await this.registryService.addWallet(
      investorWallet1,
      investorId.GENERAL_INVESTOR_ID_1
    );

    await this.registryService.registerInvestor(
      investorId.GENERAL_INVESTOR_ID_2,
      investorId.GENERAL_INVESTOR_ID_2
    );

    await this.registryService.addWallet(
      investorWallet2,
      investorId.GENERAL_INVESTOR_ID_2
    );

    await this.complianceConfiguration.setCountryCompliance(
      country.USA,
      compliance.US
    );

    await this.registryService.setCountry(
      investorId.OMNIBUS_WALLET_INVESTOR_ID_1,
      country.USA
    );

    await this.registryService.setCountry(
      investorId.GENERAL_INVESTOR_ID_1,
      country.USA
    );

    await this.registryService.setCountry(
      investorId.GENERAL_INVESTOR_ID_2,
      country.USA
    );
  });

  describe("Asset tracking mode", function() {
    it("Should fail to set the mode if caller does not have permissions", async function() {
      await assertRevert(
        this.omnibusController.setAssetTrackingMode(
          assetTrackingMode.HOLDER_OF_RECORD,
          {from: investorWallet1}
        )
      );
    });

    it("Should set the mode correctly", async function() {
      let trackingMode = await this.omnibusController.assetTrackingMode();

      assert.equal(trackingMode.toNumber(), assetTrackingMode.BENEFICIAL);

      await this.omnibusController.setAssetTrackingMode(
        assetTrackingMode.HOLDER_OF_RECORD
      );

      trackingMode = await this.omnibusController.assetTrackingMode();

      assert.equal(trackingMode.toNumber(), assetTrackingMode.HOLDER_OF_RECORD);
    });

    it("Should fail to set the mode if the omnibus wallet balance is greater then 0", async function() {
      await this.token.issueTokens(investorWallet1, 1000);
      await this.token.transfer(omnibusWallet, 500, {
        from: investorWallet1
      });

      await assertRevert(
        this.omnibusController.setAssetTrackingMode(
          assetTrackingMode.HOLDER_OF_RECORD
        )
      );
    });

    it("Should fail to set the mode if the given value is invalid", async function() {
      await assertRevert(this.omnibusController.setAssetTrackingMode(3));
    });

    it("Should return 'true' if the mode is 'holder of record'", async function() {
      await this.omnibusController.setAssetTrackingMode(
        assetTrackingMode.HOLDER_OF_RECORD
      );

      assert.equal(await this.omnibusController.isHolderOfRecord(), true);
    });

    it("Should return 'false' if the mode is not 'holder of record'", async function() {
      assert.equal(await this.omnibusController.isHolderOfRecord(), false);
    });
  });

  describe("Operations in 'holder of record mode", function() {
    beforeEach(async function() {
      await this.omnibusController.setAssetTrackingMode(
        assetTrackingMode.HOLDER_OF_RECORD
      );
    });

    describe("Deposit", function() {
      it("Should deposit all tokens correctly", async function() {
        await assertCounters(this, {
          totalInvestorsCount: 0,
          usInvestorsCount: 0,
          accreditedInvestorsCount: 0
        });

        await this.token.issueTokens(investorWallet1, 1000);
        await assertBalances(this, investorWallet1, {
          investorBalance: 1000,
          omnibusBalance: 0,
          investorInternalBalance: 0
        });

        await this.token.transfer(omnibusWallet, 1000, {
          from: investorWallet1
        });

        await assertBalances(this, investorWallet1, {
          investorBalance: 0,
          omnibusBalance: 1000,
          investorInternalBalance: 1000
        });

        await assertCounters(this, {
          totalInvestorsCount: 1,
          usInvestorsCount: 1,
          accreditedInvestorsCount: 1
        });

        await assertEvent(this.omnibusController, "OmnibusDeposit", {
          omnibusWallet,
          to: investorWallet1,
          value: 1000
        });
      });

      it("Should deposit some tokens correctly", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet, 500, {
          from: investorWallet1
        });

        await assertBalances(this, investorWallet1, {
          investorBalance: 500,
          omnibusBalance: 500,
          investorInternalBalance: 500
        });

        await assertCounters(this, {
          totalInvestorsCount: 2,
          usInvestorsCount: 2,
          accreditedInvestorsCount: 1
        });

        await assertEvent(this.omnibusController, "OmnibusDeposit", {
          omnibusWallet,
          to: investorWallet1,
          value: 500
        });
      });

      it("Should revert if deposit function is called not from token", async function() {
        await assertRevert(
          this.omnibusController.deposit(investorWallet1, 1000)
        );
      });
    });

    describe("Withdraw", function() {
      it("Should withdraw all tokens correctly", async function() {
        await this.token.issueTokens(investorWallet1, 1000);

        await this.token.transfer(omnibusWallet, 1000, {
          from: investorWallet1
        });

        await assertBalances(this, investorWallet1, {
          investorBalance: 0,
          omnibusBalance: 1000,
          investorInternalBalance: 1000
        });

        await assertCounters(this, {
          totalInvestorsCount: 1,
          usInvestorsCount: 1,
          accreditedInvestorsCount: 1
        });

        await this.token.transfer(investorWallet1, 1000, {
          from: omnibusWallet
        });

        await assertBalances(this, investorWallet1, {
          investorBalance: 1000,
          omnibusBalance: 0,
          investorInternalBalance: 0
        });

        await assertCounters(this, {
          totalInvestorsCount: 1,
          usInvestorsCount: 1,
          accreditedInvestorsCount: 0
        });

        await assertEvent(this.omnibusController, "OmnibusWithdraw", {
          omnibusWallet,
          from: investorWallet1,
          value: 1000
        });
      });

      it("Should withdraw some tokens correctly", async function() {
        await this.token.issueTokens(investorWallet1, 1000);

        await this.token.transfer(omnibusWallet, 500, {
          from: investorWallet1
        });

        await this.token.transfer(investorWallet1, 300, {
          from: omnibusWallet
        });

        await assertBalances(this, investorWallet1, {
          investorBalance: 800,
          omnibusBalance: 200,
          investorInternalBalance: 200
        });

        await assertCounters(this, {
          totalInvestorsCount: 2,
          usInvestorsCount: 2,
          accreditedInvestorsCount: 1
        });

        await assertEvent(this.omnibusController, "OmnibusWithdraw", {
          omnibusWallet,
          from: investorWallet1,
          value: 300
        });
      });

      it("Should revert if trying to withdraw too much tokens", async function() {
        await this.token.issueTokens(investorWallet1, 500);
        await this.token.issueTokens(investorWallet2, 500);

        await this.token.transfer(omnibusWallet, 100, {
          from: investorWallet1
        });
        await this.token.transfer(omnibusWallet, 100, {
          from: investorWallet2
        });

        await assertRevert(
          this.token.transfer(investorWallet1, 200, {
            from: omnibusWallet
          })
        );
      });

      it("Should revert if withdraw function is called not from token", async function() {
        await assertRevert(
          this.omnibusController.withdraw(investorWallet1, 1000)
        );
      });
    });

    describe("Internal transfer", function() {
      it.only("Should transfer tokens correctly", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet, 1000, {
          from: investorWallet1
        });
        await this.omnibusController.transfer(
          investorWallet1,
          investorWallet2,
          500
        );
        await assertEvent(this.omnibusController, "OmnibusTransfer", {
          omnibusWallet,
          from: investorWallet1,
          to: investorWallet2,
          value: 500
        });
        await assertInternalBalances(this, investorWallet1, investorWallet2, {
          investor1Balance: 0,
          investor2Balance: 0,
          omnibusBalance: 1000,
          investor1InternalBalance: 500,
          investor2InternalBalance: 500
        });
        await assertCounters(this, {
          totalInvestorsCount: 1,
          usInvestorsCount: 1,
          accreditedInvestorsCount: 1
        });
        await this.omnibusController.transfer(
          investorWallet1,
          investorWallet2,
          500
        );
        await assertInternalBalances(this, investorWallet1, investorWallet2, {
          investor1Balance: 0,
          investor2Balance: 0,
          omnibusBalance: 1000,
          investor1InternalBalance: 0,
          investor2InternalBalance: 1000
        });
        await assertCounters(this, {
          totalInvestorsCount: 1,
          usInvestorsCount: 1,
          accreditedInvestorsCount: 1
        });
      });
    });
  });

  describe("Operations in 'beneficiary' mode", function() {
    describe("Deposit", function() {
      it("Should deposit all tokens correctly", async function() {
        await assertCounters(this, {
          totalInvestorsCount: 0,
          usInvestorsCount: 0,
          accreditedInvestorsCount: 0
        });

        await this.token.issueTokens(investorWallet1, 1000);
        await assertBalances(this, investorWallet1, {
          investorBalance: 1000,
          omnibusBalance: 0,
          investorInternalBalance: 0
        });

        await this.token.transfer(omnibusWallet, 1000, {
          from: investorWallet1
        });

        await assertBalances(this, investorWallet1, {
          investorBalance: 1000,
          omnibusBalance: 0,
          investorInternalBalance: 1000
        });

        await assertCounters(this, {
          totalInvestorsCount: 1,
          usInvestorsCount: 1,
          accreditedInvestorsCount: 0
        });

        await assertEvent(this.omnibusController, "OmnibusDeposit", {
          omnibusWallet,
          to: investorWallet1,
          value: 1000
        });
      });

      it("Should deposit some tokens correctly", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet, 500, {
          from: investorWallet1
        });

        await assertBalances(this, investorWallet1, {
          investorBalance: 1000,
          omnibusBalance: 0,
          investorInternalBalance: 500
        });

        await assertCounters(this, {
          totalInvestorsCount: 1,
          usInvestorsCount: 1,
          accreditedInvestorsCount: 0
        });

        await assertEvent(this.omnibusController, "OmnibusDeposit", {
          omnibusWallet,
          to: investorWallet1,
          value: 500
        });
      });
    });

    describe("Withdraw", function() {
      it("Should withdraw all tokens correctly", async function() {
        await this.token.issueTokens(investorWallet1, 1000);

        await this.token.transfer(omnibusWallet, 1000, {
          from: investorWallet1
        });

        await assertBalances(this, investorWallet1, {
          investorBalance: 1000,
          omnibusBalance: 0,
          investorInternalBalance: 1000
        });

        await assertCounters(this, {
          totalInvestorsCount: 1,
          usInvestorsCount: 1,
          accreditedInvestorsCount: 0
        });

        await this.token.transfer(investorWallet1, 1000, {
          from: omnibusWallet
        });

        await assertBalances(this, investorWallet1, {
          investorBalance: 1000,
          omnibusBalance: 0,
          investorInternalBalance: 0
        });

        await assertCounters(this, {
          totalInvestorsCount: 1,
          usInvestorsCount: 1,
          accreditedInvestorsCount: 0
        });

        await assertEvent(this.omnibusController, "OmnibusWithdraw", {
          omnibusWallet,
          from: investorWallet1,
          value: 1000
        });
      });

      it("Should withdraw some tokens correctly", async function() {
        await this.token.issueTokens(investorWallet1, 1000);

        await this.token.transfer(omnibusWallet, 500, {
          from: investorWallet1
        });

        await this.token.transfer(investorWallet1, 300, {
          from: omnibusWallet
        });

        await assertBalances(this, investorWallet1, {
          investorBalance: 1000,
          omnibusBalance: 0,
          investorInternalBalance: 200
        });

        await assertCounters(this, {
          totalInvestorsCount: 1,
          usInvestorsCount: 1,
          accreditedInvestorsCount: 0
        });

        await assertEvent(this.omnibusController, "OmnibusWithdraw", {
          omnibusWallet,
          from: investorWallet1,
          value: 300
        });
      });
    });
  });
});
