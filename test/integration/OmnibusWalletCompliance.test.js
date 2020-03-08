const assertRevert = require("../utils/assertRevert");
let latestTime = require("../utils/latestTime");
const deployContracts = require("../utils").deployContracts;
const fixtures = require("../fixtures");
const globals = require("../../utils/globals");
const complianceType = globals.complianceType;
const lockManagerType = globals.lockManagerType;
const role = globals.roles;
const investorId = fixtures.InvestorId;
const assetTrackingMode = fixtures.AssetTrackingMode;
const attributeType = fixtures.AttributeType;
const attributeStatus = fixtures.AttributeStatus;
const country = fixtures.Country;
const compliance = fixtures.Compliance;
const address = fixtures.Address;
const time = fixtures.Time;

contract("OmnibusWalletCompliance", function([
  owner,
  omnibusWallet1,
  omnibusWallet2,
  investorWallet1,
  investorWallet2
]) {
  beforeEach(async function() {
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

  describe("Omnibus to omnibus transfer", function() {
    it("Should not allow direct omnibus to omnibus transfer", async function() {
      await this.token.issueTokens(investorWallet1, 1000);
      await this.token.transfer(omnibusWallet1, 1000, {
        from: investorWallet1
      });
      const res = await this.complianceService.preInternalTransferCheck(
        omnibusWallet1,
        omnibusWallet2,
        1000,
        address.ZERO_ADDRESS
      );

      assert.equal(res[0].toNumber(), 81);
      assert.equal(res[1], "Omnibus to omnibus transfer");
    });
  });

  describe("Flow of tokens restrictions", function() {
    describe("Deposit", function() {
      it("It should not allow deposit when there are locked tokens", async function() {
        await this.token.issueTokens(investorWallet1, 1000);
        await this.lockManager.addManualLockRecord(
          investorWallet1,
          100,
          "Test",
          (await latestTime()) + 1000
        );
        const res = await this.complianceService.preInternalTransferCheck(
          investorWallet1,
          omnibusWallet1,
          1000,
          address.ZERO_ADDRESS
        );
        assert.equal(res[0].toNumber(), 16);
        assert.equal(res[1], "Tokens locked");
      });

      it("It should not allow deposit if us lock period has not expired", async function() {
        await this.complianceConfiguration.setUsLockPeriod(time.YEARS);
        await this.registryService.setCountry(
          investorId.GENERAL_INVESTOR_ID_1,
          country.USA
        );
        await this.token.issueTokens(investorWallet1, 1000);
        const res = await this.complianceService.preInternalTransferCheck(
          investorWallet1,
          omnibusWallet1,
          500,
          address.ZERO_ADDRESS
        );
        assert.equal(res[0].toNumber(), 32);
        assert.equal(res[1], "Hold-up 1y");
      });

      it("It should not allow deposit if non us lock period has not expired", async function() {
        await this.complianceConfiguration.setNonUsLockPeriod(time.YEARS);
        await this.token.issueTokens(investorWallet1, 1000);
        const res = await this.complianceService.preInternalTransferCheck(
          investorWallet1,
          omnibusWallet1,
          500,
          address.ZERO_ADDRESS
        );
        assert.equal(res[0].toNumber(), 33);
        assert.equal(res[1], "Hold-up");
      });

      it("It should not allow transfer if non us investor deposits tokens to a us omnibus in flowback period", async function() {
        await this.registryService.setCountry(
          investorId.OMNIBUS_WALLET_INVESTOR_ID_1,
          country.USA
        );
        await this.token.issueTokens(investorWallet1, 1000);
        const res = await this.complianceService.preInternalTransferCheck(
          investorWallet1,
          omnibusWallet1,
          500,
          address.ZERO_ADDRESS
        );
        assert.equal(res[0].toNumber(), 25);
        assert.equal(res[1], "Flowback");
      });
    });
  });

  describe("Tokens amounts restrictions", function() {
    it("It should fail the transfer", async function() {});
  });

  describe("Investor restrictions", function() {
    it("It should fail the transfer", async function() {});
  });
});
