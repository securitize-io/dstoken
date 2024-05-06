import hre from 'hardhat';
import { expect } from 'chai';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { attributeStatuses, attributeTypes, deployDSTokenRegulated, INVESTORS, TBE } from './utils/fixture';
import { DSConstants } from '../utils/globals';

describe('Registry Service Unit Tests', function() {
  describe('Register the new investor flow', function() {
    describe('Register investor', function() {
      it('Checking the role for the creator account - should be MASTER', async function() {
        const [owner] = await hre.ethers.getSigners();
        const { trustService } = await loadFixture(deployDSTokenRegulated);
        const role = await trustService.getRole(owner);
        expect(role).to.equal(DSConstants.roles.MASTER);
      });

      it('Should register the new investor', async function() {
        const [owner] = await hre.ethers.getSigners();
        const { registryService } = await loadFixture(deployDSTokenRegulated);
        await expect(
          registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1)
        ).to.emit(registryService, 'DSRegistryServiceInvestorAdded').withArgs(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, owner);
      });

      it('Trying to register an investor with empty id - should be an error', async function() {
        const { registryService } = await loadFixture(deployDSTokenRegulated);
        await expect(
          registryService.registerInvestor('', INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1)
        ).to.revertedWith('Investor id must not be empty');
      });

      it('Trying to register the same account twice - should be an error', async function() {
        const { registryService } = await loadFixture(deployDSTokenRegulated);
        await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1);
        await expect(
          registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1)
        ).revertedWith('Investor already exists');
      });

      it('Trying to register the new investor using an account with NONE permissions - should be an error', async function() {
        const [owner, unauthorizedWallet] = await hre.ethers.getSigners();
        const { registryService } = await loadFixture(deployDSTokenRegulated);
        const registryServiceFromUnauthorizedWallet = await registryService.connect(unauthorizedWallet);
        await expect(
          registryServiceFromUnauthorizedWallet.registerInvestor(
            INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1, INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1
          )
        ).to.revertedWith('Insufficient trust level');
      });
    });

    describe('SET | GET the country', function() {
      it('Should set the country for the investor', async function() {
        const [owner] = await hre.ethers.getSigners();
        const { registryService } = await loadFixture(deployDSTokenRegulated);
        await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1);
        await expect(
          registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA)
        ).to.emit(registryService, 'DSRegistryServiceInvestorCountryChanged').withArgs(
          INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA, owner
        );

        expect(
          await registryService.getCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1)
        ).to.equal(INVESTORS.Country.USA);
      });

      it('Trying to set the country using the account with NONE permissions - should be an error', async function() {
        const [owner, unauthorizedWallet] = await hre.ethers.getSigners();
        const { registryService } = await loadFixture(deployDSTokenRegulated);
        await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1);

        const registryServiceFromUnauthorizedWallet = await registryService.connect(unauthorizedWallet);
        await expect(
          registryServiceFromUnauthorizedWallet.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA)
        ).to.revertedWith('Insufficient trust level');
      });

      it('Trying to set the country for the investor with wrong ID - should be an error', async function() {
        const [owner] = await hre.ethers.getSigners();
        const { registryService } = await loadFixture(deployDSTokenRegulated);
        await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1);

        await expect(
          registryService.setCountry('unknown id', INVESTORS.Country.USA, owner)
        ).to.revertedWith('Unknown investor');
        expect(await registryService.getCountry('unknown id')).to.equal('');
      });
    });

    describe('Collision hash', function() {
      it('Trying to get the collision hash', async function() {
        const [owner] = await hre.ethers.getSigners();
        const { registryService } = await loadFixture(deployDSTokenRegulated);
        await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1);
        expect(await registryService.getCollisionHash(INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).to.equal(INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1);
      });

      it('Trying to get the collision hash for the investor with wrong ID - should be empty', async function() {
        const { registryService } = await loadFixture(deployDSTokenRegulated);
        expect(await registryService.getCollisionHash(INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_2)).to.equal('');
      });
    });

    describe('Attributes', function() {
      it('Trying to set and get the attributes', async function() {
        const [owner] = await hre.ethers.getSigners();
        const { registryService } = await loadFixture(deployDSTokenRegulated);
        await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1);

        for (const attributeType of attributeTypes) {
          for (const attributeStatus of attributeStatuses) {
            await expect(
              registryService.setAttribute(
                INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
                attributeType,
                attributeStatus,
                0,
                ''
              )
            ).to.emit(registryService, 'DSRegistryServiceInvestorAttributeChanged').withArgs(
              INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
              attributeType,
              attributeStatus,
              0,
              '',
              owner,
            );

            const value = await registryService.getAttributeValue(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, attributeType);
            expect(value).to.equal(attributeStatus);
          }
        }
      });

      it('Trying to set the attribute using the account with NONE permissions - should be an error', async function() {
        const [owner, unauthorizedWallet] = await hre.ethers.getSigners();
        const { registryService } = await loadFixture(deployDSTokenRegulated);
        await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1);

        const registryServiceFromUnauthorizedWallet = await registryService.connect(unauthorizedWallet);
        await expect(
          registryServiceFromUnauthorizedWallet.setAttribute(
            INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
            DSConstants.attributeType.KYC_APPROVED,
            DSConstants.attributeStatus.PENDING,
            0,
            ''
          )
        ).to.revertedWith('Insufficient trust level');
      });

      it('Trying to set the attribute for the investor with wrong ID - should be an error', async function() {
        const { registryService } = await loadFixture(deployDSTokenRegulated);

        await expect(
          registryService.setAttribute(
            INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
            DSConstants.attributeType.KYC_APPROVED,
            DSConstants.attributeStatus.PENDING,
            0,
            ''
          )
        ).to.revertedWith('Unknown investor');
        expect(await registryService.getAttributeValue(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, DSConstants.attributeType.KYC_APPROVED)).to.equal('');
      });
    });

    describe('Wallets', function () {
      it('Trying to add the wallet', async function () {
        const [owner, investor] = await hre.ethers.getSigners();
        const { registryService } = await loadFixture(deployDSTokenRegulated);
        await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1);
        await expect(
          registryService.addWallet(investor, INVESTORS.INVESTOR_ID.INVESTOR_ID_1)
        ).to.emit(registryService, 'DSRegistryServiceWalletAdded').withArgs(investor, INVESTORS.INVESTOR_ID.INVESTOR_ID_1, owner);
      });

      it('Trying to remove the wallet with MASTER permissions', async function () {
        const [owner, investor] = await hre.ethers.getSigners();
        const { registryService } = await loadFixture(deployDSTokenRegulated);
        await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1);
        await registryService.addWallet(investor, INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
        await expect(
          registryService.removeWallet(investor, INVESTORS.INVESTOR_ID.INVESTOR_ID_1)
        ).to.emit(registryService, 'DSRegistryServiceWalletRemoved').withArgs(investor, INVESTORS.INVESTOR_ID.INVESTOR_ID_1, owner);
      });

      it('Trying to remove the wallet with ISSUER permissions', async function () {
        const [owner, issuer, investor] = await hre.ethers.getSigners();
        const { registryService, trustService } = await loadFixture(deployDSTokenRegulated);
        await trustService.setRole(issuer, DSConstants.roles.ISSUER);
        const registryServiceFromIssuer = await registryService.connect(issuer);
        await registryServiceFromIssuer.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1);
        await registryServiceFromIssuer.addWallet(investor, INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
        await expect(
          registryServiceFromIssuer.removeWallet(investor, INVESTORS.INVESTOR_ID.INVESTOR_ID_1)
        ).to.emit(registryService, 'DSRegistryServiceWalletRemoved').withArgs(investor, INVESTORS.INVESTOR_ID.INVESTOR_ID_1, issuer);
      });

      it('Trying to remove the wallet with Exchange permissions', async function () {
        const [owner, exchange, investor] = await hre.ethers.getSigners();
        const { registryService, trustService } = await loadFixture(deployDSTokenRegulated);
        await trustService.setRole(exchange, DSConstants.roles.EXCHANGE);
        const registryServiceFromExchange = await registryService.connect(exchange);
        await registryServiceFromExchange.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1);
        await registryServiceFromExchange.addWallet(investor, INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
        await expect(
          registryServiceFromExchange.removeWallet(investor, INVESTORS.INVESTOR_ID.INVESTOR_ID_1)
        ).to.emit(registryService, 'DSRegistryServiceWalletRemoved').withArgs(investor, INVESTORS.INVESTOR_ID.INVESTOR_ID_1, exchange);
      });

      it('Trying to add the wallet with NONE permissions', async function () {
        const [owner, unauthorized, investor] = await hre.ethers.getSigners();
        const { registryService } = await loadFixture(deployDSTokenRegulated);
        const registryServiceFromUnauthorized = await registryService.connect(unauthorized);
        await expect(
          registryServiceFromUnauthorized.addWallet(investor, INVESTORS.INVESTOR_ID.INVESTOR_ID_1)
        ).to.revertedWith('Insufficient trust level')
      });

      it('Trying to add the same wallet - should be an error', async function () {
        const [investor] = await hre.ethers.getSigners();
        const { registryService } = await loadFixture(deployDSTokenRegulated);
        await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1);
        await registryService.addWallet(investor, INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
        await expect(registryService.addWallet(investor, INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).to.revertedWith('Wallet already exists');
      });

      it('Trying to remove the wallet from the investor that does not exist - should be an error', async function () {
        const [investor] = await hre.ethers.getSigners();
        const { registryService } = await loadFixture(deployDSTokenRegulated);
        await expect(registryService.removeWallet(investor, INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).to.revertedWith('Unknown wallet');
      });

      it('Trying to remove the wallet with the wrong investor - should be an error', async function () {
        const [investor] = await hre.ethers.getSigners();
        const { registryService } = await loadFixture(deployDSTokenRegulated);
        await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1);
        await registryService.addWallet(investor, INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
        await expect(registryService.removeWallet(investor, INVESTORS.INVESTOR_ID.INVESTOR_ID_2)).to.revertedWith('Wallet does not belong to investor');
      });

      it('Trying to remove the wallet that does not exist - should be an error', async function () {
        const [investor] = await hre.ethers.getSigners();
        const { registryService } = await loadFixture(deployDSTokenRegulated);
        await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1);
        await expect(registryService.removeWallet(investor, INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).to.revertedWith('Unknown wallet');
      });

      it('Trying to remove the wallet by an exchange which did not create it - should be an error', async function () {
        const [owner, exchange, investor] = await hre.ethers.getSigners();
        const { registryService, trustService } = await loadFixture(deployDSTokenRegulated);
        await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1);
        await registryService.addWallet(investor, INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
        await trustService.setRole(exchange, DSConstants.roles.EXCHANGE);
        const registryServiceFromExchange = await registryService.connect(exchange);
        await expect(registryServiceFromExchange.removeWallet(investor, INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).to.revertedWith('Insufficient permissions');
      });

      it('Trying to remove the wallet by a wallet without permissions - should be the error', async function () {
        const [owner, unauthorized, investor] = await hre.ethers.getSigners();
        const { registryService } = await loadFixture(deployDSTokenRegulated);
        await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1);
        await registryService.addWallet(investor, INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
        const registryServiceFromUnauthorized = await registryService.connect(unauthorized);
        await expect(registryServiceFromUnauthorized.removeWallet(investor, INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).to.revertedWith('Insufficient trust level');
      });
    });

    describe('Wallet By Investor', function () {
      it('Trying to add the wallet by Investor with own wallet', async function () {
        const [owner, investor, investorWallet2] = await hre.ethers.getSigners();
        const { registryService } = await loadFixture(deployDSTokenRegulated);
        await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1);
        await registryService.addWallet(investor, INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
        const registryServiceFromInvestor = await registryService.connect(investor);
        await registryServiceFromInvestor.addWalletByInvestor(investorWallet2);
        expect(await registryService.getInvestor(investorWallet2)).to.equal(INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
      });

      it('Trying to add the wallet by Investor with own wallet twice - Wallet already exists', async function () {
        const [owner, investor, investorWallet2] = await hre.ethers.getSigners();
        const { registryService } = await loadFixture(deployDSTokenRegulated);
        await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1);
        await registryService.addWallet(investor, INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
        const registryServiceFromInvestor = await registryService.connect(investor);
        await registryServiceFromInvestor.addWalletByInvestor(investorWallet2);
        await expect(registryServiceFromInvestor.addWalletByInvestor(investorWallet2)).to.revertedWith('Wallet already exists');
      });

      it('Trying to add the wallet by Investor with unknown wallet - Unknown investor', async function () {
        const [owner, investor] = await hre.ethers.getSigners();
        const { registryService } = await loadFixture(deployDSTokenRegulated);
        await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1);
        const registryServiceFromInvestor = await registryService.connect(investor);
        await expect(registryServiceFromInvestor.addWalletByInvestor(investor)).to.revertedWith('Unknown investor');
      });
    });

    describe('Get the investor', function () {
      it('Trying to get the investor', async function () {
        const [investor] = await hre.ethers.getSigners();
        const { registryService } = await loadFixture(deployDSTokenRegulated);
        await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1);
        await registryService.addWallet(investor, INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
        expect(await registryService.getInvestor(investor)).to.equal(INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
      });

      it('Trying to get the investor details', async function () {
        const [investor] = await hre.ethers.getSigners();
        const { registryService } = await loadFixture(deployDSTokenRegulated);
        await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA)
        await registryService.addWallet(investor, INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
        const investorDetails = await registryService.getInvestorDetails(investor);
        expect(investorDetails[0]).to.equal(INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
        expect(investorDetails[1]).to.equal(INVESTORS.Country.USA);
      });

      it('Trying to get the investor using the wrong Wallet - should be empty', async function () {
        const [investor] = await hre.ethers.getSigners();
        const { registryService } = await loadFixture(deployDSTokenRegulated);
        expect(await registryService.getInvestor(investor)).to.equal('');
      });

      it('Trying to get the investor details using the wrong Wallet - should be empty', async function () {
        const [investor] = await hre.ethers.getSigners();
        const { registryService } = await loadFixture(deployDSTokenRegulated);
        const investorDetails = await registryService.getInvestorDetails(investor);
        expect(investorDetails).to.deep.equal(['', '']);
      });
    });
  });
});
