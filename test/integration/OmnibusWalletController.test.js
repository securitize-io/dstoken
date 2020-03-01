const assertRevert = require("../utils/assertRevert");
const deployContracts = require("../utils").deployContracts;

contract("OmnibusWalletController", function([wallet1, wallet2]) {
  beforeEach(async function() {
    await deployContracts(this, artifacts);
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

    it("Should fail if the omnibus wallet balance is greater then 0", async function() {});

    it("Should return 'true' if the mode is 'holder of record'", async function() {});

    it("Should return 'false' if the mode is not 'holder of record'", async function() {});
  });
});
