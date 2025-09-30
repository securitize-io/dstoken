import hre from 'hardhat';
import { expect } from 'chai';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { attributeStatuses, attributeTypes, deployDSTokenRegulated, INVESTORS } from './utils/fixture';
import { DSConstants } from '../utils/globals';

describe('Registry Service Unit Tests', function() {
  describe('Creation', function() {
    it('Should fail when trying to re initialize', async function() {
      const { registryService } = await loadFixture(deployDSTokenRegulated);
      await expect(registryService.initialize()).revertedWithCustomError(registryService, 'InvalidInitialization');
    });

    it('Should get version correctly', async function() {
      const { registryService } = await loadFixture(deployDSTokenRegulated);
      expect( await registryService.getInitializedVersion()).to.equal(1);
    });

    it('Should get implementation address correctly', async function() {
      const { registryService } = await loadFixture(deployDSTokenRegulated);
      expect( await registryService.getImplementationAddress()).to.be.exist;
    });

    it('SHOULD fail when trying to initialize implementation contract directly', async () => {
      const implementation = await hre.ethers.deployContract('RegistryService');
      await expect(implementation.initialize()).to.revertedWithCustomError(implementation, 'UUPSUnauthorizedCallContext');
    });
  });

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
        expect(await registryService.isInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).to.equal(true);
      });

      it('Should register the new full investor', async function() {
        const [owner, investor] = await hre.ethers.getSigners();
        const { registryService } = await loadFixture(deployDSTokenRegulated);
        await expect(
          registryService.updateInvestor(
            INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
            INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1,
            INVESTORS.Country.USA,
            [investor],
            [1, 2, 4],
            [1, 1, 1],
            [0, 0, 0]
          )
        ).to.emit(registryService, 'DSRegistryServiceInvestorAdded').withArgs(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, owner);
        expect(await registryService.isInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).to.equal(true);
        expect(await registryService.isWallet(investor)).to.equal(true);
        expect(await registryService['isAccreditedInvestor(address)'](investor)).to.equal(true);
        expect(await registryService['isAccreditedInvestor(string)'](INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).to.equal(true);
        expect(await registryService['isQualifiedInvestor(address)'](investor)).to.equal(true);
        expect(await registryService['isQualifiedInvestor(string)'](INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).to.equal(true);
        const details = await registryService.getInvestorDetailsFull(INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
        expect(details[0]).to.equal(INVESTORS.Country.USA);
        expect(details[1][0]).to.equal(1);
        expect(details[1][1]).to.equal(1);
        expect(details[1][2]).to.equal(1);
        expect(details[1][3]).to.equal(0);
        expect(details[2][0]).to.equal(0);
        expect(details[2][1]).to.equal(0);
        expect(details[2][2]).to.equal(0);
        expect(details[3]).to.equal('');
        expect(details[4]).to.equal('');
        expect(details[5]).to.equal('');
      });

      it('Should fail trying to register a new full investor because wallet already exists', async function() {
        const [owner, investor] = await hre.ethers.getSigners();
        const { registryService } = await loadFixture(deployDSTokenRegulated);
        await registryService.updateInvestor(
          INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
          INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1,
          INVESTORS.Country.USA,
          [investor],
          [1, 2, 4],
          [1, 1, 1],
          [0, 0, 0]
        );
        await expect(registryService.updateInvestor(
          INVESTORS.INVESTOR_ID.INVESTOR_ID_2,
          INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1,
          INVESTORS.Country.USA,
          [investor],
          [1, 2, 4],
          [1, 1, 1],
          [0, 0, 0]
        )).revertedWith('Wallet belongs to a different investor');
      });

      it('Should update the investor', async function() {
        const [owner, investor] = await hre.ethers.getSigners();
        const { registryService } = await loadFixture(deployDSTokenRegulated);
        await registryService.updateInvestor(
          INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
          INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1,
          INVESTORS.Country.USA,
          [investor],
          [1, 2, 4],
          [1, 1, 1],
          [0, 0, 0]
        );
        await registryService.updateInvestor(
          INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
          INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1,
          INVESTORS.Country.GERMANY,
          [investor],
          [1, 2, 4],
          [1, 1, 1],
          [0, 0, 0]
        );
        const details = await registryService.getInvestorDetailsFull(INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
        expect(details[0]).to.equal(INVESTORS.Country.GERMANY);
      });

      it('Should remove an investor', async function() {
        const [owner] = await hre.ethers.getSigners();
        const { registryService } = await loadFixture(deployDSTokenRegulated);
        await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1);
        await expect(
          registryService.removeInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1)
        ).to.emit(registryService, 'DSRegistryServiceInvestorRemoved').withArgs(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, owner);
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

      it('Trying to register the new full investor using an account with NONE permissions - should be an error', async function() {
        const [owner, unauthorizedWallet, investor] = await hre.ethers.getSigners();
        const { registryService } = await loadFixture(deployDSTokenRegulated);
        const registryServiceFromUnauthorizedWallet = await registryService.connect(unauthorizedWallet);
        await expect(
          registryServiceFromUnauthorizedWallet.updateInvestor(
            INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
            INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1,
            INVESTORS.Country.USA,
            [investor],
            [1, 2, 4],
            [1, 1, 1],
            [0, 0, 0]
          )
        ).to.revertedWith('Insufficient trust level');
      });

      it('Trying to remove the new investor using an account with NONE permissions - should be an error', async function() {
        const [owner, unauthorizedWallet] = await hre.ethers.getSigners();
        const { registryService } = await loadFixture(deployDSTokenRegulated);
        await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1);
        const registryServiceFromUnauthorizedWallet = await registryService.connect(unauthorizedWallet);
        await expect(registryServiceFromUnauthorizedWallet.removeInvestor(INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1)).to.revertedWith('Insufficient trust level');
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
          INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA, owner,
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

      it('Changing to the same country does not inflate investor count', async function() {
        const [wallet] = await hre.ethers.getSigners();
        const { dsToken, registryService, complianceConfigurationService, complianceService } = await loadFixture(deployDSTokenRegulated);

        // Setup
        await complianceConfigurationService.setCountryCompliance(INVESTORS.Country.USA, INVESTORS.Compliance.US);

        await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1);
        registryService.addWallet(wallet, INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
        await registryService.setAttribute(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, 2, 1, 0, ''); // Make accredited

        // Set initial country and issue tokens
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
        await dsToken.setCap(1000);
        await dsToken.issueTokens(wallet, 100);

        // Verify initial state: 1 US investor
        expect(await complianceService.getUSInvestorsCount()).to.equal(1);

        // Change country from USA to USA
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
        expect(await complianceService.getUSInvestorsCount()).to.equal(1);
      });

      it('Country change decreases previous country counter', async function() {
        const [wallet] = await hre.ethers.getSigners();
        const { dsToken, registryService, complianceConfigurationService, complianceService } = await loadFixture(deployDSTokenRegulated);

        // Setup
        await complianceConfigurationService.setCountryCompliance(INVESTORS.Country.USA, INVESTORS.Compliance.US);
        await complianceConfigurationService.setCountryCompliance(INVESTORS.Country.JAPAN, INVESTORS.Compliance.JP);

        await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1);
        registryService.addWallet(wallet, INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
        await registryService.setAttribute(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, 2, 1, 0, ''); // Make accredited

        // Set initial country and issue tokens
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
        await dsToken.setCap(1000);
        await dsToken.issueTokens(wallet, 100);

        // Verify initial state: 1 US investor
        expect(await complianceService.getUSInvestorsCount()).to.equal(1);
        expect(await complianceService.getJPInvestorsCount()).to.equal(0);

        // Change country from USA to JAPAN
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.JAPAN);

        // VULNERABILITY: Both countries now count the same investor
        expect(await complianceService.getUSInvestorsCount()).to.equal(0); // Should be 0
        expect(await complianceService.getJPInvestorsCount()).to.equal(1); // Should be 1
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
              owner
            );

            expect(await registryService.getAttributeValue(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, attributeType)).to.equal(attributeStatus);
            expect(await registryService.getAttributeExpiry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, DSConstants.attributeType.KYC_APPROVED)).to.equal(0);
            expect(await registryService.getAttributeProofHash(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, DSConstants.attributeType.KYC_APPROVED)).to.equal('');
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

    describe('Wallets', function() {
      it('Trying to add the wallet', async function() {
        const [owner, investor] = await hre.ethers.getSigners();
        const { registryService } = await loadFixture(deployDSTokenRegulated);
        await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1);
        await expect(
          registryService.addWallet(investor, INVESTORS.INVESTOR_ID.INVESTOR_ID_1)
        ).to.emit(registryService, 'DSRegistryServiceWalletAdded').withArgs(investor, INVESTORS.INVESTOR_ID.INVESTOR_ID_1, owner);
        expect(await registryService.isWallet(investor)).to.equal(true);
        expect(await registryService['isAccreditedInvestor(address)'](investor)).to.equal(false);
        expect(await registryService['isAccreditedInvestor(string)'](INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).to.equal(false);
        expect(await registryService['isQualifiedInvestor(address)'](investor)).to.equal(false);
        expect(await registryService['isQualifiedInvestor(string)'](INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).to.equal(false);
      });

      it('Trying to remove the wallet with MASTER permissions', async function() {
        const [owner, investor] = await hre.ethers.getSigners();
        const { registryService } = await loadFixture(deployDSTokenRegulated);
        await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1);
        await registryService.addWallet(investor, INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
        await expect(
          registryService.removeWallet(investor, INVESTORS.INVESTOR_ID.INVESTOR_ID_1)
        ).to.emit(registryService, 'DSRegistryServiceWalletRemoved').withArgs(investor, INVESTORS.INVESTOR_ID.INVESTOR_ID_1, owner);
      });

      it('Trying to remove the wallet with ISSUER permissions', async function() {
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

      it('Trying to remove the wallet with Exchange permissions', async function() {
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

      it('Trying to add the wallet with NONE permissions', async function() {
        const [owner, unauthorized, investor] = await hre.ethers.getSigners();
        const { registryService } = await loadFixture(deployDSTokenRegulated);
        const registryServiceFromUnauthorized = await registryService.connect(unauthorized);
        await expect(
          registryServiceFromUnauthorized.addWallet(investor, INVESTORS.INVESTOR_ID.INVESTOR_ID_1)
        ).to.revertedWith('Insufficient trust level');
      });

      it('Trying to add the same wallet - should be an error', async function() {
        const [investor] = await hre.ethers.getSigners();
        const { registryService } = await loadFixture(deployDSTokenRegulated);
        await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1);
        await registryService.addWallet(investor, INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
        await expect(registryService.addWallet(investor, INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).to.revertedWith('Wallet already exists');
      });

      it('Trying to remove the wallet from the investor that does not exist - should be an error', async function() {
        const [investor] = await hre.ethers.getSigners();
        const { registryService } = await loadFixture(deployDSTokenRegulated);
        await expect(registryService.removeWallet(investor, INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).to.revertedWith('Unknown wallet');
      });

      it('Trying to remove the wallet with the wrong investor - should be an error', async function() {
        const [investor] = await hre.ethers.getSigners();
        const { registryService } = await loadFixture(deployDSTokenRegulated);
        await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1);
        await registryService.addWallet(investor, INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
        await expect(registryService.removeWallet(investor, INVESTORS.INVESTOR_ID.INVESTOR_ID_2)).to.revertedWith('Wallet does not belong to investor');
      });

      it('Trying to remove the wallet that does not exist - should be an error', async function() {
        const [investor] = await hre.ethers.getSigners();
        const { registryService } = await loadFixture(deployDSTokenRegulated);
        await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1);
        await expect(registryService.removeWallet(investor, INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).to.revertedWith('Unknown wallet');
      });

      it('Trying to remove the wallet by an exchange which did not create it - should be an error', async function() {
        const [owner, exchange, investor] = await hre.ethers.getSigners();
        const { registryService, trustService } = await loadFixture(deployDSTokenRegulated);
        await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1);
        await registryService.addWallet(investor, INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
        await trustService.setRole(exchange, DSConstants.roles.EXCHANGE);
        const registryServiceFromExchange = await registryService.connect(exchange);
        await expect(registryServiceFromExchange.removeWallet(investor, INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).to.revertedWith('Insufficient permissions');
      });

      it('Trying to remove the wallet by a wallet without permissions - should be the error', async function() {
        const [owner, unauthorized, investor] = await hre.ethers.getSigners();
        const { registryService } = await loadFixture(deployDSTokenRegulated);
        await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1);
        await registryService.addWallet(investor, INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
        const registryServiceFromUnauthorized = await registryService.connect(unauthorized);
        await expect(registryServiceFromUnauthorized.removeWallet(investor, INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).to.revertedWith('Insufficient trust level');
      });
    });


    describe('Get the investor', function() {
      it('Trying to get the investor', async function() {
        const [investor] = await hre.ethers.getSigners();
        const { registryService } = await loadFixture(deployDSTokenRegulated);
        await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1);
        await registryService.addWallet(investor, INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
        expect(await registryService.getInvestor(investor)).to.equal(INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
      });

      it('Trying to get the investor details', async function() {
        const [investor] = await hre.ethers.getSigners();
        const { registryService } = await loadFixture(deployDSTokenRegulated);
        await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.INVESTOR_ID.INVESTOR_COLLISION_HASH_1);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
        await registryService.addWallet(investor, INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
        const investorDetails = await registryService.getInvestorDetails(investor);
        expect(investorDetails[0]).to.equal(INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
        expect(investorDetails[1]).to.equal(INVESTORS.Country.USA);
      });

      it('Trying to get the investor using the wrong Wallet - should be empty', async function() {
        const [investor] = await hre.ethers.getSigners();
        const { registryService } = await loadFixture(deployDSTokenRegulated);
        expect(await registryService.getInvestor(investor)).to.equal('');
      });

      it('Trying to get the investor details using the wrong Wallet - should be empty', async function() {
        const [investor] = await hre.ethers.getSigners();
        const { registryService } = await loadFixture(deployDSTokenRegulated);
        const investorDetails = await registryService.getInvestorDetails(investor);
        expect(investorDetails).to.deep.equal(['', '']);
      });
    });
  });
});
