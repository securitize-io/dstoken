import hre from 'hardhat';
import { expect } from 'chai';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { deployDSTokenRegulated } from './utils/fixture';
import { DSConstants } from '../utils/globals';

describe('Trust Service Unit Tests', function() {

  describe('Creation flow', function() {
    it('For the owner account - the role should be MASTER', async function() {
      const [owner] = await hre.ethers.getSigners();
      const { trustService } = await loadFixture(deployDSTokenRegulated);

      expect(await trustService.getRole(owner)).equal(DSConstants.roles.MASTER);
    });
  });

  describe('Set owner flow', function() {
    it('Trying to call not by master', async function() {
      const [owner, unauthorized, wallet] = await hre.ethers.getSigners();
      const { trustService } = await loadFixture(deployDSTokenRegulated);
      const trustServiceFromUnauthorized = await trustService.connect(unauthorized);
      await expect(trustServiceFromUnauthorized.setServiceOwner(wallet)).revertedWith('Not enough permissions');
    });

    it('Should transfer ownership (MASTER role) of the contract', async function() {
      const [owner, newOwner] = await hre.ethers.getSigners();
      const { trustService } = await loadFixture(deployDSTokenRegulated);

      await expect(trustService.setServiceOwner(newOwner))
        .emit(trustService, 'DSTrustServiceRoleRemoved').withArgs(owner, 1, owner)
        .emit(trustService, 'DSTrustServiceRoleAdded').withArgs(newOwner, 1, owner);

      expect(await trustService.getRole(owner)).equal(DSConstants.roles.NONE)
      expect(await trustService.getRole(newOwner)).equal(DSConstants.roles.MASTER)
    });
  });

  describe('Set Role flow', function () {
    it('Trying to call not by master or issuer', async function() {
      const [owner, unauthorized, wallet] = await hre.ethers.getSigners();
      const { trustService } = await loadFixture(deployDSTokenRegulated);
      const trustServiceFromUnauthorized = await trustService.connect(unauthorized);
      await expect(trustServiceFromUnauthorized.setRole(wallet, DSConstants.roles.ISSUER)).revertedWith('Not enough permissions');
    });

    it('Trying to set MASTER role for this account should be the error', async function() {
      const [owner, wallet] = await hre.ethers.getSigners();
      const { trustService } = await loadFixture(deployDSTokenRegulated);
      await expect(trustService.setRole(wallet, DSConstants.roles.MASTER)).revertedWith('Invalid target role');
    });

    it('Trying to remove the role - set NONE role - should be the error', async function() {
      const [owner] = await hre.ethers.getSigners();
      const { trustService } = await loadFixture(deployDSTokenRegulated);
      await expect(trustService.setRole(owner, DSConstants.roles.NONE)).revertedWith('Invalid target role');
    });

    it('Should set ISSUER role', async function() {
      const [owner, issuer] = await hre.ethers.getSigners();
      const { trustService } = await loadFixture(deployDSTokenRegulated);
      await expect(trustService.setRole(issuer, DSConstants.roles.ISSUER))
        .emit(trustService, 'DSTrustServiceRoleAdded').withArgs(issuer, DSConstants.roles.ISSUER, owner);
      expect(await trustService.getRole(issuer)).equal(DSConstants.roles.ISSUER);
    });

    it('Should set TransferAgent role', async function() {
      const [owner, transferAgent] = await hre.ethers.getSigners();
      const { trustService } = await loadFixture(deployDSTokenRegulated);
      await expect(trustService.setRole(transferAgent, DSConstants.roles.TRANSFER_AGENT))
        .emit(trustService, 'DSTrustServiceRoleAdded').withArgs(transferAgent, DSConstants.roles.TRANSFER_AGENT, owner);
      expect(await trustService.getRole(transferAgent)).equal(DSConstants.roles.TRANSFER_AGENT);
    });

    it('Should fail when trying to set issuer role from transfer agent account', async function() {
      const [owner, transferAgent, issuer] = await hre.ethers.getSigners();
      const { trustService } = await loadFixture(deployDSTokenRegulated);
      trustService.setRole(transferAgent, DSConstants.roles.TRANSFER_AGENT);
      const trustServiceFromTA = await trustService.connect(transferAgent);
      await expect(trustServiceFromTA.setRole(issuer, DSConstants.roles.ISSUER)).revertedWith('Not enough permissions');
    });

    // it('Should fail when trying to set transfer agent role from issuer account', async function() {
    //   const [owner, transferAgent, issuer] = await hre.ethers.getSigners();
    //   const { trustService } = await loadFixture(deployDSTokenRegulated);
    //   await expect(trustService.setRole(issuer, DSConstants.roles.ISSUER))
    //   const trustServiceFromIssuer = await trustService.connect(issuer);
    //   await expect(trustServiceFromIssuer.setRole(transferAgent, DSConstants.roles.TRANSFER_AGENT)).revertedWith('Not enough permissions. Only same role allowed');
    // });

    it('Should set EXCHANGE role', async function() {
      const [owner, exchange] = await hre.ethers.getSigners();
      const { trustService } = await loadFixture(deployDSTokenRegulated);
      await expect(trustService.setRole(exchange, DSConstants.roles.EXCHANGE))
        .emit(trustService, 'DSTrustServiceRoleAdded').withArgs(exchange, DSConstants.roles.EXCHANGE, owner);
      expect(await trustService.getRole(exchange)).equal(DSConstants.roles.EXCHANGE);
    });
  });

  describe('Should Bulk Roles flow', function () {
    it('Trying to call not by master or issuer', async function() {
      const [owner, unauthorized, wallet] = await hre.ethers.getSigners();
      const { trustService } = await loadFixture(deployDSTokenRegulated);
      const trustServiceFromUnauthorized = await trustService.connect(unauthorized);
      await expect(trustServiceFromUnauthorized.setRoles([wallet], [DSConstants.roles.ISSUER])).revertedWith('Not enough permissions');
    });

    it('Trying to set MASTER roles - should be the error', async function() {
      const [owner, wallet] = await hre.ethers.getSigners();
      const { trustService } = await loadFixture(deployDSTokenRegulated);
      await expect(trustService.setRoles([wallet], [DSConstants.roles.MASTER])).revertedWith('Invalid target role');
    });

    it('Trying to remove the role - set NONE role - should be the error', async function() {
      const [owner] = await hre.ethers.getSigners();
      const { trustService } = await loadFixture(deployDSTokenRegulated);
      await expect(trustService.setRoles([owner], [DSConstants.roles.NONE])).revertedWith('Invalid target role');
    });

    it('Trying set Issuer role in bulk mode and different roles length- should be the error', async function() {
      const [owner, wallet] = await hre.ethers.getSigners();
      const { trustService } = await loadFixture(deployDSTokenRegulated);
      await expect(trustService.setRoles([wallet], [DSConstants.roles.ISSUER, DSConstants.roles.ISSUER])).revertedWith('Wrong length of parameters');
    });

    it('Trying set Issuer role in bulk mode and different addresses length- should be the error', async function() {
      const [owner, wallet, wallet2] = await hre.ethers.getSigners();
      const { trustService } = await loadFixture(deployDSTokenRegulated);
      await expect(trustService.setRoles([wallet, wallet2], [DSConstants.roles.ISSUER])).revertedWith('Wrong length of parameters');
    });

    it('Trying set Issuer role in bulk mode for accounts 50 accounts - should be the error', async function () {
      const { trustService } = await loadFixture(deployDSTokenRegulated);
      const issuerWalletsToAdd = Array(50 + 1).fill(hre.ethers.Wallet.createRandom());
      const issuerRollesToAdd = Array(50 + 1).fill(DSConstants.roles.ISSUER);
      await expect(trustService.setRoles(issuerWalletsToAdd, issuerRollesToAdd)).revertedWith('Exceeded the maximum number of addresses');
    });

    it('Trying set Issuer role in bulk mode for accounts 50 accounts - should be the error', async function () {
      const [owner, issuer1, issuer2] = await hre.ethers.getSigners();
      const { trustService } = await loadFixture(deployDSTokenRegulated);

      await expect(trustService.setRoles([issuer1, issuer2], [DSConstants.roles.ISSUER, DSConstants.roles.ISSUER]))
        .emit(trustService, 'DSTrustServiceRoleAdded').withArgs(issuer1, DSConstants.roles.ISSUER, owner)
        .emit(trustService, 'DSTrustServiceRoleAdded').withArgs(issuer2, DSConstants.roles.ISSUER, owner);

      expect(await trustService.getRole(issuer1)).equal(DSConstants.roles.ISSUER);
      expect(await trustService.getRole(issuer2)).equal(DSConstants.roles.ISSUER);
    });

    it('Trying set Exchange role in bulk mode for accounts 50 accounts - should be the error', async function () {
      const [owner, exchange1, exchange2] = await hre.ethers.getSigners();
      const { trustService } = await loadFixture(deployDSTokenRegulated);

      await expect(trustService.setRoles([exchange1, exchange2], [DSConstants.roles.EXCHANGE, DSConstants.roles.EXCHANGE]))
        .emit(trustService, 'DSTrustServiceRoleAdded').withArgs(exchange1, DSConstants.roles.EXCHANGE, owner)
        .emit(trustService, 'DSTrustServiceRoleAdded').withArgs(exchange2, DSConstants.roles.EXCHANGE, owner);

      expect(await trustService.getRole(exchange1)).equal(DSConstants.roles.EXCHANGE);
      expect(await trustService.getRole(exchange2)).equal(DSConstants.roles.EXCHANGE);
    });
  });

  describe('Remove Role flow', function () {
    it('Trying to remove the role using EXCHANGE account - should be the error', async function () {
      const [owner, unauthorized, issuer] = await hre.ethers.getSigners();
      const { trustService } = await loadFixture(deployDSTokenRegulated);
      await trustService.setRole(issuer, DSConstants.roles.ISSUER)

      const trustServiceFromUnauthorized = await trustService.connect(unauthorized);
      await expect(trustServiceFromUnauthorized.removeRole(issuer)).revertedWith('Not enough permissions');
    });

    it('Should remove the role issuer using MASTER account', async function () {
      const [owner, issuer] = await hre.ethers.getSigners();
      const { trustService } = await loadFixture(deployDSTokenRegulated);
      await trustService.setRole(issuer, DSConstants.roles.ISSUER);

      await expect(trustService.removeRole(issuer)).emit(trustService, 'DSTrustServiceRoleRemoved').withArgs(issuer, DSConstants.roles.ISSUER, owner);
      expect(await trustService.getRole(issuer)).equal(DSConstants.roles.NONE);
    });

    it('Should remove the role issuer using ISSUER account', async function () {
      const [owner, issuer, issuer2] = await hre.ethers.getSigners();
      const { trustService } = await loadFixture(deployDSTokenRegulated);
      await trustService.setRole(issuer, DSConstants.roles.ISSUER);
      await trustService.setRole(issuer2, DSConstants.roles.ISSUER);

      const trustServiceFromIssuer = await trustService.connect(issuer);
      await expect(trustServiceFromIssuer.removeRole(issuer2)).emit(trustService, 'DSTrustServiceRoleRemoved').withArgs(issuer2, DSConstants.roles.ISSUER, issuer);
      expect(await trustService.getRole(issuer2)).equal(DSConstants.roles.NONE);
    });

  });
});
