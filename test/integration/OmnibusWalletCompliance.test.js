const latestTime = require("../utils/latestTime");
const deployContracts = require("../utils").deployContracts;
const snapshotsHelper = require("../utils/snapshots");
const fixtures = require("../fixtures");
const globals = require("../../utils/globals");
const complianceType = globals.complianceType;
const lockManagerType = globals.lockManagerType;
const attributeType = globals.attributeType;
const attributeStatus = globals.attributeStatus;
const investorId = fixtures.InvestorId;
const assetTrackingMode = fixtures.AssetTrackingMode;
const country = fixtures.Country;
const compliance = fixtures.Compliance;
const time = fixtures.Time;

contract("OmnibusWalletCompliance", function([
  owner,
  omnibusWallet1,
  omnibusWallet2,
  investorWallet1,
  investorWallet2
]) {
  before(async function() {
    await deployContracts(
      this,
      artifacts,
      complianceType.NORMAL,
      lockManagerType.INVESTOR,
      [omnibusWallet1, omnibusWallet2]
    );
    await this.complianceConfiguration.setCountryCompliance(
      country.USA,
      compliance.US
    );
    await this.complianceConfiguration.setCountryCompliance(
      country.FRANCE,
      compliance.EU
    );
    await this.complianceConfiguration.setCountryCompliance(
      country.JAPAN,
      compliance.JP
    );
    await this.registryService.registerInvestor(
      investorId.OMNIBUS_WALLET_INVESTOR_ID_1,
      investorId.OMNIBUS_WALLET_INVESTOR_ID_1
    );
    await this.registryService.addOmnibusWallet(
      investorId.OMNIBUS_WALLET_INVESTOR_ID_1,
      omnibusWallet1,
      this.omnibusController1.address
    );
    await this.registryService.setAttribute(
      investorId.OMNIBUS_WALLET_INVESTOR_ID_1,
      attributeType.ACCREDITED,
      attributeStatus.APPROVED,
      "",
      ""
    );
    await this.registryService.setAttribute(
      investorId.OMNIBUS_WALLET_INVESTOR_ID_1,
      attributeType.QUALIFIED,
      attributeStatus.APPROVED,
      "",
      ""
    );
    await this.omnibusController1.setAssetTrackingMode(
      assetTrackingMode.HOLDER_OF_RECORD
    );
    await this.registryService.registerInvestor(
      investorId.OMNIBUS_WALLET_INVESTOR_ID_2,
      investorId.OMNIBUS_WALLET_INVESTOR_ID_2
    );
    await this.registryService.addOmnibusWallet(
      investorId.OMNIBUS_WALLET_INVESTOR_ID_2,
      omnibusWallet2,
      this.omnibusController2.address
    );
    await this.registryService.setAttribute(
      investorId.OMNIBUS_WALLET_INVESTOR_ID_2,
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
  });

  beforeEach(async function() {
    snapshot = await snapshotsHelper.takeSnapshot();
    snapshotId = snapshot["result"];
  });

  afterEach(async function() {
    await snapshotsHelper.revertToSnapshot(snapshotId);
  });

  describe("Omnibus to omnibus transfer", function() {
    it("Should not allow direct omnibus to omnibus transfer", async function() {
      await this.token.issueTokens(investorWallet1, 1000);
      await this.token.transfer(omnibusWallet1, 1000, {
        from: investorWallet1
      });
      const res = await this.complianceService.preTransferCheck(
        omnibusWallet1,
        omnibusWallet2,
        1000
      );

      assert.equal(res[0].toNumber(), 81);
      assert.equal(res[1], "Omnibus to omnibus transfer");
    });
  });

  describe("Flow of tokens restrictions", function() {
    describe("Deposit", function() {
      it("Should not allow deposit when there are locked tokens", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.lockManager.addManualLockRecord(
          investorWallet1,
          100,
          "Test",
          (await latestTime()) + 1000
        );
        const res = await this.complianceService.preTransferCheck(
          investorWallet1,
          omnibusWallet1,
          1000
        );
        assert.equal(res[0].toNumber(), 16);
        assert.equal(res[1], "Tokens locked");
      });

      it("Should not allow deposit if us lock period has not expired", async function() {
        await this.complianceConfiguration.setUsLockPeriod(time.YEARS);
        await this.registryService.setCountry(
          investorId.GENERAL_INVESTOR_ID_1,
          country.USA
        );
        await this.token.issueTokens(investorWallet1, 1000);
        const res = await this.complianceService.preTransferCheck(
          investorWallet1,
          omnibusWallet1,
          500
        );
        assert.equal(res[0].toNumber(), 32);
        assert.equal(res[1], "Hold-up 1y");
      });

      it("Should not allow deposit if non us lock period has not expired", async function() {
        await this.complianceConfiguration.setNonUsLockPeriod(time.YEARS);
        await this.token.issueTokens(investorWallet1, 1000);
        const res = await this.complianceService.preTransferCheck(
          investorWallet1,
          omnibusWallet1,
          500
        );
        assert.equal(res[0].toNumber(), 33);
        assert.equal(res[1], "Hold-up");
      });

      it("Should not allow transfer if non us investor deposits tokens to a us omnibus in flowback period", async function() {
        await this.registryService.setCountry(
          investorId.OMNIBUS_WALLET_INVESTOR_ID_1,
          country.USA
        );
        await this.token.issueTokens(investorWallet1, 1000);
        const res = await this.complianceService.preTransferCheck(
          investorWallet1,
          omnibusWallet1,
          500
        );
        assert.equal(res[0].toNumber(), 25);
        assert.equal(res[1], "Flowback");
      });
    });
  });

  describe("Tokens amounts restrictions", function() {
    describe("Deposit", function() {
      it("Should fail the deposit if the us investor balance is below the minimal us tokens limit", async function() {
        await this.complianceConfiguration.setMinUsTokens(500);
        await this.registryService.setCountry(
          investorId.GENERAL_INVESTOR_ID_1,
          country.USA
        );
        await this.token.issueTokens(investorWallet1, 1000);
        const res = await this.complianceService.preTransferCheck(
          investorWallet1,
          omnibusWallet1,
          501
        );
        assert.equal(res[0].toNumber(), 51);
        assert.equal(res[1], "Amount of tokens under min");
      });

      it("Should fail the deposit if the us omnibus investor balance is below the minimal us tokens limit", async function() {
        await this.complianceConfiguration.setMinUsTokens(500);
        await this.complianceConfiguration.setBlockFlowbackEndTime(1);
        await this.registryService.setCountry(
          investorId.OMNIBUS_WALLET_INVESTOR_ID_1,
          country.USA
        );
        await this.token.issueTokens(investorWallet1, 1000);
        const res = await this.complianceService.preTransferCheck(
          investorWallet1,
          omnibusWallet1,
          499
        );
        assert.equal(res[0].toNumber(), 51);
        assert.equal(res[1], "Amount of tokens under min");
      });

      it("Should fail the deposit if the eu investor balance is below the minimal eu tokens limit", async function() {
        await this.complianceConfiguration.setMinEuTokens(500);
        await this.complianceConfiguration.setEURetailInvestorsLimit(1);
        await this.registryService.setCountry(
          investorId.GENERAL_INVESTOR_ID_1,
          country.FRANCE
        );
        await this.token.issueTokens(investorWallet1, 1000);
        const res = await this.complianceService.preTransferCheck(
          investorWallet1,
          omnibusWallet1,
          501
        );
        assert.equal(res[0].toNumber(), 51);
        assert.equal(res[1], "Amount of tokens under min");
      });

      it("Should fail the deposit if the eu omnibus investor balance is below the minimal eu tokens limit", async function() {
        await this.complianceConfiguration.setMinEuTokens(500);
        await this.registryService.setCountry(
          investorId.OMNIBUS_WALLET_INVESTOR_ID_1,
          country.FRANCE
        );
        await this.token.issueTokens(investorWallet1, 1000);
        const res = await this.complianceService.preTransferCheck(
          investorWallet1,
          omnibusWallet1,
          499
        );
        assert.equal(res[0].toNumber(), 51);
        assert.equal(res[1], "Amount of tokens under min");
      });

      it("Should fail the deposit if the investor balance is below the minimal holdings per investor limit", async function() {
        await this.complianceConfiguration.setMinimumHoldingsPerInvestor(500);
        await this.token.issueTokens(investorWallet1, 1000);
        const res = await this.complianceService.preTransferCheck(
          investorWallet1,
          omnibusWallet1,
          501
        );
        assert.equal(res[0].toNumber(), 51);
        assert.equal(res[1], "Amount of tokens under min");
      });

      it("Should fail the deposit if the omnibus investor balance is below the minimal holdings per investor limit", async function() {
        await this.complianceConfiguration.setMinimumHoldingsPerInvestor(500);
        await this.token.issueTokens(investorWallet1, 1000);
        const res = await this.complianceService.preTransferCheck(
          investorWallet1,
          omnibusWallet1,
          499
        );
        assert.equal(res[0].toNumber(), 51);
        assert.equal(res[1], "Amount of tokens under min");
      });

      it("Should fail the deposit if the omnibus investor balance is above the maximum holdings per investor limit", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.complianceConfiguration.setMaximumHoldingsPerInvestor(500);
        const res = await this.complianceService.preTransferCheck(
          investorWallet1,
          omnibusWallet1,
          501
        );
        assert.equal(res[0].toNumber(), 52);
        assert.equal(res[1], "Amount of tokens above max");
      });
    });

    describe("Withdraw", function() {
      it("Should fail the withdraw if the us investor balance is below the minimal us tokens limit", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet1, 1000, {
          from: investorWallet1
        });
        await this.complianceConfiguration.setMinUsTokens(500);
        await this.registryService.setCountry(
          investorId.GENERAL_INVESTOR_ID_1,
          country.USA
        );

        const res = await this.complianceService.preTransferCheck(
          omnibusWallet1,
          investorWallet1,
          499
        );
        assert.equal(res[0].toNumber(), 51);
        assert.equal(res[1], "Amount of tokens under min");
      });

      it("Should fail the withdraw if the us omnibus investor balance is below the minimal us tokens limit", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet1, 1000, {
          from: investorWallet1
        });
        await this.complianceConfiguration.setMinUsTokens(500);
        await this.complianceConfiguration.setBlockFlowbackEndTime(1);
        await this.registryService.setCountry(
          investorId.OMNIBUS_WALLET_INVESTOR_ID_1,
          country.USA
        );
        const res = await this.complianceService.preTransferCheck(
          omnibusWallet1,
          investorWallet1,
          501
        );
        assert.equal(res[0].toNumber(), 51);
        assert.equal(res[1], "Amount of tokens under min");
      });

      it("Should fail the withdraw if the eu investor balance is below the minimal eu tokens limit", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet1, 1000, {
          from: investorWallet1
        });
        await this.complianceConfiguration.setMinEuTokens(500);
        await this.complianceConfiguration.setEURetailInvestorsLimit(1);
        await this.registryService.setCountry(
          investorId.GENERAL_INVESTOR_ID_1,
          country.FRANCE
        );
        const res = await this.complianceService.preTransferCheck(
          omnibusWallet1,
          investorWallet1,
          499
        );
        assert.equal(res[0].toNumber(), 51);
        assert.equal(res[1], "Amount of tokens under min");
      });

      it("Should fail the withdraw if the eu omnibus investor balance is below the minimal eu tokens limit", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet1, 1000, {
          from: investorWallet1
        });
        await this.complianceConfiguration.setMinEuTokens(500);
        await this.registryService.setCountry(
          investorId.OMNIBUS_WALLET_INVESTOR_ID_1,
          country.FRANCE
        );
        const res = await this.complianceService.preTransferCheck(
          omnibusWallet1,
          investorWallet1,
          501
        );
        assert.equal(res[0].toNumber(), 51);
        assert.equal(res[1], "Amount of tokens under min");
      });

      it("Should fail the withdraw if the investor balance is below the minimal holdings per investor limit", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet1, 1000, {
          from: investorWallet1
        });
        await this.complianceConfiguration.setMinimumHoldingsPerInvestor(500);
        const res = await this.complianceService.preTransferCheck(
          omnibusWallet1,
          investorWallet1,
          499
        );
        assert.equal(res[0].toNumber(), 51);
        assert.equal(res[1], "Amount of tokens under min");
      });

      it("Should fail the withdraw if the omnibus investor balance is below the minimal holdings per investor limit", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet1, 1000, {
          from: investorWallet1
        });
        await this.complianceConfiguration.setMinimumHoldingsPerInvestor(500);
        const res = await this.complianceService.preTransferCheck(
          omnibusWallet1,
          investorWallet1,
          501
        );
        assert.equal(res[0].toNumber(), 51);
        assert.equal(res[1], "Amount of tokens under min");
      });

      it("Should fail the withdraw if the investor balance is above the maximum holdings per investor limit", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet1, 1000, {
          from: investorWallet1
        });
        await this.complianceConfiguration.setMaximumHoldingsPerInvestor(500);
        const res = await this.complianceService.preTransferCheck(
          omnibusWallet1,
          investorWallet1,
          1000
        );
        assert.equal(res[0].toNumber(), 52);
        assert.equal(res[1], "Amount of tokens above max");
      });
    });

    describe("Internal transfer", function() {
      beforeEach(async function() {
        await this.registryService.registerInvestor(
          investorId.GENERAL_INVESTOR_ID_2,
          investorId.GENERAL_INVESTOR_ID_2
        );
        await this.registryService.addWallet(
          investorWallet2,
          investorId.GENERAL_INVESTOR_ID_2
        );
      });

      it("Should fail the transfer if the sending us investor balance is below the minimal us tokens limit", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet2, 1000, {
          from: investorWallet1
        });
        await this.complianceConfiguration.setMinUsTokens(500);
        await this.registryService.setCountry(
          investorId.GENERAL_INVESTOR_ID_1,
          country.USA
        );

        const res = await this.complianceService.preInternalTransferCheck(
          investorWallet1,
          investorWallet2,
          501,
          omnibusWallet2
        );
        assert.equal(res[0].toNumber(), 51);
        assert.equal(res[1], "Amount of tokens under min");
      });

      it("Should fail the transfer if the receiving us investor balance is below the minimal us tokens limit", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet2, 1000, {
          from: investorWallet1
        });
        await this.complianceConfiguration.setMinUsTokens(500);
        await this.complianceConfiguration.setBlockFlowbackEndTime(1);
        await this.registryService.setCountry(
          investorId.GENERAL_INVESTOR_ID_2,
          country.USA
        );
        const res = await this.complianceService.preInternalTransferCheck(
          investorWallet1,
          investorWallet2,
          499,
          omnibusWallet2
        );
        assert.equal(res[0].toNumber(), 51);
        assert.equal(res[1], "Amount of tokens under min");
      });

      it("Should fail the transfer if the sending eu investor balance is below the minimal eu tokens limit", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet2, 1000, {
          from: investorWallet1
        });
        await this.complianceConfiguration.setMinEuTokens(500);
        await this.complianceConfiguration.setEURetailInvestorsLimit(1);
        await this.registryService.setCountry(
          investorId.GENERAL_INVESTOR_ID_1,
          country.FRANCE
        );
        const res = await this.complianceService.preInternalTransferCheck(
          investorWallet1,
          investorWallet2,
          501,
          omnibusWallet2
        );
        assert.equal(res[0].toNumber(), 51);
        assert.equal(res[1], "Amount of tokens under min");
      });

      it("Should fail the transfer if the receiving eu investor balance is below the minimal eu tokens limit", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet2, 1000, {
          from: investorWallet1
        });
        await this.complianceConfiguration.setMinEuTokens(500);
        await this.complianceConfiguration.setEURetailInvestorsLimit(1);
        await this.registryService.setCountry(
          investorId.GENERAL_INVESTOR_ID_2,
          country.FRANCE
        );
        const res = await this.complianceService.preInternalTransferCheck(
          investorWallet1,
          investorWallet2,
          499,
          omnibusWallet2
        );
        assert.equal(res[0].toNumber(), 51);
        assert.equal(res[1], "Amount of tokens under min");
      });

      it("Should fail the transfer if the sending investor balance is below the minimal holdings per investor limit", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet2, 1000, {
          from: investorWallet1
        });
        await this.complianceConfiguration.setMinimumHoldingsPerInvestor(500);
        const res = await this.complianceService.preInternalTransferCheck(
          investorWallet1,
          investorWallet2,
          501,
          omnibusWallet2
        );
        assert.equal(res[0].toNumber(), 51);
        assert.equal(res[1], "Amount of tokens under min");
      });

      it("Should fail the transfer if the receiving investor balance is below the minimal holdings per investor limit", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet2, 1000, {
          from: investorWallet1
        });
        await this.complianceConfiguration.setMinimumHoldingsPerInvestor(500);
        const res = await this.complianceService.preInternalTransferCheck(
          investorWallet1,
          investorWallet2,
          499,
          omnibusWallet2
        );
        assert.equal(res[0].toNumber(), 51);
        assert.equal(res[1], "Amount of tokens under min");
      });

      it("Should fail the transfer if the receiving investor balance is above the maximum holdings per investor limit", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet2, 1000, {
          from: investorWallet1
        });
        await this.complianceConfiguration.setMaximumHoldingsPerInvestor(500);
        const res = await this.complianceService.preInternalTransferCheck(
          investorWallet1,
          investorWallet2,
          501,
          omnibusWallet2
        );
        assert.equal(res[0].toNumber(), 52);
        assert.equal(res[1], "Amount of tokens above max");
      });
    });
  });

  describe("Investor restrictions", function() {
    describe("Deposit", function() {
      it("Should fail the deposit if us accredited limit has been reached", async function() {
        await this.registryService.setAttribute(
          investorId.GENERAL_INVESTOR_ID_1,
          attributeType.ACCREDITED,
          attributeStatus.APPROVED,
          "",
          ""
        );
        await this.registryService.setCountry(
          investorId.GENERAL_INVESTOR_ID_1,
          country.USA
        );
        await this.registryService.setCountry(
          investorId.OMNIBUS_WALLET_INVESTOR_ID_1,
          country.USA
        );
        await this.complianceConfiguration.setUsAccreditedInvestorsLimit(1);
        await this.token.issueTokens(investorWallet1, 1000);
        const res = await this.complianceService.preTransferCheck(
          investorWallet1,
          omnibusWallet1,
          500
        );
        assert.equal(res[0].toNumber(), 40);
        assert.equal(res[1], "Max investors in category");
      });

      it("Should fail the deposit if japan investors limit has been reached", async function() {
        await this.registryService.setCountry(
          investorId.GENERAL_INVESTOR_ID_1,
          country.JAPAN
        );
        await this.registryService.setCountry(
          investorId.OMNIBUS_WALLET_INVESTOR_ID_1,
          country.JAPAN
        );
        await this.complianceConfiguration.setJPInvestorsLimit(1);
        await this.token.issueTokens(investorWallet1, 1000);
        const res = await this.complianceService.preTransferCheck(
          investorWallet1,
          omnibusWallet1,
          500
        );
        assert.equal(res[0].toNumber(), 40);
        assert.equal(res[1], "Max investors in category");
      });

      it("Should fail the deposit if minimum total investors limit has not been reached", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet1, 500, {from: investorWallet1});
        await this.complianceConfiguration.setMinimumTotalInvestors(3);
        const res = await this.complianceService.preTransferCheck(
          investorWallet1,
          omnibusWallet1,
          500
        );
        assert.equal(res[0].toNumber(), 71);
        assert.equal(res[1], "Not enough investors");
      });

      it("Should fail the deposit if maximum total investors limit has been reached", async function() {
        await this.complianceConfiguration.setTotalInvestorsLimit(1);
        await this.token.issueTokens(investorWallet1, 1000);
        const res = await this.complianceService.preTransferCheck(
          investorWallet1,
          omnibusWallet1,
          500
        );
        assert.equal(res[0].toNumber(), 40);
        assert.equal(res[1], "Max investors in category");
      });

      it("Should fail the deposit if maximum us investors limit has been reached", async function() {
        await this.complianceConfiguration.setUSInvestorsLimit(1);
        await this.registryService.setCountry(
          investorId.GENERAL_INVESTOR_ID_1,
          country.USA
        );
        await this.registryService.setCountry(
          investorId.OMNIBUS_WALLET_INVESTOR_ID_1,
          country.USA
        );
        await this.token.issueTokens(investorWallet1, 1000);
        const res = await this.complianceService.preTransferCheck(
          investorWallet1,
          omnibusWallet1,
          500
        );
        assert.equal(res[0].toNumber(), 40);
        assert.equal(res[1], "Max investors in category");
      });
    });

    describe("Withdraw", function() {
      it("Should fail the withdraw if the investor is not accredited", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet1, 1000, {
          from: investorWallet1
        });
        await this.complianceConfiguration.setForceAccredited(true);
        const res = await this.complianceService.preTransferCheck(
          omnibusWallet1,
          investorWallet1,
          500
        );
        assert.equal(res[0].toNumber(), 61);
        assert.equal(res[1], "Only accredited");
      });

      it("Should fail the withdraw if the investor is not us accredited", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet1, 1000, {
          from: investorWallet1
        });
        await this.complianceConfiguration.setForceAccreditedUS(true);
        await this.registryService.setCountry(
          investorId.GENERAL_INVESTOR_ID_1,
          country.USA
        );
        const res = await this.complianceService.preTransferCheck(
          omnibusWallet1,
          investorWallet1,
          500
        );
        assert.equal(res[0].toNumber(), 62);
        assert.equal(res[1], "Only us accredited");
      });

      it("Should fail the withdraw if us accredited limit has been reached", async function() {
        await this.registryService.setAttribute(
          investorId.GENERAL_INVESTOR_ID_1,
          attributeType.ACCREDITED,
          attributeStatus.APPROVED,
          "",
          ""
        );
        await this.registryService.setCountry(
          investorId.GENERAL_INVESTOR_ID_1,
          country.USA
        );
        await this.registryService.setCountry(
          investorId.OMNIBUS_WALLET_INVESTOR_ID_1,
          country.USA
        );
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet1, 1000, {
          from: investorWallet1
        });
        await this.complianceConfiguration.setUsAccreditedInvestorsLimit(1);
        const res = await this.complianceService.preTransferCheck(
          omnibusWallet1,
          investorWallet1,
          500
        );
        assert.equal(res[0].toNumber(), 40);
        assert.equal(res[1], "Max investors in category");
      });

      it("Should fail the withdraw if minimum total investors limit has not been reached", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet1, 500, {from: investorWallet1});
        await this.complianceConfiguration.setMinimumTotalInvestors(3);
        const res = await this.complianceService.preTransferCheck(
          omnibusWallet1,
          investorWallet1,
          500
        );
        assert.equal(res[0].toNumber(), 71);
        assert.equal(res[1], "Not enough investors");
      });

      it("Should fail the withdraw if maximum total investors limit has been reached", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet1, 1000, {
          from: investorWallet1
        });
        await this.complianceConfiguration.setTotalInvestorsLimit(1);
        const res = await this.complianceService.preTransferCheck(
          omnibusWallet1,
          investorWallet1,
          500
        );
        assert.equal(res[0].toNumber(), 40);
        assert.equal(res[1], "Max investors in category");
      });

      it("Should fail the withdraw if maximum us investors limit has been reached", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet1, 1000, {
          from: investorWallet1
        });
        await this.complianceConfiguration.setUSInvestorsLimit(1);
        await this.registryService.setCountry(
          investorId.GENERAL_INVESTOR_ID_1,
          country.USA
        );
        await this.registryService.setCountry(
          investorId.OMNIBUS_WALLET_INVESTOR_ID_1,
          country.USA
        );
        const res = await this.complianceService.preTransferCheck(
          omnibusWallet1,
          investorWallet1,
          500
        );
        assert.equal(res[0].toNumber(), 40);
        assert.equal(res[1], "Max investors in category");
      });

      it("Should fail the withdraw if japan investors limit has been reached", async function() {
        await this.registryService.setCountry(
          investorId.GENERAL_INVESTOR_ID_1,
          country.JAPAN
        );
        await this.registryService.setCountry(
          investorId.OMNIBUS_WALLET_INVESTOR_ID_1,
          country.JAPAN
        );
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet1, 1000, {
          from: investorWallet1
        });
        await this.complianceConfiguration.setJPInvestorsLimit(1);
        const res = await this.complianceService.preTransferCheck(
          omnibusWallet1,
          investorWallet1,
          500
        );
        assert.equal(res[0].toNumber(), 40);
        assert.equal(res[1], "Max investors in category");
      });

      it("Should fail the withdraw if maximum eu retail investors limit has been reached", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet1, 1000, {
          from: investorWallet1
        });
        await this.complianceConfiguration.setEURetailInvestorsLimit(0);
        await this.registryService.setCountry(
          investorId.GENERAL_INVESTOR_ID_1,
          country.FRANCE
        );
        const res = await this.complianceService.preTransferCheck(
          omnibusWallet1,
          investorWallet1,
          500
        );
        assert.equal(res[0].toNumber(), 40);
        assert.equal(res[1], "Max investors in category");
      });

      it("Should fail the withdraw if maximum non accredited investors limit has been reached", async function() {
        await this.registryService.registerInvestor(
          investorId.GENERAL_INVESTOR_ID_2,
          investorId.GENERAL_INVESTOR_ID_2
        );
        await this.registryService.addWallet(
          investorWallet2,
          investorId.GENERAL_INVESTOR_ID_2
        );
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.issueTokens(investorWallet2, 1000);
        await this.token.transfer(omnibusWallet1, 1000, {
          from: investorWallet2
        });
        await this.complianceConfiguration.setNonAccreditedInvestorsLimit(1);
        const res = await this.complianceService.preTransferCheck(
          omnibusWallet1,
          investorWallet2,
          500
        );
        assert.equal(res[0].toNumber(), 40);
        assert.equal(res[1], "Max investors in category");
      });
    });

    describe("Internal transfer", function() {
      beforeEach(async function() {
        await this.registryService.registerInvestor(
          investorId.GENERAL_INVESTOR_ID_2,
          investorId.GENERAL_INVESTOR_ID_2
        );
        await this.registryService.addWallet(
          investorWallet2,
          investorId.GENERAL_INVESTOR_ID_2
        );
      });

      it("Should fail the transfer if the receiving investor is not accredited", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet2, 1000, {
          from: investorWallet1
        });
        await this.complianceConfiguration.setForceAccredited(true);
        const res = await this.complianceService.preInternalTransferCheck(
          investorWallet1,
          investorWallet2,
          500,
          omnibusWallet2
        );
        assert.equal(res[0].toNumber(), 61);
        assert.equal(res[1], "Only accredited");
      });

      it("Should fail the transfer if the receiving investor is not us accredited", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet2, 1000, {
          from: investorWallet1
        });
        await this.complianceConfiguration.setForceAccreditedUS(true);
        await this.registryService.setCountry(
          investorId.GENERAL_INVESTOR_ID_2,
          country.USA
        );
        const res = await this.complianceService.preInternalTransferCheck(
          investorWallet1,
          investorWallet2,
          500,
          omnibusWallet2
        );
        assert.equal(res[0].toNumber(), 62);
        assert.equal(res[1], "Only us accredited");
      });

      it("Should fail the transfer if us accredited limit has been reached", async function() {
        await this.registryService.setAttribute(
          investorId.GENERAL_INVESTOR_ID_1,
          attributeType.ACCREDITED,
          attributeStatus.APPROVED,
          "",
          ""
        );
        await this.registryService.setAttribute(
          investorId.GENERAL_INVESTOR_ID_2,
          attributeType.ACCREDITED,
          attributeStatus.APPROVED,
          "",
          ""
        );
        await this.registryService.setCountry(
          investorId.GENERAL_INVESTOR_ID_1,
          country.USA
        );
        await this.registryService.setCountry(
          investorId.GENERAL_INVESTOR_ID_2,
          country.USA
        );
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet2, 1000, {
          from: investorWallet1
        });
        await this.complianceConfiguration.setUsAccreditedInvestorsLimit(1);
        const res = await this.complianceService.preInternalTransferCheck(
          investorWallet1,
          investorWallet2,
          500,
          omnibusWallet2
        );
        assert.equal(res[0].toNumber(), 40);
        assert.equal(res[1], "Max investors in category");
      });

      it("Should fail the transfer if minimum total investors limit has not been reached", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.issueTokens(investorWallet2, 1000);
        await this.token.transfer(omnibusWallet2, 1000, {
          from: investorWallet1
        });
        await this.complianceConfiguration.setMinimumTotalInvestors(3);
        const res = await this.complianceService.preInternalTransferCheck(
          investorWallet1,
          investorWallet2,
          1000,
          omnibusWallet2
        );
        assert.equal(res[0].toNumber(), 71);
        assert.equal(res[1], "Not enough investors");
      });

      it("Should fail the transfer if maximum total investors limit has been reached", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet2, 1000, {
          from: investorWallet1
        });
        await this.complianceConfiguration.setTotalInvestorsLimit(1);
        const res = await this.complianceService.preInternalTransferCheck(
          investorWallet1,
          investorWallet2,
          500,
          omnibusWallet2
        );
        assert.equal(res[0].toNumber(), 40);
        assert.equal(res[1], "Max investors in category");
      });

      it("Should fail the transfer if maximum us investors limit has been reached", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet2, 1000, {
          from: investorWallet1
        });
        await this.complianceConfiguration.setUSInvestorsLimit(1);
        await this.registryService.setCountry(
          investorId.GENERAL_INVESTOR_ID_1,
          country.USA
        );
        await this.registryService.setCountry(
          investorId.GENERAL_INVESTOR_ID_2,
          country.USA
        );
        const res = await this.complianceService.preInternalTransferCheck(
          investorWallet1,
          investorWallet2,
          500,
          omnibusWallet2
        );
        assert.equal(res[0].toNumber(), 40);
        assert.equal(res[1], "Max investors in category");
      });

      it("Should fail the transfer if maximum us investors limit has been reached", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet2, 1000, {
          from: investorWallet1
        });
        await this.complianceConfiguration.setJPInvestorsLimit(1);
        await this.registryService.setCountry(
          investorId.GENERAL_INVESTOR_ID_1,
          country.JAPAN
        );
        await this.registryService.setCountry(
          investorId.GENERAL_INVESTOR_ID_2,
          country.JAPAN
        );
        const res = await this.complianceService.preInternalTransferCheck(
          investorWallet1,
          investorWallet2,
          500,
          omnibusWallet2
        );
        assert.equal(res[0].toNumber(), 40);
        assert.equal(res[1], "Max investors in category");
      });

      it("Should fail the transfer if maximum eu retail investors limit has been reached", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet2, 1000, {
          from: investorWallet1
        });
        await this.complianceConfiguration.setEURetailInvestorsLimit(0);
        await this.registryService.setCountry(
          investorId.GENERAL_INVESTOR_ID_2,
          country.FRANCE
        );
        const res = await this.complianceService.preInternalTransferCheck(
          investorWallet1,
          investorWallet2,
          500,
          omnibusWallet2
        );
        assert.equal(res[0].toNumber(), 40);
        assert.equal(res[1], "Max investors in category");
      });

      it("Should fail the transfer if maximum non accredited investors limit has been reached", async function() {
        await this.complianceConfiguration.setNonAccreditedInvestorsLimit(1);
        await this.token.issueTokens(investorWallet1, 1000);
        await this.token.transfer(omnibusWallet2, 1000, {
          from: investorWallet1
        });
        const res = await this.complianceService.preInternalTransferCheck(
          investorWallet1,
          investorWallet2,
          500,
          omnibusWallet2
        );
        assert.equal(res[0].toNumber(), 40);
        assert.equal(res[1], "Max investors in category");
      });
    });
  });
});
