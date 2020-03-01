const assertRevert = require("../utils/assertRevert");
const deployContracts = require("../utils").deployContracts;
const fixtures = require("../fixtures");
const complianceType = require("../../utils/globals").complianceType;
const lockManagerType = require("../../utils/globals").lockManagerType;
const investorId = fixtures.InvestorId;
const assetTrackingMode = fixtures.AssetTrackingMode;
const attributeType = fixtures.AttributeType;
const attributeStatus = fixtures.AttributeStatus;

contract("OmnibusWalletController", function([
  owner,
  omnibusWallet,
  investorWallet1
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

  describe("Transfer", async function() {
    it("Should update balances correctly in token when in 'holder of record' mode", async function() {});

    it("Should update balances correctly in token when in 'beneficiary' mode", async function() {});

    it("Should fail when there is not enough balance to transfer", async function() {});

    it("Should fail when the caller is not an operator", async function() {});
  });
});
