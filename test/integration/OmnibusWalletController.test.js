const assertRevert = require("../utils/assertRevert");
const deployContracts = require("../utils").deployContracts;
const fixtures = require("../fixtures");
const globals = require("../../utils/globals");
const complianceType = globals.complianceType;
const lockManagerType = globals.lockManagerType;
const role = globals.roles;
const attributeType = globals.attributeType;
const attributeStatus = globals.attributeStatus;
const investorId = fixtures.InvestorId;
const assetTrackingMode = fixtures.AssetTrackingMode;
const country = fixtures.Country;
const compliance = fixtures.Compliance;

const testEntity = "TestEntity";
const reason = "some reason";

async function assertCounters(testObject, expectedValues) {
  const totalInvestorsCount = await testObject.complianceService.getTotalInvestorsCount();
  const usInvestorsCount = await testObject.complianceService.getUSInvestorsCount();
  const accreditedInvestorsCount = await testObject.complianceService.getAccreditedInvestorsCount();
  const usAccreditedInvestorsCount = await testObject.complianceService.getUSAccreditedInvestorsCount();

  assert.equal(
    totalInvestorsCount.toNumber(),
    expectedValues.totalInvestorsCount
  );
  assert.equal(usInvestorsCount.toNumber(), expectedValues.usInvestorsCount);
  assert.equal(
    accreditedInvestorsCount.toNumber(),
    expectedValues.accreditedInvestorsCount
  );
  assert.equal(
    usAccreditedInvestorsCount.toNumber(),
    expectedValues.usAccreditedInvestorsCount
  );
}

