/* eslint-disable comma-spacing,max-len */
const StandardTokenMock = artifacts.require('StandardTokenMock');
const Proxy = artifacts.require('Proxy');
const assertRevert = require('../utils/assertRevert');
const increaseTime = require('../utils/increaseTime').increaseTime;
const latestTime = require('../utils/latestTime');
const deployContracts = require('../utils').deployContracts;
const deployContractBehindProxy = require('../utils').deployContractBehindProxy;
const setServicesDependencies = require('../utils').setServicesDependencies;
const services = require('../../utils/globals').services;
const roles = require('../../utils/globals').roles;
const fixtures = require('../fixtures');
const investorId = fixtures.InvestorId;
const country = fixtures.Country;
const compliance = fixtures.Compliance;
const time = fixtures.Time;

contract('Integration', function ([
  _,
  issuerWallet,
  usInvestorWallet,
  usInvestorSecondaryWallet,
  usInvestor2Wallet,
  spainInvestorWallet,
  germanyInvestorWallet,
  chinaInvestorWallet,
  israelInvestorWallet,
  usInvestor3Wallet,
  germanyInvestor2Wallet,
  platformWallet,
  exchangeWallet,
  nonIssuerWallet,
  issuerWalletThatCanPause,
]) {
  before(async function () {
    await deployContracts(this, artifacts);
    await this.trustService.setRole(this.issuer.address, roles.ISSUER);
    await this.complianceConfiguration.setAll(
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 150, 1 * time.YEARS, 0],
      [true, false, false, false]
    );
  });

  describe('Issuance', function () {
    it('Should setup country compliance', async function () {
      // Basic seed
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
    });
    it('Should register investors via multiple calls', async function () {
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
        investorId.US_INVESTOR_ID_3,
        investorId.US_INVESTOR_COLLISION_HASH_3
      );
      await this.registryService.setCountry(
        investorId.US_INVESTOR_ID_3,
        country.USA
      );
      await this.registryService.addWallet(
        usInvestor3Wallet,
        investorId.US_INVESTOR_ID_3
      );

      let tx = await this.registryService.registerInvestor(
        investorId.SPAIN_INVESTOR_ID,
        investorId.SPAIN_INVESTOR_COLLISION_HASH
      );
      assert.equal(tx.logs[0].event, 'DSRegistryServiceInvestorAdded');
      assert.equal(
        tx.logs[0].args.investorId.valueOf(),
        investorId.SPAIN_INVESTOR_ID
      );
      tx = await this.registryService.setCountry(
        investorId.SPAIN_INVESTOR_ID,
        country.SPAIN
      );
      assert.equal(tx.logs[0].event, 'DSRegistryServiceInvestorCountryChanged');
      assert.equal(
        tx.logs[0].args.investorId.valueOf(),
        investorId.SPAIN_INVESTOR_ID
      );
      tx = await this.registryService.addWallet(
        spainInvestorWallet,
        investorId.SPAIN_INVESTOR_ID
      );
      assert.equal(tx.logs[0].event, 'DSRegistryServiceWalletAdded');
      assert.equal(tx.logs[0].args.wallet.valueOf(), spainInvestorWallet);
      assert.equal(
        tx.logs[0].args.investorId.valueOf(),
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
        investorId.GERMANY_INVESTOR_ID_2,
        investorId.GERMANY_INVESTOR_COLLISION_HASH_2
      );
      await this.registryService.setCountry(
        investorId.GERMANY_INVESTOR_ID_2,
        country.GERMANY
      );
      await this.registryService.addWallet(
        germanyInvestor2Wallet,
        investorId.GERMANY_INVESTOR_ID_2
      );
      await this.registryService.setAttribute(
        investorId.GERMANY_INVESTOR_ID,
        4,
        1,
        0,
        'abcde'
      );
    });
    it('Should register investors via the token issuer', async function () {
      await this.issuer.issueTokens(
        investorId.ISRAEL_INVESTOR_ID,
        israelInvestorWallet,
        [777, await latestTime()],
        '',
        [],
        [],
        investorId.ISRAEL_INVESTOR_COLLISION_HASH,
        country.ISRAEL,
        [1, 0, 0],
        [0, 0, 0]
      );
    });
    it('should be able to issue and have a correct number of eu and us investors', async function () {
      let usInvestorsCount = await this.complianceService.getUSInvestorsCount.call();
      assert.equal(usInvestorsCount, 0);
      let tx = await this.token.issueTokensCustom(
        usInvestorWallet,
        1000,
        await latestTime(),
        0,
        '',
        0
      );
      assert.equal(tx.logs[0].event, 'Issue');
      assert.equal(tx.logs[0].args.to.valueOf(), usInvestorWallet);
      assert.equal(tx.logs[0].args.value.valueOf(), 1000);
      assert.equal(tx.logs[0].args.valueLocked.valueOf(), 0);

      await this.token.issueTokensCustom(
        usInvestor2Wallet,
        500,
        (await latestTime()) - 80 * time.WEEKS,
        250,
        'TEST',
        (await latestTime()) + 1 * time.WEEKS
      );
      await this.token.issueTokensCustom(
        usInvestor3Wallet,
        2500,
        (await latestTime()) - 80 * time.WEEKS,
        0,
        '',
        0
      );
      usInvestorsCount = await this.complianceService.getUSInvestorsCount.call();
      assert.equal(usInvestorsCount, 3);
      let euRetailInvestorsCount = await this.complianceService.getEURetailInvestorsCount.call(
        country.GERMANY
      );
      assert.equal(euRetailInvestorsCount, 0);
      await this.token.issueTokensCustom(
        germanyInvestor2Wallet,
        500,
        await latestTime(),
        0,
        '',
        0
      );
      euRetailInvestorsCount = await this.complianceService.getEURetailInvestorsCount.call(
        country.GERMANY
      );
      assert.equal(euRetailInvestorsCount, 1);
      tx = await this.token.issueTokensCustom(
        germanyInvestorWallet,
        1000,
        await latestTime(),
        250,
        'TEST',
        (await latestTime()) + 1 * time.WEEKS
      );
      assert.equal(tx.logs[0].event, 'Issue');
      assert.equal(tx.logs[0].args.to.valueOf(), germanyInvestorWallet);
      assert.equal(tx.logs[0].args.value.valueOf(), 1000);
      assert.equal(tx.logs[0].args.valueLocked.valueOf(), 250);
      euRetailInvestorsCount = await this.complianceService.getEURetailInvestorsCount.call(
        country.GERMANY
      );
      assert.equal(euRetailInvestorsCount, 1);
    });

    it('Should update us and eu investors correctly after country change', async function () {
      await this.registryService.setCountry(
        investorId.US_INVESTOR_ID,
        country.GERMANY
      );
      let euRetailInvestorsCount = await this.complianceService.getEURetailInvestorsCount.call(
        country.GERMANY
      );
      assert.equal(euRetailInvestorsCount, 2);
      let usInvestorsCount = await this.complianceService.getUSInvestorsCount.call();
      assert.equal(usInvestorsCount, 2);

      await this.registryService.setCountry(
        investorId.US_INVESTOR_ID,
        country.USA
      );
      euRetailInvestorsCount = await this.complianceService.getEURetailInvestorsCount.call(
        country.GERMANY
      );
      usInvestorsCount = await this.complianceService.getUSInvestorsCount.call();
      assert.equal(usInvestorsCount, 3);
      assert.equal(euRetailInvestorsCount, 1);
      await this.registryService.setCountry(
        investorId.US_INVESTOR_ID,
        country.ISRAEL
      );
      usInvestorsCount = await this.complianceService.getUSInvestorsCount.call();
      assert.equal(usInvestorsCount, 2);
      await this.registryService.setCountry(
        investorId.US_INVESTOR_ID,
        country.USA
      );
      usInvestorsCount = await this.complianceService.getUSInvestorsCount.call();
      assert.equal(usInvestorsCount, 3);
    });
  });
  describe('Transfers', function () {
    it('Should allow some transfers and update the number of eu and us investors', async function () {
      const balanceBeforeTransfer = await this.token.balanceOf(
        usInvestorWallet
      );
      assert.equal(balanceBeforeTransfer, 1000);

      const t1 = await this.complianceService.getComplianceTransferableTokens(
        usInvestorWallet,
        await latestTime(),
        (await latestTime()) + 52 * time.WEEKS
      );
      assert.equal(t1, 0); // should be 0 because of yearly lock
      const t2 = await this.lockManager.getTransferableTokens(
        usInvestor2Wallet,
        await latestTime()
      );
      assert.equal(t2.toNumber(), 250); // 250 tokens are locked manually

      const t3 = await this.complianceService.getComplianceTransferableTokens(
        usInvestor2Wallet,
        await latestTime(),
        1 * time.YEARS
      );
      assert.equal(t3.toNumber(), 250); // should be 250 because the accredited lock has passed, and 250 are locked manually

      let res = await this.complianceService.preTransferCheck(
        usInvestorWallet,
        usInvestor2Wallet,
        250
      );
      assert.equal(res[0].toNumber(), 32); // Hold up 1y
      res = await this.complianceService.preTransferCheck(
        usInvestor2Wallet,
        usInvestorWallet,
        500
      );
      assert.equal(res[0].toNumber(), 16); // Tokens manually locked
      res = await this.complianceService.preTransferCheck(
        usInvestor2Wallet,
        usInvestorWallet,
        250
      );
      assert.equal(res[0].toNumber(), 50); // Only full transfer
      res = await this.complianceService.preTransferCheck(
        usInvestor3Wallet,
        usInvestor2Wallet,
        2500
      );
      assert.equal(res[0].toNumber(), 0); // Valid

      // Allow moving between investor's own wallets
      res = await this.token.balanceOfInvestor(investorId.US_INVESTOR_ID);
      assert.equal(res.toNumber(), 1000); // 1000 tokens issued
      res = await this.complianceService.preTransferCheck(
        usInvestorWallet,
        usInvestorSecondaryWallet,
        250
      );
      assert.equal(res[0].toNumber(), 0); // Valid
      let tx = await this.token.transfer(usInvestorSecondaryWallet, 250, {
        from: usInvestorWallet,
      });
      res = await this.token.balanceOfInvestor(investorId.US_INVESTOR_ID);
      assert.equal(res.toNumber(), 1000); // Should still be 1000

      tx = await this.token.transfer(usInvestor2Wallet, 2500, {
        from: usInvestor3Wallet,
      });
      assert.equal(tx.logs[0].event, 'Transfer');
      assert.equal(tx.logs[0].args.from.valueOf(), usInvestor3Wallet);
      assert.equal(tx.logs[0].args.to.valueOf(), usInvestor2Wallet);
      assert.equal(tx.logs[0].args.value.valueOf(), 2500);
      let usInvestorsCount = await this.complianceService.getUSInvestorsCount.call();
      assert.equal(usInvestorsCount, 2); // should now be 2, because 3 is not holding tokens any more

      res = await this.complianceService.preTransferCheck(
        germanyInvestor2Wallet,
        usInvestorWallet,
        500
      );
      assert.equal(res[0].toNumber(), 25); // No flowback

      res = await this.complianceService.preTransferCheck(
        germanyInvestor2Wallet,
        germanyInvestorWallet,
        500
      );
      assert.equal(res[0].toNumber(), 0); // Valid
      tx = await this.token.transfer(germanyInvestorWallet, 500, {
        from: germanyInvestor2Wallet,
      });
      let euRetailInvestorsCount = await this.complianceService.getEURetailInvestorsCount.call(
        country.GERMANY
      );
      assert.equal(euRetailInvestorsCount.toNumber(), 0); // We have only one investor, and he's qualified
    });
    it('Manual locks should behave correctly', async function () {
      // germany investor 1 should have 1000 + 500 - 250 transferable tokens

      let tt = await this.lockManager.getTransferableTokens(
        germanyInvestorWallet,
        await latestTime()
      );
      assert.equal(tt.toNumber(), 1250);

      let tx = await this.lockManager.addManualLockRecord(
        germanyInvestorWallet,
        100,
        'TEST2',
        (await latestTime()) + 8 * time.WEEKS
      );
      assert.equal(tx.logs[0].event, 'HolderLocked');
      assert.equal(tx.logs[0].args.holderId, investorId.GERMANY_INVESTOR_ID);
      assert.equal(tx.logs[0].args.value.valueOf(), 100);
      assert.equal(tx.logs[1].event, 'Locked');
      assert.equal(tx.logs[1].args.who.valueOf(), germanyInvestorWallet);
      assert.equal(tx.logs[1].args.value.valueOf(), 100);

      tt = await this.lockManager.getTransferableTokens(
        germanyInvestorWallet,
        await latestTime()
      );
      assert.equal(tt.toNumber(), 1150);

      // Try to move locked tokens - should fail
      await assertRevert(
        this.token.transfer(germanyInvestor2Wallet, 1500, {
          from: germanyInvestorWallet,
        })
      );

      await increaseTime(2 * time.WEEKS);

      // Should still fail
      await assertRevert(
        this.token.transfer(germanyInvestor2Wallet, 1500, {
          from: germanyInvestorWallet,
        })
      );

      // Remove the manual lock
      tt = await this.lockManager.lockCount.call(germanyInvestorWallet);
      assert.equal(tt.toNumber(), 2);
      tt = await this.lockManager.lockInfo(germanyInvestorWallet, 1);
      assert.equal(tt[2].toNumber(), 100);

      tx = await this.lockManager.removeLockRecord(germanyInvestorWallet, 1);
      assert.equal(tx.logs[0].event, 'Unlocked');
      assert.equal(tx.logs[0].args.who.valueOf(), germanyInvestorWallet);
      assert.equal(tx.logs[0].args.value.valueOf(), 100);

      // Now it should work
      await this.token.transfer(germanyInvestor2Wallet, 1500, {
        from: germanyInvestorWallet,
      });
    });

    it('Should allow wallet iteration and investor counting', async function () {
      // Iterate through all the wallets
      let count = await this.token.walletCount.call();
      assert.equal(count.toNumber(), 5); // USinvestor, usinvestorSecondary,usinvestor2,IsraelInvestor, and germanyInvestor2

      count = await this.complianceService.getTotalInvestorsCount.call(); // USInvestor, USInvestor2, IsraelInvestor, GermanyInvestor2
      assert.equal(count.toNumber(), 4);
    });
  });
  describe('Special operations', function () {
    it('Should create correctly issuer,platform and exchange wallets', async function () {
      let tx = await this.walletManager.addIssuerWallet(issuerWallet);
      assert.equal(tx.logs[0].event, 'DSWalletManagerSpecialWalletAdded');
      assert.equal(tx.logs[0].args.wallet, issuerWallet);
      assert.equal(tx.logs[0].args.walletType, 1);

      await this.walletManager.addPlatformWallet(platformWallet);

      await this.trustService.setRole(exchangeWallet, roles.EXCHANGE);
      await this.walletManager.addExchangeWallet(
        exchangeWallet,
        exchangeWallet
      );
    });
    it('Should allow sending tokens to and from platform wallets', async function () {
      const balance = await this.token.balanceOfInvestor.call(
        investorId.US_INVESTOR_ID_2
      );

      await assertRevert(
        this.token.transfer(platformWallet, 2, { from: usInvestor2Wallet })
      ); // Only full transfers
      await this.token.transfer(platformWallet, balance, {
        from: usInvestor2Wallet,
      });
      await this.token.transfer(usInvestor2Wallet, balance, {
        from: platformWallet,
      });
    });
    it('Should seize tokens correctly to issuer wallets', async function () {
      const tx = await this.token.seize(
        usInvestorWallet,
        issuerWallet,
        4,
        'testing'
      );
      assert.equal(tx.logs[0].event, 'Seize');
      assert.equal(tx.logs[0].args.from, usInvestorWallet);
      assert.equal(tx.logs[0].args.to, issuerWallet);
      assert.equal(tx.logs[0].args.value, 4);
      assert.equal(tx.logs[0].args.reason, 'testing');

      // Should fail to send FROM the issuer wallet
      await assertRevert(
        this.token.transfer(usInvestorWallet, 1, { from: issuerWallet })
      );
    });
    it('Should burn tokens correctly', async function () {
      const balanceBefore = await this.token.balanceOf.call(issuerWallet);
      assert.equal(balanceBefore.toNumber(), 4);

      const tx = await this.token.burn(issuerWallet, 3, 'just checking');
      assert.equal(tx.logs[0].event, 'Burn');
      assert.equal(tx.logs[0].args.burner, issuerWallet);
      assert.equal(tx.logs[0].args.value, 3);
      assert.equal(tx.logs[0].args.reason, 'just checking');

      const balanceAfter = await this.token.balanceOf.call(issuerWallet);
      assert.equal(balanceAfter.toNumber(), 1);
    });
    it('Should allow pausing and un-pausing the token', async function () {
      let tx = await this.token.pause();
      assert.equal(tx.logs[0].event, 'Pause');
      // should revert
      await assertRevert(
        this.token.transfer(germanyInvestorWallet, 2, {
          from: germanyInvestor2Wallet,
        })
      );
      tx = await this.token.unpause();
      assert.equal(tx.logs[0].event, 'Unpause');
      // now it should be ok
      await this.token.transfer(germanyInvestorWallet, 2, {
        from: germanyInvestor2Wallet,
      });
    });
    it('Should allow pausing and un-pausing the token for an ISSUER role', async function () {
      // Should not allow a non-issuer to pause the token
      await assertRevert(
        this.token.pause({ from: nonIssuerWallet })
      );
      await this.trustService.setRole(issuerWalletThatCanPause, roles.ISSUER);
      let tx = await this.token.pause({ from: issuerWalletThatCanPause });
      assert.equal(tx.logs[0].event, 'Pause');
      // should revert
      await assertRevert(
        this.token.transfer(germanyInvestorWallet, 2, {
          from: germanyInvestor2Wallet,
        })
      );
      tx = await this.token.unpause({ from: issuerWalletThatCanPause });
      assert.equal(tx.logs[0].event, 'Unpause');
      // now it should be ok
      await this.token.transfer(germanyInvestorWallet, 2, {
        from: germanyInvestor2Wallet,
      });
    });
    it('Should allow upgrading the compliance manager', async function () {
      // At first usInvestor should not be allowed to send any tokens to another us investor
      await assertRevert(
        this.token.transfer(usInvestor2Wallet, 2, { from: usInvestorWallet })
      );
      // Create a new compliance service and set the token to work with it
      await deployContractBehindProxy(
        artifacts.require('Proxy'),
        artifacts.require('ComplianceServiceWhitelisted'),
        this,
        'complianceService'
      );
      const tx = await this.token.setDSService(
        services.COMPLIANCE_SERVICE,
        this.complianceService.address
      );
      await setServicesDependencies(
        this.complianceService,
        [
          services.TRUST_SERVICE,
          services.WALLET_MANAGER,
          services.LOCK_MANAGER,
          services.COMPLIANCE_CONFIGURATION_SERVICE,
          services.REGISTRY_SERVICE,
          services.DS_TOKEN,
        ],
        [
          this.trustService.address,
          this.walletManager.address,
          this.lockManager.address,
          this.complianceConfiguration.address,
          this.registryService.address,
          this.token.address,
        ]
      );

      assert.equal(tx.logs[0].event, 'DSServiceSet');
      assert.equal(tx.logs[0].args.serviceId, services.COMPLIANCE_SERVICE);
      assert.equal(
        tx.logs[0].args.serviceAddress,
        this.complianceService.address
      );

      // // Now it should work
      await this.token.transfer(usInvestor2Wallet, 2, { from: usInvestorWallet });
    });
    it('Should allow upgrading the token', async function () {
      // At first usInvestor should not be allowed to send any tokens to a chinese investor
      let before = await this.token.balanceOf(usInvestorWallet);
      assert(before.toNumber(), 998);
      await assertRevert(
        this.token.transfer(chinaInvestorWallet, 2, { from: usInvestorWallet })
      ); // Not a registered wallet

      // Create a new token
      const tokenMock = await StandardTokenMock.new();
      const proxy = await Proxy.at(this.token.address);
      await proxy.setTarget(tokenMock.address);

      let after = await this.token.balanceOf(usInvestorWallet);
      assert(after.toNumber(), 998);

      // Now it should allow sending to any address
      before = await this.token.balanceOf(chinaInvestorWallet);
      await this.token.transfer(chinaInvestorWallet, 2, {
        from: usInvestorWallet,
      });
      after = await this.token.balanceOf(chinaInvestorWallet);
      assert(after.toNumber(), before.toNumber() + 2);
    });
  });
});
