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
const complianceType = require("../../utils/globals").complianceType;
const lockManagerType = require("../../utils/globals").lockManagerType;


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
    await deployContracts(this, artifacts,
      complianceType.PARTITIONED,
      lockManagerType.PARTITIONED,
      undefined,
      true
    );

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
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 150, 1 * time.YEARS],
      [true, false, false]
    );
  });

  beforeEach(async function() {
    snapshot = await snapshotsHelper.takeSnapshot()
    snapshotId = snapshot['result'];
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
    it("Should not allow burn without specifying a partition", async function() {
      await this.token.issueTokens(usInvestorWallet, 100);
      await assertRevert(
        this.token.burn(usInvestorWallet, 50, "test burn")
      );
    });

    it("Should burn tokens of a partition correctly", async function() {
      await this.token.issueTokens(usInvestorWallet, 100);
      // get the partition identifier
      const partition = await this.token.partitionOf(usInvestorWallet,0);
      await this.token.burnByPartition(usInvestorWallet, 50, "test burn", partition);

      const balance = await this.token.balanceOf(usInvestorWallet);
      assert.equal(balance, 50);
    });

    it("Should record the number of total issued token correctly after burn", async function() {
      await this.token.issueTokens(usInvestorWallet, 100);
      await this.token.issueTokens(usInvestorWallet, 100);
      const partition = await this.token.partitionOf(usInvestorWallet,0);
      await this.token.burnByPartition(usInvestorWallet, 100, "test burn", partition);

      const totalIssued = await this.token.totalIssued();
      assert.equal(totalIssued, 200);
    });
  });

  describe("Seize", function() {
    beforeEach(async function() {
      await this.walletManager.addIssuerWallet(issuerWallet);
      await this.token.issueTokens(usInvestorWallet, 100);
    });

    it("should not allow seize without specifying a partition", async function() {
      await assertRevert(
        this.token.seize(usInvestorWallet, issuerWallet, 50, "test seize")
      );
    });

    it("Should seize tokens correctly by partition", async function() {
      const partition = await this.token.partitionOf(usInvestorWallet,0);
      await this.token.seizeByPartition(usInvestorWallet, issuerWallet, 50, "test seize", partition);

      const usInvestorBalance = await this.token.balanceOf(usInvestorWallet);
      assert.equal(usInvestorBalance, 50);
      const issuerWalletBalance = await this.token.balanceOf(issuerWallet);
      assert.equal(issuerWalletBalance, 50);
    });

    it("Cannot seize more than balance", async function() {
      const partition = await this.token.partitionOf(usInvestorWallet,0);
      await assertRevert(
        this.token.seizeByPartition(usInvestorWallet, issuerWallet, 150, "test seize", partition)
      );
    });
  });
});