async function assertBalances(
  testObject,
  investorWallet,
  omnibusWallet,
  expectedBalances
) {
  const investorBalance = await testObject.token.balanceOfInvestor(
    investorId.GENERAL_INVESTOR_ID_1
  );
  const investorWalletBalance = await testObject.token.balanceOf(
    investorWallet
  );
  const omnibusBalance = await testObject.token.balanceOfInvestor(
    investorId.OMNIBUS_WALLET_INVESTOR_ID_1
  );
  const omnibusWalletBalance = await testObject.token.balanceOf(omnibusWallet);
  const investorInternalBalance = await testObject.omnibusController1.balanceOf(
    investorWallet
  );

  assert.equal(investorBalance.toNumber(), expectedBalances.investorBalance);
  assert.equal(
    investorWalletBalance.toNumber(),
    expectedBalances.investorWalletBalance
  );
  assert.equal(omnibusBalance.toNumber(), expectedBalances.omnibusBalance);
  assert.equal(
    omnibusWalletBalance.toNumber(),
    expectedBalances.omnibusWalletBalance
  );
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
  const investor1InternalBalance = await testObject.omnibusController1.balanceOf(
    investorWallet1
  );
  const investor2InternalBalance = await testObject.omnibusController1.balanceOf(
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

  const event = events.find(event => event.event == expectedEvent);

  if (!event) {
    assert.fail(`Event ${expectedEvent} not found`);
  }

  for (const key of Object.keys(expectedParams)) {
    assert.equal(event.returnValues[key], expectedParams[key]);
  }
}

contract("OmnibusWalletController", function([
  owner,
  omnibusWallet,
  investorWallet1,
  investorWallet2,
  issuer
]) {
  beforeEach(async function() {
    await deployContracts(
      this,
      artifacts,
      complianceType.NORMAL,
      lockManagerType.INVESTOR,
      [omnibusWallet]
    );
    await this.registryService.registerInvestor(
      investorId.OMNIBUS_WALLET_INVESTOR_ID_1,
      investorId.OMNIBUS_WALLET_INVESTOR_ID_1
    );

    await this.registryService.addOmnibusWallet(
      investorId.OMNIBUS_WALLET_INVESTOR_ID_1,
      omnibusWallet,
      this.omnibusController1.address
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

    await this.trustService.setRole(issuer, role.ISSUER);
    await this.walletManager.addIssuerWallet(issuer);
  });

  describe("Asset tracking mode", function() {
    it("Should fail to set the mode if caller does not have permissions", async function() {
      await assertRevert(
        this.omnibusController1.setAssetTrackingMode(
          assetTrackingMode.HOLDER_OF_RECORD,
          {from: investorWallet1}
        )
      );
    });

    it("Should set the mode correctly when caller has master permissions", async function() {
      let trackingMode = await this.omnibusController1.getAssetTrackingMode();

      assert.equal(trackingMode.toNumber(), assetTrackingMode.BENEFICIARY);
      await this.omnibusController1.setAssetTrackingMode(
        assetTrackingMode.HOLDER_OF_RECORD
      );
      trackingMode = await this.omnibusController1.getAssetTrackingMode();
      assert.equal(trackingMode.toNumber(), assetTrackingMode.HOLDER_OF_RECORD);
    });

    it("Should set the mode correctly when caller has issuer permissions", async function() {
      await this.trustService.setRole(investorWallet1, role.ISSUER);
      await this.omnibusController1.setAssetTrackingMode(
        assetTrackingMode.HOLDER_OF_RECORD,
        {from: investorWallet1}
      );
    });

    describe("Resource permissions checks", function() {
      beforeEach(async function() {
        await this.trustService.addEntity(testEntity, investorWallet1);
        await this.trustService.addResource(testEntity, omnibusWallet);
      });

      it("Should set the mode correctly when caller is entity owner", async function() {
        await this.omnibusController1.setAssetTrackingMode(
          assetTrackingMode.HOLDER_OF_RECORD,
          {from: investorWallet1}
        );
      });

      it("Should set the mode correctly when caller is operator", async function() {
        await this.trustService.addOperator(testEntity, investorWallet2);
        await this.omnibusController1.setAssetTrackingMode(
          assetTrackingMode.HOLDER_OF_RECORD,
          {from: investorWallet2}
        );
      });
    });

    it("Should fail to set the mode if the omnibus wallet balance is greater than 0", async function() {
      await this.token.issueTokens(investorWallet1, 1000);
      await this.token.transfer(omnibusWallet, 500, {
        from: investorWallet1
      });

      await assertRevert(
        this.omnibusController1.setAssetTrackingMode(
          assetTrackingMode.HOLDER_OF_RECORD
        )
      );
    });

    it("Should fail to set the mode if the given value is invalid", async function() {
      await assertRevert(this.omnibusController1.setAssetTrackingMode(3));
    });

    describe("IsHolderOfRecord", function() {
      it("Should return 'true'", async function() {
        await this.omnibusController1.setAssetTrackingMode(
          assetTrackingMode.HOLDER_OF_RECORD
        );

        assert.equal(await this.omnibusController1.isHolderOfRecord(), true);
      });

      it("Should return 'false'", async function() {
        assert.equal(await this.omnibusController1.isHolderOfRecord(), false);
      });
    });
  });

  describe("Operations in 'holder of record' mode", function() {
    beforeEach(async function() {
      await this.omnibusController1.setAssetTrackingMode(
        assetTrackingMode.HOLDER_OF_RECORD
      );
    });

    describe("Deposit", function() {
      it("Should deposit all tokens correctly", async function() {
        await assertCounters(this, {
          totalInvestorsCount: 0,
          usInvestorsCount: 0,
          accreditedInvestorsCount: 0,
          usAccreditedInvestorsCount: 0
        });
        await this.token.issueTokens(investorWallet1, 1000);
        await assertBalances(this, investorWallet1, omnibusWallet, {
          investorBalance: 1000,
          investorWalletBalance: 1000,
          omnibusBalance: 0,
          omnibusWalletBalance: 0,
          investorInternalBalance: 0
        });
        await this.token.transfer(omnibusWallet, 1000, {
          from: investorWallet1
        });
        await assertBalances(this, investorWallet1, omnibusWallet, {
          investorBalance: 0,
          investorWalletBalance: 0,
          omnibusBalance: 1000,
          omnibusWalletBalance: 1000,
          investorInternalBalance: 1000
        });
        await assertCounters(this, {
          totalInvestorsCount: 1,
          usInvestorsCount: 1,
          accreditedInvestorsCount: 1,
          usAccreditedInvestorsCount: 1
        });
        await assertEvent(this.token, "OmnibusDeposit", {
          omnibusWallet,
          to: investorWallet1,
          value: 1000,
          assetTrackingMode: assetTrackingMode.HOLDER_OF_RECORD
        });
      });

      it("Should deposit some tokens correctly", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet, 500, {
          from: investorWallet1
        });
        await assertBalances(this, investorWallet1, omnibusWallet, {
          investorBalance: 500,
          investorWalletBalance: 500,
          omnibusBalance: 500,
          omnibusWalletBalance: 500,
          investorInternalBalance: 500
        });
        await assertCounters(this, {
          totalInvestorsCount: 2,
          usInvestorsCount: 2,
          accreditedInvestorsCount: 1,
          usAccreditedInvestorsCount: 1
        });
        await assertEvent(this.token, "OmnibusDeposit", {
          omnibusWallet,
          to: investorWallet1,
          value: 500,
          assetTrackingMode: assetTrackingMode.HOLDER_OF_RECORD
        });
      });

      it("Should revert if deposit function is not called from token", async function() {
        await assertRevert(
          this.omnibusController1.deposit(investorWallet1, 1000)
        );
      });
    });

    describe("Withdraw", function() {
      it("Should withdraw all tokens correctly", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet, 1000, {
          from: investorWallet1
        });
        await assertBalances(this, investorWallet1, omnibusWallet, {
          investorBalance: 0,
          investorWalletBalance: 0,
          omnibusBalance: 1000,
          omnibusWalletBalance: 1000,
          investorInternalBalance: 1000
        });
        await assertCounters(this, {
          totalInvestorsCount: 1,
          usInvestorsCount: 1,
          accreditedInvestorsCount: 1,
          usAccreditedInvestorsCount: 1
        });
        await this.token.transfer(investorWallet1, 1000, {
          from: omnibusWallet
        });
        await assertBalances(this, investorWallet1, omnibusWallet, {
          investorBalance: 1000,
          investorWalletBalance: 1000,
          omnibusBalance: 0,
          omnibusWalletBalance: 0,
          investorInternalBalance: 0
        });
        await assertCounters(this, {
          totalInvestorsCount: 1,
          usInvestorsCount: 1,
          accreditedInvestorsCount: 0,
          usAccreditedInvestorsCount: 0
        });
        await assertEvent(this.token, "OmnibusWithdraw", {
          omnibusWallet,
          from: investorWallet1,
          value: 1000,
          assetTrackingMode: assetTrackingMode.HOLDER_OF_RECORD
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
        await assertBalances(this, investorWallet1, omnibusWallet, {
          investorBalance: 800,
          investorWalletBalance: 800,
          omnibusBalance: 200,
          omnibusWalletBalance: 200,
          investorInternalBalance: 200
        });
        await assertCounters(this, {
          totalInvestorsCount: 2,
          usInvestorsCount: 2,
          accreditedInvestorsCount: 1,
          usAccreditedInvestorsCount: 1
        });
        await assertEvent(this.token, "OmnibusWithdraw", {
          omnibusWallet,
          from: investorWallet1,
          value: 300,
          assetTrackingMode: assetTrackingMode.HOLDER_OF_RECORD
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

      it("Should revert if withdraw function is not called from token", async function() {
        await assertRevert(
          this.omnibusController1.withdraw(investorWallet1, 1000)
        );
      });
    });

    describe("Internal transfer", function() {
      it("Should transfer tokens correctly", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet, 1000, {
          from: investorWallet1
        });
        await this.omnibusController1.transfer(
          investorWallet1,
          investorWallet2,
          500
        );
        await assertEvent(this.token, "OmnibusTransfer", {
          omnibusWallet,
          from: investorWallet1,
          to: investorWallet2,
          value: 500,
          assetTrackingMode: assetTrackingMode.HOLDER_OF_RECORD
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
          accreditedInvestorsCount: 1,
          usAccreditedInvestorsCount: 1
        });
        await this.omnibusController1.transfer(
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
          accreditedInvestorsCount: 1,
          usAccreditedInvestorsCount: 1
        });
      });
    });

    describe("Seize", function() {
      it("Should seize all tokens correctly", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet, 1000, {
          from: investorWallet1
        });
        await this.token.omnibusSeize(
          omnibusWallet,
          investorWallet1,
          issuer,
          1000,
          reason
        );
        await assertEvent(this.token, "OmnibusSeize", {
          omnibusWallet,
          from: investorWallet1,
          value: 1000,
          reason: reason,
          assetTrackingMode: assetTrackingMode.HOLDER_OF_RECORD
        });
        await assertBalances(this, investorWallet1, omnibusWallet, {
          investorBalance: 0,
          investorWalletBalance: 0,
          omnibusBalance: 0,
          omnibusWalletBalance: 0,
          investorInternalBalance: 0
        });
        await assertCounters(this, {
          totalInvestorsCount: 0,
          usInvestorsCount: 0,
          accreditedInvestorsCount: 0,
          usAccreditedInvestorsCount: 0
        });

        const issuerBalance = await this.token.balanceOf(issuer);
        assert.equal(issuerBalance.toNumber(), 1000);
      });

      it("Should seize some tokens correctly", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet, 500, {
          from: investorWallet1
        });
        await this.token.omnibusSeize(
          omnibusWallet,
          investorWallet1,
          issuer,
          300,
          reason
        );
        await assertEvent(this.token, "OmnibusSeize", {
          omnibusWallet,
          from: investorWallet1,
          value: 300,
          reason: reason,
          assetTrackingMode: assetTrackingMode.HOLDER_OF_RECORD
        });
        await assertBalances(this, investorWallet1, omnibusWallet, {
          investorBalance: 500,
          investorWalletBalance: 500,
          omnibusBalance: 200,
          omnibusWalletBalance: 200,
          investorInternalBalance: 200
        });
        await assertCounters(this, {
          totalInvestorsCount: 2,
          usInvestorsCount: 2,
          accreditedInvestorsCount: 1,
          usAccreditedInvestorsCount: 1
        });

        const issuerBalance = await this.token.balanceOf(issuer);
        assert.equal(issuerBalance.toNumber(), 300);
      });

      it("Should revert when there is not enough tokens to seize", async function() {
        await this.token.issueTokens(investorWallet1, 500);
        await this.token.transfer(omnibusWallet, 500, {
          from: investorWallet1
        });
        await this.token.issueTokens(investorWallet2, 500);
        await this.token.transfer(omnibusWallet, 500, {
          from: investorWallet2
        });
        await this.omnibusController1.transfer(
          investorWallet1,
          investorWallet2,
          300
        );
        await assertRevert(
          this.token.omnibusSeize(
            omnibusWallet,
            investorWallet1,
            issuer,
            201,
            reason
          )
        );
      });

      it("Should revert if seize function is not called from token", async function() {
        await assertRevert(this.omnibusController1.seize(investorWallet1, 100));
      });

      it("Should revert if trying to seize from a non omnibus wallet", async function() {
        await this.token.issueTokens(investorWallet1, 500);
        await this.token.transfer(omnibusWallet, 500, {
          from: investorWallet1
        });
        await assertRevert(
          this.token.omnibusSeize(
            investorWallet1,
            investorWallet1,
            issuer,
            500,
            reason
          )
        );
      });

      it("Should revert if trying to seize from a non omnibus investor", async function() {
        await this.token.issueTokens(investorWallet1, 500);
        await this.token.transfer(omnibusWallet, 500, {
          from: investorWallet1
        });
        await assertRevert(
          this.token.omnibusSeize(
            omnibusWallet,
            omnibusWallet,
            issuer,
            500,
            reason
          )
        );
      });

      it("Should revert if trying to seize to a non issuer", async function() {
        await this.token.issueTokens(investorWallet1, 500);
        await this.token.transfer(omnibusWallet, 500, {
          from: investorWallet1
        });
        await assertRevert(
          this.token.omnibusSeize(
            omnibusWallet,
            investorWallet1,
            investorWallet2,
            500,
            reason
          )
        );
      });

      it("Should revert if there are no permissions to seize", async function() {
        await this.token.issueTokens(investorWallet1, 500);
        await this.token.transfer(omnibusWallet, 500, {
          from: investorWallet1
        });
        await assertRevert(
          this.token.omnibusSeize(
            omnibusWallet,
            investorWallet1,
            issuer,
            500,
            reason,
            {from: investorWallet1}
          )
        );
      });
    });

    describe("Burn", function() {
      it("Should burn all tokens correctly", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet, 1000, {
          from: investorWallet1
        });
        await this.token.omnibusBurn(
          omnibusWallet,
          investorWallet1,
          1000,
          reason
        );
        await assertEvent(this.token, "OmnibusBurn", {
          omnibusWallet,
          who: investorWallet1,
          value: 1000,
          reason: reason,
          assetTrackingMode: assetTrackingMode.HOLDER_OF_RECORD
        });
        await assertBalances(this, investorWallet1, omnibusWallet, {
          investorBalance: 0,
          investorWalletBalance: 0,
          omnibusBalance: 0,
          omnibusWalletBalance: 0,
          investorInternalBalance: 0
        });
        await assertCounters(this, {
          totalInvestorsCount: 0,
          usInvestorsCount: 0,
          accreditedInvestorsCount: 0,
          usAccreditedInvestorsCount: 0
        });
      });

      it("Should burn some tokens correctly", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet, 500, {
          from: investorWallet1
        });
        await this.token.omnibusBurn(
          omnibusWallet,
          investorWallet1,
          300,
          reason
        );
        await assertEvent(this.token, "OmnibusBurn", {
          omnibusWallet,
          who: investorWallet1,
          value: 300,
          reason: reason,
          assetTrackingMode: assetTrackingMode.HOLDER_OF_RECORD
        });
        await assertBalances(this, investorWallet1, omnibusWallet, {
          investorBalance: 500,
          investorWalletBalance: 500,
          omnibusBalance: 200,
          omnibusWalletBalance: 200,
          investorInternalBalance: 200
        });
        await assertCounters(this, {
          totalInvestorsCount: 2,
          usInvestorsCount: 2,
          accreditedInvestorsCount: 1,
          usAccreditedInvestorsCount: 1
        });
      });

      it("Should revert when there is not enough tokens to burn", async function() {
        await this.token.issueTokens(investorWallet1, 500);
        await this.token.transfer(omnibusWallet, 500, {
          from: investorWallet1
        });
        await this.token.issueTokens(investorWallet2, 500);
        await this.token.transfer(omnibusWallet, 500, {
          from: investorWallet2
        });
        await this.omnibusController1.transfer(
          investorWallet1,
          investorWallet2,
          300
        );
        await assertRevert(
          this.token.omnibusBurn(omnibusWallet, investorWallet1, 201, reason)
        );
      });

      it("Should revert if burn function is not called from token", async function() {
        await assertRevert(this.omnibusController1.burn(investorWallet1, 100));
      });

      it("Should revert if trying to burn from a non omnibus wallet", async function() {
        await this.token.issueTokens(investorWallet1, 500);
        await this.token.transfer(omnibusWallet, 500, {
          from: investorWallet1
        });
        await assertRevert(
          this.token.omnibusBurn(investorWallet1, investorWallet1, 500, reason)
        );
      });

      it("Should revert if trying to burn from a non omnibus investor", async function() {
        await this.token.issueTokens(investorWallet1, 500);
        await this.token.transfer(omnibusWallet, 500, {
          from: investorWallet1
        });
        await assertRevert(
          this.token.omnibusBurn(omnibusWallet, omnibusWallet, 500, reason)
        );
      });

      it("Should revert if there are no permissions to burn", async function() {
        await this.token.issueTokens(investorWallet1, 500);
        await this.token.transfer(omnibusWallet, 500, {
          from: investorWallet1
        });
        await assertRevert(
          this.token.omnibusBurn(omnibusWallet, investorWallet1, 500, reason, {
            from: investorWallet1
          })
        );
      });
    });
  });

  describe("Operations in 'beneficiary' mode", function() {
    describe("Deposit", function() {
      it("Should deposit all tokens correctly", async function() {
        await assertCounters(this, {
          totalInvestorsCount: 0,
          usInvestorsCount: 0,
          accreditedInvestorsCount: 0,
          usAccreditedInvestorsCount: 0
        });
        await this.token.issueTokens(investorWallet1, 1000);
        await assertBalances(this, investorWallet1, omnibusWallet, {
          investorBalance: 1000,
          investorWalletBalance: 1000,
          omnibusBalance: 0,
          omnibusWalletBalance: 0,
          investorInternalBalance: 0
        });
        await this.token.transfer(omnibusWallet, 1000, {
          from: investorWallet1
        });
        await assertBalances(this, investorWallet1, omnibusWallet, {
          investorBalance: 1000,
          investorWalletBalance: 0,
          omnibusBalance: 0,
          omnibusWalletBalance: 1000,
          investorInternalBalance: 1000
        });
        await assertCounters(this, {
          totalInvestorsCount: 1,
          usInvestorsCount: 1,
          accreditedInvestorsCount: 0,
          usAccreditedInvestorsCount: 0
        });
        await assertEvent(this.token, "OmnibusDeposit", {
          omnibusWallet,
          to: investorWallet1,
          value: 1000,
          assetTrackingMode: assetTrackingMode.BENEFICIARY
        });
      });

      it("Should deposit some tokens correctly", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet, 500, {
          from: investorWallet1
        });
        await assertBalances(this, investorWallet1, omnibusWallet, {
          investorBalance: 1000,
          investorWalletBalance: 500,
          omnibusBalance: 0,
          omnibusWalletBalance: 500,
          investorInternalBalance: 500
        });

        await assertCounters(this, {
          totalInvestorsCount: 1,
          usInvestorsCount: 1,
          accreditedInvestorsCount: 0,
          usAccreditedInvestorsCount: 0
        });
        await assertEvent(this.token, "OmnibusDeposit", {
          omnibusWallet,
          to: investorWallet1,
          value: 500,
          assetTrackingMode: assetTrackingMode.BENEFICIARY
        });
      });
    });

    describe("Withdraw", function() {
      it("Should withdraw all tokens correctly", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet, 1000, {
          from: investorWallet1
        });
        await assertBalances(this, investorWallet1, omnibusWallet, {
          investorBalance: 1000,
          investorWalletBalance: 0,
          omnibusBalance: 0,
          omnibusWalletBalance: 1000,
          investorInternalBalance: 1000
        });
        await assertCounters(this, {
          totalInvestorsCount: 1,
          usInvestorsCount: 1,
          accreditedInvestorsCount: 0,
          usAccreditedInvestorsCount: 0
        });
        await this.token.transfer(investorWallet1, 1000, {
          from: omnibusWallet
        });
        await assertBalances(this, investorWallet1, omnibusWallet, {
          investorBalance: 1000,
          investorWalletBalance: 1000,
          omnibusBalance: 0,
          omnibusWalletBalance: 0,
          investorInternalBalance: 0
        });
        await assertCounters(this, {
          totalInvestorsCount: 1,
          usInvestorsCount: 1,
          accreditedInvestorsCount: 0,
          usAccreditedInvestorsCount: 0
        });
        await assertEvent(this.token, "OmnibusWithdraw", {
          omnibusWallet,
          from: investorWallet1,
          value: 1000,
          assetTrackingMode: assetTrackingMode.BENEFICIARY
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
        await assertBalances(this, investorWallet1, omnibusWallet, {
          investorBalance: 1000,
          investorWalletBalance: 800,
          omnibusBalance: 0,
          omnibusWalletBalance: 200,
          investorInternalBalance: 200
        });
        await assertCounters(this, {
          totalInvestorsCount: 1,
          usInvestorsCount: 1,
          accreditedInvestorsCount: 0,
          usAccreditedInvestorsCount: 0
        });
        await assertEvent(this.token, "OmnibusWithdraw", {
          omnibusWallet,
          from: investorWallet1,
          value: 300,
          assetTrackingMode: assetTrackingMode.BENEFICIARY
        });
      });
    });

    describe("Internal transfer", function() {
      it("Should transfer tokens correctly", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet, 1000, {
          from: investorWallet1
        });
        await assertCounters(this, {
          totalInvestorsCount: 1,
          usInvestorsCount: 1,
          accreditedInvestorsCount: 0,
          usAccreditedInvestorsCount: 0
        });
        await this.omnibusController1.transfer(
          investorWallet1,
          investorWallet2,
          500
        );
        await assertEvent(this.token, "OmnibusTransfer", {
          omnibusWallet,
          from: investorWallet1,
          to: investorWallet2,
          value: 500,
          assetTrackingMode: assetTrackingMode.BENEFICIARY
        });
        await assertInternalBalances(this, investorWallet1, investorWallet2, {
          investor1Balance: 500,
          investor2Balance: 500,
          omnibusBalance: 0,
          investor1InternalBalance: 500,
          investor2InternalBalance: 500
        });
        await assertCounters(this, {
          totalInvestorsCount: 2,
          usInvestorsCount: 2,
          accreditedInvestorsCount: 0,
          usAccreditedInvestorsCount: 0
        });
        await this.omnibusController1.transfer(
          investorWallet1,
          investorWallet2,
          500
        );
        await assertInternalBalances(this, investorWallet1, investorWallet2, {
          investor1Balance: 0,
          investor2Balance: 1000,
          omnibusBalance: 0,
          investor1InternalBalance: 0,
          investor2InternalBalance: 1000
        });
        await assertCounters(this, {
          totalInvestorsCount: 1,
          usInvestorsCount: 1,
          accreditedInvestorsCount: 0,
          usAccreditedInvestorsCount: 0
        });
      });
    });

    describe("Seize", function() {
      it("Should seize all tokens correctly", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet, 1000, {
          from: investorWallet1
        });
        await this.token.omnibusSeize(
          omnibusWallet,
          investorWallet1,
          issuer,
          1000,
          reason
        );
        await assertEvent(this.token, "OmnibusSeize", {
          omnibusWallet,
          from: investorWallet1,
          value: 1000,
          reason: reason,
          assetTrackingMode: assetTrackingMode.BENEFICIARY
        });
        await assertBalances(this, investorWallet1, omnibusWallet, {
          investorBalance: 0,
          investorWalletBalance: 0,
          omnibusBalance: 0,
          omnibusWalletBalance: 0,
          investorInternalBalance: 0
        });
        await assertCounters(this, {
          totalInvestorsCount: 0,
          usInvestorsCount: 0,
          accreditedInvestorsCount: 0,
          usAccreditedInvestorsCount: 0
        });

        const issuerBalance = await this.token.balanceOf(issuer);
        assert.equal(issuerBalance.toNumber(), 1000);
      });

      it("Should seize some tokens correctly", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet, 500, {
          from: investorWallet1
        });
        await this.token.omnibusSeize(
          omnibusWallet,
          investorWallet1,
          issuer,
          300,
          reason
        );
        await assertEvent(this.token, "OmnibusSeize", {
          omnibusWallet,
          from: investorWallet1,
          value: 300,
          reason: reason,
          assetTrackingMode: assetTrackingMode.BENEFICIARY
        });
        await assertBalances(this, investorWallet1, omnibusWallet, {
          investorBalance: 700,
          investorWalletBalance: 500,
          omnibusBalance: 0,
          omnibusWalletBalance: 200,
          investorInternalBalance: 200
        });
        await assertCounters(this, {
          totalInvestorsCount: 1,
          usInvestorsCount: 1,
          accreditedInvestorsCount: 0,
          usAccreditedInvestorsCount: 0
        });

        const issuerBalance = await this.token.balanceOf(issuer);
        assert.equal(issuerBalance.toNumber(), 300);
      });
    });

    describe("Burn", function() {
      it("Should burn all tokens correctly", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet, 1000, {
          from: investorWallet1
        });
        await this.token.omnibusBurn(
          omnibusWallet,
          investorWallet1,
          1000,
          reason
        );
        await assertEvent(this.token, "OmnibusBurn", {
          omnibusWallet,
          who: investorWallet1,
          value: 1000,
          reason: reason,
          assetTrackingMode: assetTrackingMode.BENEFICIARY
        });
        await assertBalances(this, investorWallet1, omnibusWallet, {
          investorBalance: 0,
          investorWalletBalance: 0,
          omnibusBalance: 0,
          omnibusWalletBalance: 0,
          investorInternalBalance: 0
        });
        await assertCounters(this, {
          totalInvestorsCount: 0,
          usInvestorsCount: 0,
          accreditedInvestorsCount: 0,
          usAccreditedInvestorsCount: 0
        });
      });

      it("Should burn some tokens correctly", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet, 500, {
          from: investorWallet1
        });
        await this.token.omnibusBurn(
          omnibusWallet,
          investorWallet1,
          300,
          reason
        );
        await assertEvent(this.token, "OmnibusBurn", {
          omnibusWallet,
          who: investorWallet1,
          value: 300,
          reason: reason,
          assetTrackingMode: assetTrackingMode.BENEFICIARY
        });
        await assertBalances(this, investorWallet1, omnibusWallet, {
          investorBalance: 700,
          investorWalletBalance: 500,
          omnibusBalance: 0,
          omnibusWalletBalance: 200,
          investorInternalBalance: 200
        });
        await assertCounters(this, {
          totalInvestorsCount: 1,
          usInvestorsCount: 1,
          accreditedInvestorsCount: 0,
          usAccreditedInvestorsCount: 0
        });
      });
    });
  });
});
