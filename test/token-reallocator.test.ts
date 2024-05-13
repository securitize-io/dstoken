import hre from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { deployDSTokenRegulated, INVESTORS } from './utils/fixture';
import { expect } from 'chai';
import { DSConstants } from '../utils/globals';

describe('Token Reallocator Unit Tests', function() {
  describe('Creation', function() {
    it('Should fail when trying to initialize twice', async function() {
      const { tokenReallocator } = await loadFixture(deployDSTokenRegulated);
      await expect(tokenReallocator.initialize()).revertedWithCustomError(tokenReallocator, 'InvalidInitialization');
    });

    it('Should get version correctly', async function() {
      const { tokenReallocator } = await loadFixture(deployDSTokenRegulated);
      expect( await tokenReallocator.getInitializedVersion()).to.equal(1);
    });

    it('Should get implementation address correctly', async function() {
      const { tokenReallocator } = await loadFixture(deployDSTokenRegulated);
      expect( await tokenReallocator.getImplementationAddress()).to.be.exist;
    });
  });

  it('Should register a wallet and reallocate tokens - happy path', async function() {
    const [ investor ] = await hre.ethers.getSigners();
    const {
      dsToken,
      omnibusTBEController,
      lockManager,
      tokenReallocator,
      registryService
    } = await loadFixture(deployDSTokenRegulated);

    // Fund the Omnibus TBE wallet
    await omnibusTBEController.bulkIssuance(500, 1, 0, 0, 0, 0, 0, [], []);
    await tokenReallocator.reallocateTokens(
      INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
      investor,
      INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
      'US',
      [ 1, 2, 4 ],
      [ 1, 1, 1 ],
      [ 1, 1, 1 ],
      200,
      false
    );

    const tbeWallet = await omnibusTBEController.getOmnibusWallet();
    expect(await dsToken.balanceOf(investor)).to.equal(200);
    expect(await dsToken.balanceOf(tbeWallet)).to.equal(300);

    const country = await registryService.getCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
    expect(country).to.equal('US');
    expect(await lockManager.isInvestorLocked(INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).to.equal(false);
  });

  it('Should NOT allow to reallocate tokens using a non issuer or ta wallet', async function() {
    const [ investor, unauthorizedWallet ] = await hre.ethers.getSigners();
    const { omnibusTBEController, tokenReallocator } = await loadFixture(deployDSTokenRegulated);
    const unauthorizedReallocator = await tokenReallocator.connect(unauthorizedWallet);
    // Fund the Omnibus TBE wallet
    await omnibusTBEController.bulkIssuance(500, 1, 0, 0, 0, 0, 0, [], []);
    await expect(unauthorizedReallocator.reallocateTokens(
      INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
      investor,
      INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
      'US',
      [ 1, 2, 4 ],
      [ 1, 1, 1 ],
      [ 1, 1, 1 ],
      200,
      false
    )).to.be.revertedWith('Insufficient trust level');
  });

  it('Should allow to reallocate tokens using an issuer wallet', async function() {
    const [ investor, issuerWallet ] = await hre.ethers.getSigners();
    const { dsToken, omnibusTBEController, tokenReallocator, trustService } = await loadFixture(deployDSTokenRegulated);
    await trustService.setRole(issuerWallet, DSConstants.roles.ISSUER);
    // Fund the Omnibus TBE wallet
    await omnibusTBEController.bulkIssuance(500, 1, 0, 0, 0, 0, 0, [], []);
    const reallocatorFromIssuer = await tokenReallocator.connect(issuerWallet);
    await reallocatorFromIssuer.reallocateTokens(
      INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
      investor,
      INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
      'US',
      [ 1, 2, 4 ],
      [ 1, 1, 1 ],
      [ 1, 1, 1 ],
      200,
      false
    );
    expect(await dsToken.balanceOf(investor)).to.equal(200);
  });

  it('Should allow to reallocate tokens to a non-master but transfer agent wallet', async function() {
    const [ investor, taWallet ] = await hre.ethers.getSigners();
    const { dsToken, omnibusTBEController, tokenReallocator, trustService } = await loadFixture(deployDSTokenRegulated);
    await trustService.setRole(taWallet, DSConstants.roles.TRANSFER_AGENT);
    // Fund the Omnibus TBE wallet
    await omnibusTBEController.bulkIssuance(500, 1, 0, 0, 0, 0, 0, [], []);
    const reallocatorFromTA = await tokenReallocator.connect(taWallet);
    await reallocatorFromTA.reallocateTokens(
      INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
      investor,
      INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
      'US',
      [ 1, 2, 4 ],
      [ 1, 1, 1 ],
      [ 1, 1, 1 ],
      200,
      false
    );
    expect(await dsToken.balanceOf(investor)).to.equal(200);
  });

  it('Should NOT allow to use Reallocator if the wallet already exists in another investor', async function() {
    const [ investor ] = await hre.ethers.getSigners();
    const { omnibusTBEController, tokenReallocator } = await loadFixture(deployDSTokenRegulated);

    // Fund the Omnibus TBE wallet
    await omnibusTBEController.bulkIssuance(500, 1, 0, 0, 0, 0, 0, [], []);
    await tokenReallocator.reallocateTokens(
      INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
      investor,
      INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
      'US',
      [ 1, 2, 4 ],
      [ 1, 1, 1 ],
      [ 1, 1, 1 ],
      200,
      false
    );
    await expect(tokenReallocator.reallocateTokens(
      INVESTORS.INVESTOR_ID.INVESTOR_ID_2,
      investor,
      INVESTORS.INVESTOR_ID.INVESTOR_ID_2,
      'US',
      [ 1, 2, 4 ],
      [ 1, 1, 1 ],
      [ 1, 1, 1 ],
      200,
      false
    )).to.revertedWith('Wallet belongs to a different investor');
  });

  it('Should allow to use Reallocator if the investor already exists but not the wallet', async function() {
    const [ investor, newInvestor ] = await hre.ethers.getSigners();
    const { omnibusTBEController, tokenReallocator, dsToken } = await loadFixture(deployDSTokenRegulated);

    await omnibusTBEController.bulkIssuance(500, 1, 0, 0, 0, 0, 0, [], []);
    await tokenReallocator.reallocateTokens(
      INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
      investor,
      INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
      'US',
      [ 1, 2, 4 ],
      [ 1, 1, 1 ],
      [ 1, 1, 1 ],
      200,
      false
    );

    await tokenReallocator.reallocateTokens(
      INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
      newInvestor,
      INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
      'US',
      [ 1, 2, 4 ],
      [ 1, 1, 1 ],
      [ 1, 1, 1 ],
      250,
      false
    );

    expect(await dsToken.balanceOf(investor)).to.equal(200);
    expect(await dsToken.balanceOf(newInvestor)).to.equal(250);
    expect(await dsToken.balanceOfInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).to.equal(450);
  });

  it('Should reallocate tokens and lock the investor - isAffiliate', async function() {
    const [ investor, taWallet ] = await hre.ethers.getSigners();
    const {
      omnibusTBEController,
      tokenReallocator,
      dsToken,
      lockManager,
      trustService,
    } = await loadFixture(deployDSTokenRegulated);

    await trustService.setRole(taWallet, DSConstants.roles.TRANSFER_AGENT);
    const reallocatorFromTA = await tokenReallocator.connect(taWallet);

    await omnibusTBEController.bulkIssuance(500, 1, 0, 0, 0, 0, 0, [], []);
    await reallocatorFromTA.reallocateTokens(
      INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
      investor,
      INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
      'US',
      [ 1, 2, 4 ],
      [ 1, 1, 1 ],
      [ 1, 1, 1 ],
      200,
      true
    );

    expect(await dsToken.balanceOf(investor)).to.equal(200);
    expect(await lockManager.isInvestorLocked(INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).to.equal(true);
  });
});
