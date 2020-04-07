const assertRevert = require("../utils/assertRevert");
const latestTime = require("../utils/latestTime");
const snapshotsHelper = require("../utils/snapshots");
const increaseTime = require("../utils/increaseTime").increaseTime;
const deployContracts = require("../utils").deployContracts;
const roles = require("../../utils/globals").roles;
const complianceType = require("../../utils/globals").complianceType;
const lockManagerType = require("../../utils/globals").lockManagerType;
const fixtures = require("../fixtures");
const investorId = fixtures.InvestorId;
const country = fixtures.Country;
const compliance = fixtures.Compliance;
const time = fixtures.Time;

contract("ComplianceServiceRegulatedPartitioned", function([
  owner,
  wallet,
  wallet1,
  issuerWallet,
  noneWallet1,
  noneWallet2,
  platformWallet,
  omnibusWallet
]) {
  before(async function() {
    await deployContracts(
      this,
      artifacts,
      complianceType.PARTITIONED,
      lockManagerType.PARTITIONED,
      undefined,
      true
    );
    await this.trustService.setRole(issuerWallet, roles.ISSUER);
    await this.walletManager.addIssuerWallet(issuerWallet);
    await this.complianceConfiguration.setCountryCompliance(
      country.USA,
      compliance.US
    );
    await this.complianceConfiguration.setCountryCompliance(
      country.FRANCE,
      compliance.EU
    );
    await this.complianceConfiguration.setAll(
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 150, time.YEARS, 0],
      [true, false, false]
    );
    await this.registryService.registerInvestor(
      investorId.GENERAL_INVESTOR_ID_1,
      investorId.GENERAL_INVESTOR_COLLISION_HASH_1
    );
    await this.registryService.registerInvestor(
      investorId.GENERAL_INVESTOR_ID_2,
      investorId.GENERAL_INVESTOR_COLLISION_HASH_2
    );
  });

  beforeEach(async function() {
    snapshot = await snapshotsHelper.takeSnapshot();
    snapshotId = snapshot["result"];
  });

  afterEach(async function() {
    await snapshotsHelper.revertToSnapshot(snapshotId);
  });

  describe("Pre transfer check", function() {
    it("Pre transfer check with paused token", async function() {
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_1
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_2
      );
      await this.token.issueTokens(owner, 100, {gas: 2e6});
      await this.token.pause();
      const res = await this.complianceService.preTransferCheck(
        owner,
        wallet,
        10
      );
      assert.equal(10, res[0].toNumber());
      assert.equal("Token paused", res[1]);
    });

    it("Pre transfer check with not enough tokens", async function() {
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_1
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1
      );
      await this.token.issueTokens(owner, 100);
      const res = await this.complianceService.preTransferCheck(
        wallet,
        owner,
        10
      );
      assert.equal(15, res[0].toNumber());
      assert.equal("Not enough tokens", res[1]);
    });

    it("Pre transfer check when transfer myself", async function() {
      await this.registryService.addWallet(
        noneWallet1,
        investorId.GENERAL_INVESTOR_ID_1
      );
      await this.token.issueTokens(noneWallet1, 100);
      const res = await this.complianceService.preTransferCheck(
        noneWallet1,
        noneWallet1,
        10
      );
      assert.equal(0, res[0].toNumber());
      assert.equal("Valid", res[1]);
    });

    it("Should revert due to Wallet Not In Registry Service", async function() {
      await this.registryService.addWallet(
        noneWallet1,
        investorId.GENERAL_INVESTOR_ID_1
      );
      await this.token.issueTokens(noneWallet1, 100);
      const res = await this.complianceService.preTransferCheck(
        noneWallet1,
        noneWallet2,
        10
      );
      assert.equal(20, res[0].toNumber());
      assert.equal("Wallet not in registry service", res[1]);
    });

    it("Pre transfer check with tokens locked", async function() {
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1
      );
      await this.token.issueTokens(wallet, 100);
      const partition = await this.token.partitionOf(wallet, 0);
      await this.lockManager.addManualLockRecord(
        wallet,
        95,
        "Test",
        (await latestTime()) + 1000,
        partition
      );
      const res = await this.complianceService.preTransferCheck(
        wallet,
        owner,
        10
      );
      assert.equal(16, res[0].toNumber());
      assert.equal("Tokens locked", res[1]);
    });

    it("Pre transfer check with tokens locked for 1 year (For Us investors)", async function() {
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_1,
        country.USA
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_2,
        country.USA
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1
      );
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_2
      );
      await this.complianceConfiguration.setCountryCompliance(
        country.USA,
        compliance.US
      );
      await this.complianceConfiguration.setCountryCompliance(
        country.FRANCE,
        compliance.EU
      );
      await this.token.issueTokens(wallet, 100);

      assert.equal(await this.token.balanceOf(wallet), 100);
      const res = await this.complianceService.preTransferCheck(
        wallet,
        owner,
        10
      );
      assert.equal(res[0].toNumber(), 32);
      assert.equal(res[1], "Hold-up 1y");
    });

    it("Pre transfer check with force accredited", async function() {
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_1,
        country.FRANCE
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_2,
        country.USA
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1
      );
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_2
      );
      await this.token.issueTokens(wallet, 100);
      await this.complianceConfiguration.setCountryCompliance(
        country.USA,
        compliance.US
      );
      await this.complianceConfiguration.setCountryCompliance(
        country.FRANCE,
        compliance.EU
      );
      await this.complianceConfiguration.setForceAccredited(true);

      assert.equal(await this.token.balanceOf(wallet), 100);
      const res = await this.complianceService.preTransferCheck(
        wallet,
        owner,
        10
      );
      assert.equal(res[0].toNumber(), 61);
      assert.equal(res[1], "Only accredited");
    });

    it("Pre transfer check with US force accredited", async function() {
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_1,
        country.FRANCE
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_2,
        country.USA
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1
      );
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_2
      );
      await this.token.issueTokens(wallet, 100);
      await this.complianceConfiguration.setCountryCompliance(
        country.USA,
        compliance.US
      );
      await this.complianceConfiguration.setCountryCompliance(
        country.FRANCE,
        compliance.EU
      );
      await this.complianceConfiguration.setForceAccreditedUS(true);

      assert.equal(await this.token.balanceOf(wallet), 100);
      const res = await this.complianceService.preTransferCheck(
        wallet,
        owner,
        10
      );
      assert.equal(res[0].toNumber(), 62);
      assert.equal(res[1], "Only us accredited");
    });

    it("Pre transfer check for full transfer - should return code 50", async function() {
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_1,
        country.USA
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_2,
        country.USA
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1
      );
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_2
      );
      await this.token.issueTokens(wallet, 100);
      await this.complianceConfiguration.setCountryCompliance(
        country.USA,
        compliance.US
      );
      await this.complianceConfiguration.setCountryCompliance(
        country.FRANCE,
        compliance.EU
      );
      assert.equal(await this.token.balanceOf(wallet), 100);
      await increaseTime(370 * time.DAYS);
      const res = await this.complianceService.preTransferCheck(
        wallet,
        owner,
        50
      );
      assert.equal(res[0].toNumber(), 50);
      assert.equal(res[1], "Only full transfer");
    });

    it("Pre transfer check from nonUs investor to US - should return code 25", async function() {
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_1,
        country.FRANCE
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_2,
        country.USA
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1
      );
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_2
      );
      await this.token.issueTokens(wallet, 100);
      await this.complianceConfiguration.setCountryCompliance(
        country.USA,
        compliance.US
      );
      await this.complianceConfiguration.setCountryCompliance(
        country.FRANCE,
        compliance.EU
      );

      // Set block flow back to end 200 secs after issuance
      await this.complianceConfiguration.setBlockFlowbackEndTime(200);
      assert.equal(await this.token.balanceOf(wallet), 100);
      const res = await this.complianceService.preTransferCheck(
        wallet,
        owner,
        10
      );
      assert.equal(res[0].toNumber(), 25);
      assert.equal(res[1], "Flowback");
    });

    it("Pre transfer check from US to US through EU - should pass", async function() {
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_1,
        country.FRANCE
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_2,
        country.USA
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1
      );
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_2
      );
      await this.token.issueTokens(owner, 100);
      await this.complianceConfiguration.setUSLockPeriod(0);
      await this.complianceConfiguration.setCountryCompliance(
        country.USA,
        compliance.US
      );
      await this.complianceConfiguration.setCountryCompliance(
        country.FRANCE,
        compliance.EU
      );
      await this.token.transfer(wallet, 100, {from: owner});
      await this.complianceConfiguration.setBlockFlowbackEndTime(200);
      assert.equal(await this.token.balanceOf(wallet), 100);
      const res = await this.complianceService.preTransferCheck(
        wallet,
        owner,
        100
      );
      assert.equal(res[0].toNumber(), 0);
      assert.equal(res[1], "Valid");
    });

    it("Pre transfer check from EU to EU through US - should not hold up 1y", async function() {
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_1,
        country.FRANCE
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_2,
        country.USA
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1
      );
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_2
      );
      await this.token.issueTokens(wallet, 100);
      await this.complianceConfiguration.setCountryCompliance(
        country.USA,
        compliance.US
      );
      await this.complianceConfiguration.setCountryCompliance(
        country.FRANCE,
        compliance.EU
      );
      await this.token.transfer(owner, 100, {from: wallet});
      assert.equal(await this.token.balanceOf(owner), 100);
      const res = await this.complianceService.preTransferCheck(
        owner,
        wallet,
        100
      );
      assert.equal(res[0].toNumber(), 0);
      assert.equal(res[1], "Valid");
    });

    it("Pre transfer check for platform account", async function() {
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_1,
        country.USA
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_2,
        country.USA
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_1
      );
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_2
      );
      await this.walletManager.addPlatformWallet(platformWallet);
      await this.token.issueTokens(wallet, 100);
      await this.complianceConfiguration.setCountryCompliance(
        country.USA,
        compliance.US
      );
      await this.complianceConfiguration.setCountryCompliance(
        country.FRANCE,
        compliance.EU
      );
      assert.equal(await this.token.balanceOf(wallet), 100);
      const res = await this.complianceService.preTransferCheck(
        wallet,
        platformWallet,
        100
      );
      assert.equal(res[0].toNumber(), 0);
      assert.equal(res[1], "Valid");
    });

    it("Pre transfer check when transfer ok", async function() {
      await this.registryService.addWallet(
        owner,
        investorId.GENERAL_INVESTOR_ID_1
      );
      await this.registryService.addWallet(
        wallet,
        investorId.GENERAL_INVESTOR_ID_2
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_1,
        country.FRANCE
      );
      await this.registryService.setCountry(
        investorId.GENERAL_INVESTOR_ID_2,
        country.FRANCE
      );
      await this.complianceConfiguration.setForceAccreditedUS(true); // Should still pass
      await this.token.issueTokens(owner, 100);
      const res = await this.complianceService.preTransferCheck(
        owner,
        wallet,
        10
      );
      assert.equal(0, res[0].toNumber());
      assert.equal("Valid", res[1]);
    });
  });
});
