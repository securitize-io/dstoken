import { expect } from 'chai';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { deployDSTokenRegulated } from './utils/fixture';
import hre from 'hardhat';
import { DSConstants } from '../utils/globals';

describe('Wallet Manager Unit Tests', function() {
  describe('Add issuer wallet:', function() {
    it('Trying to add the issuer wallet with MASTER permissions', async function() {
      const [owner, wallet] = await hre.ethers.getSigners();
      const { walletManager } = await loadFixture(deployDSTokenRegulated);

      await expect(walletManager.addIssuerWallet(wallet)).to.emit(walletManager, 'DSWalletManagerSpecialWalletAdded').withArgs(wallet, 1, owner);
      expect(await walletManager.getWalletType(wallet)).to.equal(1);
      expect(await walletManager.isIssuerSpecialWallet(wallet)).to.equal(true);
      expect(await walletManager.isSpecialWallet(wallet)).to.equal(true);
      expect(await walletManager.isPlatformWallet(wallet)).to.equal(false);
    });

    it('Trying to add the issuer wallet with ISSUER permissions', async function() {
      const [owner, wallet, issuer] = await hre.ethers.getSigners();
      const { walletManager, trustService } = await loadFixture(deployDSTokenRegulated);
      await trustService.setRole(issuer, DSConstants.roles.ISSUER);
      const walletManagerFromIssuer = await walletManager.connect(issuer);
      await walletManagerFromIssuer.addIssuerWallet(wallet);
      expect(await walletManagerFromIssuer.getWalletType(wallet)).to.equal(1);
      expect(await walletManagerFromIssuer.isIssuerSpecialWallet(wallet)).to.equal(true);
      expect(await walletManagerFromIssuer.isSpecialWallet(wallet)).to.equal(true);
      expect(await walletManagerFromIssuer.isPlatformWallet(wallet)).to.equal(false);
    });

    it('Trying to add multiple issuer wallets', async function() {
      const [owner, wallet, wallet2] = await hre.ethers.getSigners();
      const { walletManager } = await loadFixture(deployDSTokenRegulated);
      await expect(walletManager.addIssuerWallets([wallet, wallet2]))
        .to.emit(walletManager, 'DSWalletManagerSpecialWalletAdded').withArgs(wallet, 1, owner)
        .to.emit(walletManager, 'DSWalletManagerSpecialWalletAdded').withArgs(wallet2, 1, owner);

      expect(await walletManager.getWalletType(wallet)).to.equal(1);
      expect(await walletManager.isIssuerSpecialWallet(wallet)).to.equal(true);
      expect(await walletManager.isSpecialWallet(wallet)).to.equal(true);
      expect(await walletManager.isPlatformWallet(wallet)).to.equal(false);

      expect(await walletManager.getWalletType(wallet2)).to.equal(1);
      expect(await walletManager.isIssuerSpecialWallet(wallet2)).to.equal(true);
      expect(await walletManager.isSpecialWallet(wallet2)).to.equal(true);
      expect(await walletManager.isPlatformWallet(wallet2)).to.equal(false);
    });

    it('Trying to add the issuer wallet with NONE permissions - should be the error', async function () {
      const [owner, unauthorized, wallet] = await hre.ethers.getSigners();
      const { walletManager } = await loadFixture(deployDSTokenRegulated);
      const walletManagerFromAuthorized = await walletManager.connect(unauthorized);
      await expect(walletManagerFromAuthorized.addIssuerWallet(wallet)).to.revertedWith('Insufficient trust level');
    });

    it('Trying to add the same ISSUER wallet - should be the error', async function () {
      const [owner, wallet] = await hre.ethers.getSigners();
      const { walletManager } = await loadFixture(deployDSTokenRegulated);

      await walletManager.addIssuerWallet(wallet);
      await expect(walletManager.addIssuerWallet(wallet)).to.revertedWith('Direct wallet type change is not allowed');
    });

    it('Trying to add more than 30 wallets - should be the error', async function () {
      const { walletManager } = await loadFixture(deployDSTokenRegulated);
      const issuerWalletsToAdd = Array(30 + 1).fill(hre.ethers.Wallet.createRandom());
      await expect(walletManager.addIssuerWallets(issuerWalletsToAdd)).to.revertedWith('Exceeded the maximum number of wallets');
    });
  });

  describe('Add platform wallet:', function () {
    it('Trying to add the platform wallet with MASTER permissions', async function () {
      const [owner, wallet] = await hre.ethers.getSigners();
      const { walletManager } = await loadFixture(deployDSTokenRegulated);

      await expect(walletManager.addPlatformWallet(wallet)).to.emit(walletManager, 'DSWalletManagerSpecialWalletAdded').withArgs(wallet, 2, owner);
      expect(await walletManager.isPlatformWallet(wallet)).to.equal(true);
    });

    it('Trying to add the platform wallet with ISSUER permissions', async function () {
      const [owner, issuer, wallet] = await hre.ethers.getSigners();
      const { walletManager, trustService } = await loadFixture(deployDSTokenRegulated);
      await trustService.setRole(issuer, DSConstants.roles.ISSUER);
      const walletManagerFromIssuer = await walletManager.connect(issuer);

      await expect(walletManagerFromIssuer.addPlatformWallet(wallet)).to.emit(walletManager, 'DSWalletManagerSpecialWalletAdded').withArgs(wallet, 2, issuer);
      expect(await walletManagerFromIssuer.isPlatformWallet(wallet)).to.equal(true);
    });

    it('Trying to add multiple platform wallets', async function () {
      const [owner, wallet, wallet2] = await hre.ethers.getSigners();
      const { walletManager } = await loadFixture(deployDSTokenRegulated);

      await expect(walletManager.addPlatformWallets([wallet, wallet2])).to.emit(walletManager, 'DSWalletManagerSpecialWalletAdded').withArgs(wallet, 2, owner);
      expect(await walletManager.isPlatformWallet(wallet)).to.equal(true)
        .to.emit(walletManager, 'DSWalletManagerSpecialWalletAdded').withArgs(wallet, 2, owner)
        .to.emit(walletManager, 'DSWalletManagerSpecialWalletAdded').withArgs(wallet2, 2, owner);

      expect(await walletManager.isPlatformWallet(wallet)).to.equal(true);
      expect(await walletManager.isPlatformWallet(wallet2)).to.equal(true);
    });

    it('Trying to add platform wallet with NONE permissions - should be the error', async function () {
      const [owner, unauthorized, wallet] = await hre.ethers.getSigners();
      const { walletManager } = await loadFixture(deployDSTokenRegulated);
      const walletManagerFromUnauthorized = await walletManager.connect(unauthorized);
      await expect(walletManagerFromUnauthorized.addPlatformWallet(wallet)).to.revertedWith('Insufficient trust level');
    });

    it('Trying to add the same platform wallet - should be the error', async function () {
      const [owner, wallet] = await hre.ethers.getSigners();
      const { walletManager } = await loadFixture(deployDSTokenRegulated);

      await walletManager.addPlatformWallet(wallet);
      await expect(walletManager.addPlatformWallet(wallet)).to.revertedWith('Direct wallet type change is not allowed');
    });

    it('Trying to add more than 30 wallets - should be the error', async function () {
      const { walletManager } = await loadFixture(deployDSTokenRegulated);
      const issuerWalletsToAdd = Array(30 + 1).fill(hre.ethers.Wallet.createRandom());
      await expect(walletManager.addPlatformWallets(issuerWalletsToAdd)).to.revertedWith('Exceeded the maximum number of wallets');
    });
  });

  describe('Add exchange wallet:', function () {
    it('Trying to add the exchange wallet with MASTER permissions', async function () {
      const [owner, wallet1, wallet2] = await hre.ethers.getSigners();
      const { walletManager, trustService } = await loadFixture(deployDSTokenRegulated);
      await trustService.setRole(wallet2, DSConstants.roles.EXCHANGE);

      await expect(walletManager.addExchangeWallet(wallet1, wallet2)).to.emit(walletManager, 'DSWalletManagerSpecialWalletAdded').withArgs(wallet1, 4, owner);
      expect(await walletManager.getWalletType(wallet1)).to.equal(4);
    });

    it('Trying to add the exchange wallet with ISSUER permissions', async function () {
      const [owner, issuer, wallet1, wallet2] = await hre.ethers.getSigners();
      const { walletManager, trustService } = await loadFixture(deployDSTokenRegulated);
      await trustService.setRole(wallet2, DSConstants.roles.EXCHANGE);
      await trustService.setRole(issuer, DSConstants.roles.ISSUER);
      const walletManagerFromIssuer = await walletManager.connect(issuer);

      await expect(walletManagerFromIssuer.addExchangeWallet(wallet1, wallet2)).to.emit(walletManager, 'DSWalletManagerSpecialWalletAdded').withArgs(wallet1, 4, issuer);
      expect(await walletManagerFromIssuer.getWalletType(wallet1)).to.equal(4);
    });

    it('Trying to add the exchange wallet with NONE permissions - should be the error', async function () {
      const [owner, unauthorized, wallet1, wallet2] = await hre.ethers.getSigners();
      const { walletManager, trustService } = await loadFixture(deployDSTokenRegulated);
      await trustService.setRole(wallet2, DSConstants.roles.EXCHANGE);
      const walletManagerFromAuthorized = await walletManager.connect(unauthorized);
      await expect(walletManagerFromAuthorized.addExchangeWallet(wallet1, wallet2)).to.revertedWith('Insufficient trust level');
    });

    it('Trying to add the same EXCHANGE wallet - should be the error', async function () {
      const [owner, wallet1, wallet2] = await hre.ethers.getSigners();
      const { walletManager, trustService } = await loadFixture(deployDSTokenRegulated);
      await trustService.setRole(wallet2, DSConstants.roles.EXCHANGE);
      await walletManager.addIssuerWallet(wallet1);
      await expect(walletManager.addExchangeWallet(wallet1, wallet2)).to.revertedWith('Direct wallet type change is not allowed');
    });
  });

  describe('Remove special wallet:', function () {
    it('Trying to remove the wallet with MASTER permissions', async function () {
      const [owner, wallet] = await hre.ethers.getSigners();
      const { walletManager } = await loadFixture(deployDSTokenRegulated);
      await walletManager.addIssuerWallet(wallet);

      await expect(walletManager.removeSpecialWallet(wallet)).to.emit(walletManager, 'DSWalletManagerSpecialWalletRemoved').withArgs(wallet, 1, owner);
      expect(await walletManager.getWalletType(wallet)).to.equal(0);
    });

    it('Trying to remove the wallet with ISSUER permissions', async function () {
      const [owner, issuer, wallet] = await hre.ethers.getSigners();
      const { walletManager, trustService } = await loadFixture(deployDSTokenRegulated);
      await trustService.setRole(issuer, DSConstants.roles.ISSUER);
      const walletManagerFromIssuer = await walletManager.connect(issuer);
      await walletManager.addIssuerWallet(wallet);

      await expect(walletManagerFromIssuer.removeSpecialWallet(wallet)).to.emit(walletManager, 'DSWalletManagerSpecialWalletRemoved').withArgs(wallet, 1, issuer);
      expect(await walletManager.getWalletType(wallet)).to.equal(0);
    });

    it('Trying to remove the wallet with NONE permissions', async function () {
      const [owner, unautorized, wallet] = await hre.ethers.getSigners();
      const { walletManager } = await loadFixture(deployDSTokenRegulated);
      const walletManagerFromUnauthorized = await walletManager.connect(unautorized);
      await walletManager.addIssuerWallet(wallet);

      await expect(walletManagerFromUnauthorized.removeSpecialWallet(wallet)).to.revertedWith('Insufficient trust level');
    });
  });
});
