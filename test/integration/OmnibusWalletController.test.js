const assertRevert = require("../utils/assertRevert");
const deployContracts = require("../utils").deployContracts;
const fixtures = require("../fixtures");
const investorId = fixtures.InvestorId;

contract("OmnibusWalletController", function([
  omnibusOwner,
  omnibusWallet,
  operator
]) {
  beforeEach(async function() {
    await deployContracts(this, artifacts);
    await this.registryService.registerInvestor(
      investorId.OMNIBUS_WALLET_INVESTOR_ID_1,
      investorId.OMNIBUS_WALLET_INVESTOR_ID_1
    );

    await this.registryService.addOmnibusWallet(
      investorId.OMNIBUS_WALLET_INVESTOR_ID_1,
      omnibusWallet,
      this.omnibusController.address
    );

    await this.trustService.addEntity("Test", omnibusOwner);
    await this.trustService.addResource("Test", omnibusWallet);
    await this.trustService.addoperator("Test", operator);

    //   await this.trustService.setRole(issuerWallet, roles.ISSUER);
    //   await this.complianceConfiguration.setCountryCompliance(
    //     country.USA,
    //     compliance.US
    //   );
    //   await this.complianceConfiguration.setCountryCompliance(
    //     country.FRANCE,
    //     compliance.EU
    //   );
    //   await this.complianceConfiguration.setAll(
    //     [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 150, duration.years(1)],
    //     [true, false, false]
    //   );
  });

  describe("Asset tracking mode", function() {
    it("Should set the mode correctly", async function() {});

    it("Should fail to set the mode if the omnibus wallet balance is greater then 0", async function() {});

    it("Should fail to set the mode if caller is not an operator", async function() {});

    it("Should return 'true' if the mode is 'holder of record'", async function() {});

    it("Should return 'false' if the mode is not 'holder of record'", async function() {});
  });

  describe("Transfer", async function() {
    it("Should update balances correctly in token when in 'holder of record' mode", async function() {});

    it("Should update balances correctly in token when in 'beneficiary' mode", async function() {});

    it("Should fail when there is not enough balance to transfer", async function() {});

    it("Should fail when the caller is not an operator", async function() {});
  });
});
