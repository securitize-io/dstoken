const assertRevert = require("../utils/assertRevert");
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
    await this.registryService.setCountry(
      investorId.GENERAL_INVESTOR_ID_1,
      country.USA
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

    describe("Flow of tokens restrictions", function() {
      describe("Deposit", function() {
        it("It should not allow transfer is us lock period has not expired", async function() {});
      });
    });

    describe("Tokens amounts restrictions", function() {
      it("It should fail the transfer", async function() {});
    });

    describe("Investor restrictions", function() {
      it("It should fail the transfer", async function() {});
    });
  });
});
