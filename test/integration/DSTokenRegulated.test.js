const DSToken = artifacts.require("DSToken");
const assertRevert = require("../utils/assertRevert");
const latestTime = require("../utils/latestTime");
const snapshotsHelper = require("../utils/snapshots");
const deployContracts = require("../utils").deployContracts;
const fixtures = require("../fixtures");
const investorId = fixtures.InvestorId;
const country = fixtures.Country;
const compliance = fixtures.Compliance;
const time = fixtures.Time;

contract("DSToken (regulated)", function([
  owner,
  issuerWallet,
  usInvestorWallet,
  usInvestorSecondaryWallet,
  usInvestor2Wallet,
  spainInvestorWallet,
  germanyInvestorWallet,
  chinaInvestorWallet,
  israelInvestorWallet
]) {
  before(async function() {
    // Setting up the environment
    await deployContracts(this, artifacts);

    // // Basic seed
    await this.complianceConfiguration.setCountryCompliance(
      country.USA,
      compliance.US
    );
    await this.complianceConfiguration.setCountryCompliance(
      country.SPAIN,
      compliance.EU
    );
    await this.complianceConfiguration.setCountryCompliance(
      country.GERMANY,
      compliance.EU
    );
    await this.complianceConfiguration.setCountryCompliance(
      country.CHINA,
      compliance.FORBIDDEN
    );

    // Registering the investors and wallets
    await this.registryService.registerInvestor(
      investorId.US_INVESTOR_ID,
      investorId.US_INVESTOR_COLLISION_HASH
    );
    await this.registryService.setCountry(
      investorId.US_INVESTOR_ID,
      country.USA
    );
    await this.registryService.addWallet(
      usInvestorWallet,
      investorId.US_INVESTOR_ID
    );
    await this.registryService.addWallet(
      usInvestorSecondaryWallet,
      investorId.US_INVESTOR_ID
    );

    await this.registryService.registerInvestor(
      investorId.US_INVESTOR_ID_2,
      investorId.US_INVESTOR_COLLISION_HASH_2
    );
    await this.registryService.setCountry(
      investorId.US_INVESTOR_ID_2,
      country.USA
    );
    await this.registryService.addWallet(
      usInvestor2Wallet,
      investorId.US_INVESTOR_ID_2
    );

    await this.registryService.registerInvestor(
      investorId.SPAIN_INVESTOR_ID,
      investorId.SPAIN_INVESTOR_COLLISION_HASH
    );
    await this.registryService.setCountry(
      investorId.SPAIN_INVESTOR_ID,
      country.SPAIN
    );
    await this.registryService.addWallet(
      spainInvestorWallet,
      investorId.SPAIN_INVESTOR_ID
    );

    await this.registryService.registerInvestor(
      investorId.GERMANY_INVESTOR_ID,
      investorId.GERMANY_INVESTOR_COLLISION_HASH
    );
    await this.registryService.setCountry(
      investorId.GERMANY_INVESTOR_ID,
      country.GERMANY
    );
    await this.registryService.addWallet(
      germanyInvestorWallet,
      investorId.GERMANY_INVESTOR_ID
    );

    await this.registryService.registerInvestor(
      investorId.CHINA_INVESTOR_ID,
      investorId.CHINA_INVESTOR_COLLISION_HASH
    );
    await this.registryService.setCountry(
      investorId.CHINA_INVESTOR_ID,
      country.CHINA
    );
    await this.registryService.addWallet(
      chinaInvestorWallet,
      investorId.CHINA_INVESTOR_ID
    );

    await this.registryService.registerInvestor(
      investorId.ISRAEL_INVESTOR_ID,
      investorId.ISRAEL_INVESTOR_COLLISION_HASH
    );
    await this.registryService.setCountry(
      investorId.ISRAEL_INVESTOR_ID,
      country.ISRAEL
    );
    await this.registryService.addWallet(
      israelInvestorWallet,
      investorId.ISRAEL_INVESTOR_ID
    );

    await this.complianceConfiguration.setAll(
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 150, 1 * time.YEARS, 0],
      [true, false, false]
    );
  });

  beforeEach(async function() {
    snapshot = await snapshotsHelper.takeSnapshot();
    snapshotId = snapshot["result"];
  });

  afterEach(async function() {
    await snapshotsHelper.revertToSnapshot(snapshotId);
  });

  describe("Creation", function() {
    it("Should get the basic details of the token correctly", async function() {
      const name = await this.token.name.call();
      const symbol = await this.token.symbol.call();
      const decimals = await this.token.decimals.call();
      const totalSupply = await this.token.totalSupply.call();

      assert.equal(name, "DSTokenMock");
      assert.equal(symbol, "DST");
      assert.equal(decimals, 18);
      assert.equal(totalSupply, 0);
    });
    it("Should not allow instantiating the token without a proxy", async function() {
      const token = await DSToken.new();
      await assertRevert(token.initialize("DSTokenMock", "DST", 18));
    });
  });

  describe("Features flag", function() {
    it("Should enable/disable features correctly", async function() {
      let supportedFeatures = await this.token.supportedFeatures.call();

      assert.equal(supportedFeatures.toNumber(), 0);

      await this.token.setFeature(20, true);
      supportedFeatures = await this.token.supportedFeatures.call();
      assert.equal(supportedFeatures.toNumber(), Math.pow(2, 20));

      await this.token.setFeature(20, false);
      supportedFeatures = await this.token.supportedFeatures.call();
      assert.equal(supportedFeatures.toNumber(), 0);

      await this.token.setFeature(31, true);
      await this.token.setFeature(32, true);
      supportedFeatures = await this.token.supportedFeatures.call();
      assert.equal(
        supportedFeatures.toNumber(),
        Math.pow(2, 31) + Math.pow(2, 32)
      );

      await this.token.setFeature(31, false);
      await this.token.setFeature(32, false);
      supportedFeatures = await this.token.supportedFeatures.call();
      assert.equal(supportedFeatures.toNumber(), 0);

      // Should be the same when setting twice
      await this.token.setFeature(31, true);
      await this.token.setFeature(31, true);
      supportedFeatures = await this.token.supportedFeatures.call();
      assert.equal(supportedFeatures.toNumber(), Math.pow(2, 31));

      await this.token.setFeature(31, false);
      await this.token.setFeature(31, false);
      supportedFeatures = await this.token.supportedFeatures.call();
      assert.equal(supportedFeatures.toNumber(), 0);
    });

    it("Should set features member correctly", async function() {
      let supportedFeatures = await this.token.supportedFeatures.call();

      assert.equal(supportedFeatures.toNumber(), 0);

      await this.token.setFeatures(Math.pow(2, 31));
      supportedFeatures = await this.token.supportedFeatures.call();

      assert.equal(supportedFeatures.toNumber(), Math.pow(2, 31));
    });
  });

  describe("Cap", function() {
    beforeEach(async function() {
      await this.token.setCap(1000);
    });

    it("Cannot be set twice", async function() {
      await assertRevert(this.token.setCap(1000));
    });

    it("Doesn't prevent issuing tokens within limit", async function() {
      await this.token.issueTokens(usInvestorWallet, 500);
      await this.token.issueTokens(usInvestorWallet, 500);
    });

    it("Prevents issuing too many tokens", async function() {
      await this.token.issueTokens(usInvestorWallet, 500);
      await assertRevert(this.token.issueTokens(usInvestorWallet, 501));
    });
  });

  describe("Issuance", function() {
    it("Should issue tokens to a us wallet", async function() {
      await this.token.issueTokens(usInvestorWallet, 100);
      const balance = await this.token.balanceOf(usInvestorWallet);
      assert.equal(balance, 100);
    });

    it("Should issue tokens to a eu wallet", async function() {
      await this.token.issueTokens(germanyInvestorWallet, 100);
      const balance = await this.token.balanceOf(germanyInvestorWallet);
      assert.equal(balance, 100);
    });

    it("Should not issue tokens to a forbidden wallet", async function() {
      await assertRevert(this.token.issueTokens(chinaInvestorWallet, 100));
    });

    it("Should issue tokens to a none wallet", async function() {
      await this.token.issueTokens(israelInvestorWallet, 100);
      const balance = await this.token.balanceOf(israelInvestorWallet);
      assert.equal(balance, 100);
    });

    it("Should record the number of total issued token correctly", async function() {
      await this.token.issueTokens(usInvestorWallet, 100);
      await this.token.issueTokens(usInvestorSecondaryWallet, 100);
      await this.token.issueTokens(usInvestor2Wallet, 100);
      await this.token.issueTokens(usInvestorWallet, 100);
      await this.token.issueTokens(germanyInvestorWallet, 100);
      await this.token.issueTokens(israelInvestorWallet, 100);

      const totalIssued = await this.token.totalIssued();

      assert.equal(totalIssued, 600);
    });
  });

  describe("Locking", function() {
    it("Should not allow transferring any tokens when all locked", async function() {
      await this.token.issueTokensCustom(
        israelInvestorWallet,
        100,
        await latestTime(),
        100,
        "TEST",
        (await latestTime()) + 1 * time.WEEKS
      );
      await assertRevert(
        this.token.transfer(germanyInvestorWallet, 1, {
          from: israelInvestorWallet
        })
      );
    });

    it("Should allow transferring tokens when other are locked", async function() {
      await this.token.issueTokensCustom(
        israelInvestorWallet,
        100,
        await latestTime(),
        50,
        "TEST",
        (await latestTime()) + 1 * time.WEEKS
      );
      await this.token.transfer(germanyInvestorWallet, 50, {
        from: israelInvestorWallet
      });
      const israelBalance = await this.token.balanceOf(israelInvestorWallet);
      assert.equal(israelBalance, 50);
      const germanyBalance = await this.token.balanceOf(germanyInvestorWallet);
      assert.equal(germanyBalance, 50);
    });

    it("Should allow investors to move locked tokens between their own wallets", async function() {
      await this.token.issueTokensCustom(
        usInvestorWallet,
        100,
        await latestTime(),
        100,
        "TEST",
        (await latestTime()) + 1 * time.WEEKS
      );
      await this.token.transfer(usInvestorSecondaryWallet, 50, {
        from: usInvestorWallet
      });
      const usInvestorBalance = await this.token.balanceOf(usInvestorWallet);
      assert.equal(usInvestorBalance.toNumber(), 50);
      const usInvestorSecondaryWalletBalance = await this.token.balanceOf(
        usInvestorSecondaryWallet
      );
      assert.equal(usInvestorSecondaryWalletBalance.toNumber(), 50);
    });
  });

  describe("Burn", function() {
    it("Should burn tokens from a specific wallet", async function() {
      await this.token.issueTokens(usInvestorWallet, 100);
      await this.token.burn(usInvestorWallet, 50, "test burn");

      const balance = await this.token.balanceOf(usInvestorWallet);
      assert.equal(balance, 50);
    });

    it("Should record the number of total issued token correctly after burn", async function() {
      await this.token.issueTokens(usInvestorWallet, 100);
      await this.token.issueTokens(usInvestorWallet, 100);
      await this.token.burn(usInvestorWallet, 100, "test burn");

      const totalIssued = await this.token.totalIssued();
      assert.equal(totalIssued, 200);
    });
  });

  describe("Seize", function() {
    beforeEach(async function() {
      await this.walletManager.addIssuerWallet(issuerWallet);
      await this.token.issueTokens(usInvestorWallet, 100);
    });

    it("Should seize tokens correctly", async function() {
      await this.token.seize(usInvestorWallet, issuerWallet, 50, "test seize");

      const usInvestorBalance = await this.token.balanceOf(usInvestorWallet);
      assert.equal(usInvestorBalance, 50);
      const issuerWalletBalance = await this.token.balanceOf(issuerWallet);
      assert.equal(issuerWalletBalance, 50);
    });

    it("Cannot seize more than balance", async function() {
      await assertRevert(
        this.token.seize(usInvestorWallet, issuerWallet, 150, "test seize")
      );
    });
  });
});
