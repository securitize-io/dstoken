import { expect } from 'chai';
import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import hre from 'hardhat';
import { deployDSTokenRegulated, deployDSTokenRegulatedWithRebasing, deployDSTokenRegulatedWithRebasingAndEighteenDecimal, deployDSTokenRegulatedWithRebasingAndSixDecimal, INVESTORS } from './utils/fixture';
import { registerInvestor } from './utils/test-helper';

describe('DS Token Regulated Unit Tests', function() {
  describe('Creation', function() {
    it('Should get the basic details of the token correctly', async function() {
      const { dsToken } = await loadFixture(deployDSTokenRegulated);
      expect(await dsToken.name()).equal('Token Example 1');
      expect(await dsToken.symbol()).equal('TX1');
      expect(await dsToken.decimals()).equal(2);
      expect(await dsToken.totalSupply()).equal(0);
    });

    it('Should fail when trying to initialize twice', async function() {
      const { dsToken } = await loadFixture(deployDSTokenRegulated);
      await expect(dsToken.initialize('TX1', 'TX1', 6)).revertedWithCustomError(dsToken, 'InvalidInitialization');
    });

    it('Should get version correctly', async function() {
      const { dsToken } = await loadFixture(deployDSTokenRegulated);
      expect( await dsToken.getInitializedVersion()).to.equal(1);
    });

    it('Should get implementation address correctly', async function() {
      const { dsToken } = await loadFixture(deployDSTokenRegulated);
      expect( await dsToken.getImplementationAddress()).to.be.exist;
    });

    it('SHOULD fail when trying to initialize implementation contract directly', async () => {
      const TokenLibrary = await hre.ethers.deployContract('TokenLibrary');
      const DSTokenFactory = await hre.ethers.getContractFactory('DSToken', {
        libraries: {
          TokenLibrary: TokenLibrary.target
        }
      });
      const implementation = await DSTokenFactory.deploy();
      await expect(implementation.initialize('Test', 'TST', 18))
        .to.revertedWithCustomError(implementation, 'UUPSUnauthorizedCallContext');
    });
  });

  describe('Ownership', function() {
    it('Should allow to transfer ownership and return the correct owner address', async function() {
      const [owner, newOwner] = await hre.ethers.getSigners();
      const { dsToken } = await loadFixture(deployDSTokenRegulated);
      await dsToken.transferOwnership(newOwner);

      expect(await dsToken.owner()).equal(newOwner);
    });
  });

  describe('Features flag', function() {
    it('Should enable/disable features correctly', async function() {
      const { dsToken } = await loadFixture(deployDSTokenRegulated);
      expect(await dsToken.supportedFeatures()).equal(0);

      await dsToken.setFeature(20, true);
      expect(await dsToken.supportedFeatures()).equal(Math.pow(2, 20));

      await dsToken.setFeature(20, false);
      expect(await dsToken.supportedFeatures()).equal(0);

      await dsToken.setFeature(31, true);
      await dsToken.setFeature(32, true);
      expect(await dsToken.supportedFeatures()).equal(Math.pow(2, 31) + Math.pow(2, 32));
    });

    it('Should set features member correctly', async function () {
      const { dsToken } = await loadFixture(deployDSTokenRegulated);
      expect(await dsToken.supportedFeatures()).equal(0);

      await dsToken.setFeatures(Math.pow(2, 31));
      expect(await dsToken.supportedFeatures()).equal(Math.pow(2, 31));
    });
  });

  describe('Cap', function () {
    it('Cannot be set twice', async function () {
      const { dsToken } = await loadFixture(deployDSTokenRegulated);
      await dsToken.setCap(1000);
      await expect(dsToken.setCap(1000)).revertedWith('Token cap already set');
    });

    it('Does not prevent issuing tokens within limit', async function () {
      const [investor] = await hre.ethers.getSigners();
      const { dsToken, registryService } = await loadFixture(deployDSTokenRegulated);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await dsToken.setCap(1000);
      await dsToken.issueTokens(investor, 500);
      await dsToken.issueTokens(investor, 500);
      expect(await dsToken.balanceOf(investor)).equal(1000);
    })

    it('Prevents issuing too many tokens', async function () {
      const [investor] = await hre.ethers.getSigners();
      const { dsToken, registryService } = await loadFixture(deployDSTokenRegulated);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await dsToken.setCap(10);
      await expect(dsToken.issueTokens(investor, 500)).revertedWith('Token Cap Hit');
    });
  });

  describe('Issuance', function () {
    it('Should issue tokens to a us wallet', async function () {
      const [investor] = await hre.ethers.getSigners();
      const { dsToken, registryService } = await loadFixture(deployDSTokenRegulated);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
      await dsToken.issueTokens(investor, 500);
      expect(await dsToken.balanceOf(investor)).equal(500);
    });

    it('Should issue tokens to a eu wallet', async function () {
      const [investor] = await hre.ethers.getSigners();
      const { dsToken, registryService } = await loadFixture(deployDSTokenRegulated);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.FRANCE);
      await dsToken.issueTokens(investor, 500);
      expect(await dsToken.balanceOf(investor)).equal(500);
    });

    it('Should not issue tokens to a forbidden wallet', async function () {
      const [investor] = await hre.ethers.getSigners();
      const { dsToken, registryService, complianceConfigurationService } = await loadFixture(deployDSTokenRegulated);
      await complianceConfigurationService.setCountryCompliance(INVESTORS.Country.CHINA, INVESTORS.Compliance.FORBIDDEN);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.CHINA);
      await expect(dsToken.issueTokens(investor, 500)).revertedWith('Destination restricted');
    });

    it('Should record the number of total issued token correctly', async function () {
      const [investor, investor2] = await hre.ethers.getSigners();
      const { dsToken, registryService } = await loadFixture(deployDSTokenRegulated);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.FRANCE);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, INVESTORS.Country.USA);
      await dsToken.issueTokens(investor, 500);
      await dsToken.issueTokens(investor2, 500);
      await dsToken.issueTokens(investor, 500);
      await dsToken.issueTokens(investor2, 500);
      expect(await dsToken.totalIssued()).equal(2000);
    });

    it('Should emit TxShares event on issuance', async function () {
      const [investor] = await hre.ethers.getSigners();
      const { dsToken, registryService, rebasingProvider } = await loadFixture(deployDSTokenRegulated);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);

      const valueToIssue = 500;
      const shares = await rebasingProvider.convertTokensToShares(valueToIssue);
      const multiplier = await rebasingProvider.multiplier();

      await expect(dsToken.issueTokens(investor, valueToIssue))
        .to.emit(dsToken, 'TxShares')
        .withArgs(hre.ethers.ZeroAddress, investor.address, shares, multiplier);
    });
  });

  describe('Issuance with no compliance', function () {
    it('Should issue tokens to a eu wallet (no compliance)', async function () {
      const [investor] = await hre.ethers.getSigners();
      const { dsToken, registryService } = await loadFixture(deployDSTokenRegulated);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.FRANCE);
      await dsToken.issueTokensWithNoCompliance(investor, 500);
      expect(await dsToken.balanceOf(investor)).equal(500);
    });

    it('Should issue tokens to a forbidden wallet (no compliance)', async function () {
      const [investor] = await hre.ethers.getSigners();
      const { dsToken, registryService, complianceConfigurationService } = await loadFixture(deployDSTokenRegulated);
      await complianceConfigurationService.setCountryCompliance(INVESTORS.Country.CHINA, INVESTORS.Compliance.FORBIDDEN);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.CHINA);
      await dsToken.issueTokensWithNoCompliance(investor, 500);
      expect(await dsToken.balanceOf(investor)).equal(500);
    });
  });

  describe('Transfer', function () {
    it('Should emit TxShares event on transfer', async function () {
      const [investor, investor2] = await hre.ethers.getSigners();
      const { dsToken, registryService, rebasingProvider } = await loadFixture(deployDSTokenRegulated);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);
      await dsToken.issueTokens(investor, 500);

      const valueToTransfer = 100;
      const shares = await rebasingProvider.convertTokensToShares(valueToTransfer);
      const multiplier = await rebasingProvider.multiplier();

      const dsTokenFromInvestor = await dsToken.connect(investor);
      await expect(dsTokenFromInvestor.transfer(investor2, valueToTransfer))
        .to.emit(dsToken, 'TxShares')
        .withArgs(investor.address, investor2.address, shares, multiplier);
    });
  });

  describe('Locking', async function () {
    it('Should not allow transferring any tokens when all locked', async function () {
      const [investor, investor2] = await hre.ethers.getSigners();
      const { dsToken, registryService } = await loadFixture(deployDSTokenRegulated);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
      await dsToken.issueTokensCustom(investor, 500, await time.latest(), 500, 'TEST', await time.latest() + 1000);

      const dsTokenFromInvestor = await dsToken.connect(investor);
      await expect(dsTokenFromInvestor.transfer(investor2, 500)).revertedWith('Tokens locked');
    });

    it('Should ignore issuance time if token has disallowBackDating set to true and allow transferring', async function () {
      const [investor, investor2] = await hre.ethers.getSigners();
      const { dsToken, complianceConfigurationService, registryService, complianceService } = await loadFixture(deployDSTokenRegulated);
      await complianceConfigurationService.setDisallowBackDating(true);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);
      const issuanceTime = await time.latest();
      await dsToken.issueTokensCustom(investor, 100, issuanceTime + 10000, 0, 'TEST', 0);
      expect(await dsToken.balanceOf(investor)).equal(100);
      expect(await complianceService.getComplianceTransferableTokens(investor, await time.latest(), 0)).equal(100);

      const dsTokenFromInvestor = await dsToken.connect(investor);
      await dsTokenFromInvestor.transfer(investor2, 100);
      expect(await dsToken.balanceOf(investor)).equal(0);
      expect(await dsToken.balanceOf(investor2)).equal(100);
    });

    it('Should allow transferring tokens when other are locked', async function () {
      const [investor, investor2] = await hre.ethers.getSigners();
      const { dsToken, registryService } = await loadFixture(deployDSTokenRegulated);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
      await dsToken.issueTokensCustom(investor, 500, await time.latest(), 200, 'TEST', await time.latest() + 1000);

      const dsTokenFromInvestor = await dsToken.connect(investor);
      await dsTokenFromInvestor.transfer(investor2, 300);
      expect(await dsToken.balanceOf(investor)).equal(200);
      expect(await dsToken.balanceOf(investor2)).equal(300);
    });

    it('Should allow transferring tokens when other are locked', async function () {
      const [investor, anotherWallet] = await hre.ethers.getSigners();
      const { dsToken, registryService } = await loadFixture(deployDSTokenRegulated);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await registryService.addWallet(anotherWallet, INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
      await dsToken.issueTokensCustom(investor, 500, await time.latest(), 500, 'TEST', await time.latest() + 1000);

      const dsTokenFromInvestor = await dsToken.connect(investor);
      await dsTokenFromInvestor.transfer(anotherWallet, 300);
      expect(await dsToken.balanceOf(investor)).equal(200);
      expect(await dsToken.balanceOf(anotherWallet)).equal(300);
    });
  });

  describe('Burn', function () {
    it('Should burn tokens from a specific wallet', async function () {
      const [investor] = await hre.ethers.getSigners();
      const { dsToken, registryService } = await loadFixture(deployDSTokenRegulated);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await dsToken.issueTokens(investor, 500);
      await dsToken.burn(investor, 50, 'test burn');
      expect(await dsToken.balanceOf(investor)).equal(450);
      expect(await dsToken.totalIssued()).equal(500);
    });

    it('Should emit TxShares event on burn', async function () {
      const [investor] = await hre.ethers.getSigners();
      const { dsToken, registryService, rebasingProvider } = await loadFixture(deployDSTokenRegulated);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await dsToken.issueTokens(investor, 500);

      const valueToBurn = 50;
      const shares = await rebasingProvider.convertTokensToShares(valueToBurn);
      const multiplier = await rebasingProvider.multiplier();

      await expect(dsToken.burn(investor, valueToBurn, 'test burn'))
        .to.emit(dsToken, 'TxShares')
        .withArgs(investor.address, hre.ethers.ZeroAddress, shares, multiplier);
    });
  });

  describe('Seize', function () {
    it('Should seize tokens correctly', async function () {
      const [investor, issuer] = await hre.ethers.getSigners();
      const { dsToken, registryService, walletManager } = await loadFixture(deployDSTokenRegulated);
      await walletManager.addIssuerWallet(issuer)
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await dsToken.issueTokens(investor, 500);
      await dsToken.seize(investor, issuer, 50, 'test burn');
      expect(await dsToken.balanceOf(investor)).equal(450);
      expect(await dsToken.balanceOf(issuer)).equal(50);
      expect(await dsToken.totalIssued()).equal(500);
    });

    it('Should emit TxShares event on seize', async function () {
      const [investor, issuer] = await hre.ethers.getSigners();
      const { dsToken, registryService, walletManager, rebasingProvider } = await loadFixture(deployDSTokenRegulated);
      await walletManager.addIssuerWallet(issuer);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await dsToken.issueTokens(investor, 500);

      const valueToSeize = 50;
      const shares = await rebasingProvider.convertTokensToShares(valueToSeize);
      const multiplier = await rebasingProvider.multiplier();

      await expect(dsToken.seize(investor, issuer, valueToSeize, 'test seize'))
        .to.emit(dsToken, 'TxShares')
        .withArgs(investor.address, issuer.address, shares, multiplier);
    });

    it('Cannot seize more than balance', async function () {
      const [investor, issuer] = await hre.ethers.getSigners();
      const { dsToken, registryService, walletManager } = await loadFixture(deployDSTokenRegulated);
      await walletManager.addIssuerWallet(issuer)
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await dsToken.issueTokens(investor, 500);
      await expect(dsToken.seize(investor, issuer, 550, 'test burn')).revertedWith('Not enough balance');
    });
  });

  describe('DS Token Regulated with Rebasing 1500000000000000000 and 2 decimals', function () {
    describe('Cap', function () {
      it('Cannot be set twice', async function () {
        const { dsToken } = await loadFixture(deployDSTokenRegulatedWithRebasing);
        await dsToken.setCap(1000);
        await expect(dsToken.setCap(1000)).revertedWith('Token cap already set');
      });
  
      it('Does not prevent issuing tokens within limit', async function () {
        const [investor] = await hre.ethers.getSigners();
        const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasing);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await dsToken.setCap(1000);
        await dsToken.issueTokens(investor, 500);
        await dsToken.issueTokens(investor, 500);
        expect(await dsToken.balanceOf(investor)).equal(1000);
      })
  
      it('Prevents issuing too many tokens', async function () {
        const [investor] = await hre.ethers.getSigners();
        const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasing);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await dsToken.setCap(10);
        await expect(dsToken.issueTokens(investor, 500)).revertedWith('Token Cap Hit');
      });
    });

    describe('Issuance', function () {
      it('Should issue tokens to a us wallet', async function () {
        const [investor] = await hre.ethers.getSigners();
        const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasing);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
        await dsToken.issueTokens(investor, 500);
        expect(await dsToken.balanceOf(investor)).equal(500);
      });
  
      it('Should issue tokens to a eu wallet', async function () {
        const [investor] = await hre.ethers.getSigners();
        const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasing);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.FRANCE);
        await dsToken.issueTokens(investor, 500);
        expect(await dsToken.balanceOf(investor)).equal(500);
      });
  
      it('Should not issue tokens to a forbidden wallet', async function () {
        const [investor] = await hre.ethers.getSigners();
        const { dsToken, registryService, complianceConfigurationService } = await loadFixture(deployDSTokenRegulatedWithRebasing);
        await complianceConfigurationService.setCountryCompliance(INVESTORS.Country.CHINA, INVESTORS.Compliance.FORBIDDEN);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.CHINA);
        await expect(dsToken.issueTokens(investor, 500)).revertedWith('Destination restricted');
      });
  
      it('Should record the number of total issued token correctly', async function () {
        const [investor, investor2] = await hre.ethers.getSigners();
        const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasing);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.FRANCE);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, INVESTORS.Country.USA);
        await dsToken.issueTokens(investor, 500);
        await dsToken.issueTokens(investor2, 500);
        await dsToken.issueTokens(investor, 500);
        await dsToken.issueTokens(investor2, 500);
        expect(await dsToken.totalIssued()).equal(2000);
      });

      it('Should emit TxShares event on issuance', async function () {
        const [investor] = await hre.ethers.getSigners();
        const { dsToken, registryService, rebasingProvider } = await loadFixture(deployDSTokenRegulatedWithRebasing);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);

        const valueToIssue = 500;
        const shares = await rebasingProvider.convertTokensToShares(valueToIssue);
        const multiplier = await rebasingProvider.multiplier();

        await expect(dsToken.issueTokens(investor, valueToIssue))
          .to.emit(dsToken, 'TxShares')
          .withArgs(hre.ethers.ZeroAddress, investor.address, shares, multiplier);
      });
    });
  
    describe('Issuance with no compliance', function () {
      it('Should issue tokens to a eu wallet (no compliance)', async function () {
        const [investor] = await hre.ethers.getSigners();
        const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasing);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.FRANCE);
        await dsToken.issueTokensWithNoCompliance(investor, 500);
        expect(await dsToken.balanceOf(investor)).equal(500);
      });
  
      it('Should issue tokens to a forbidden wallet (no compliance)', async function () {
        const [investor] = await hre.ethers.getSigners();
        const { dsToken, registryService, complianceConfigurationService } = await loadFixture(deployDSTokenRegulatedWithRebasing);
        await complianceConfigurationService.setCountryCompliance(INVESTORS.Country.CHINA, INVESTORS.Compliance.FORBIDDEN);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.CHINA);
        await dsToken.issueTokensWithNoCompliance(investor, 500);
        expect(await dsToken.balanceOf(investor)).equal(500);
      });
    });
  
    describe('Transfer', function () {
      it('Should emit TxShares event on transfer', async function () {
        const [investor, investor2] = await hre.ethers.getSigners();
        const { dsToken, registryService, rebasingProvider } = await loadFixture(deployDSTokenRegulatedWithRebasing);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);
        await dsToken.issueTokens(investor, 500);

        const valueToTransfer = 100;
        const shares = await rebasingProvider.convertTokensToShares(valueToTransfer);
        const multiplier = await rebasingProvider.multiplier();

        const dsTokenFromInvestor = await dsToken.connect(investor);
        await expect(dsTokenFromInvestor.transfer(investor2, valueToTransfer))
          .to.emit(dsToken, 'TxShares')
          .withArgs(investor.address, investor2.address, shares, multiplier);
      });
    });

    describe('Locking', async function () {
      it('Should not allow transferring any tokens when all locked', async function () {
        const [investor, investor2] = await hre.ethers.getSigners();
        const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasing);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
        await dsToken.issueTokensCustom(investor, 500, await time.latest(), 500, 'TEST', await time.latest() + 1000);

        const dsTokenFromInvestor = await dsToken.connect(investor);
        await expect(dsTokenFromInvestor.transfer(investor2, 500)).revertedWith('Tokens locked');
      });

      it('Should ignore issuance time if token has disallowBackDating set to true and allow transferring', async function () {
        const [investor, investor2] = await hre.ethers.getSigners();
        const { dsToken, complianceConfigurationService, registryService, complianceService } = await loadFixture(deployDSTokenRegulatedWithRebasing);
        await complianceConfigurationService.setDisallowBackDating(true);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);
        const issuanceTime = await time.latest();
        await dsToken.issueTokensCustom(investor, 100, issuanceTime + 10000, 0, 'TEST', 0);
        expect(await dsToken.balanceOf(investor)).equal(100);
        expect(await complianceService.getComplianceTransferableTokens(investor, await time.latest(), 0)).equal(100);

        const dsTokenFromInvestor = await dsToken.connect(investor);
        await dsTokenFromInvestor.transfer(investor2, 100);
        expect(await dsToken.balanceOf(investor)).equal(0);
        expect(await dsToken.balanceOf(investor2)).equal(100);
      });

      it('Should allow transferring tokens when other are locked', async function () {
        const [investor, investor2] = await hre.ethers.getSigners();
        const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasing);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
        await dsToken.issueTokensCustom(investor, 500, await time.latest(), 200, 'TEST', await time.latest() + 1000);

        const dsTokenFromInvestor = await dsToken.connect(investor);
        await dsTokenFromInvestor.transfer(investor2, 300);
        expect(await dsToken.balanceOf(investor)).equal(200);
        expect(await dsToken.balanceOf(investor2)).equal(300);
      });

      it('Should allow transferring tokens when other are locked', async function () {
        const [investor, anotherWallet] = await hre.ethers.getSigners();
        const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasing);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registryService.addWallet(anotherWallet, INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
        await dsToken.issueTokensCustom(investor, 500, await time.latest(), 500, 'TEST', await time.latest() + 1000);

        const dsTokenFromInvestor = await dsToken.connect(investor);
        await dsTokenFromInvestor.transfer(anotherWallet, 300);
        expect(await dsToken.balanceOf(investor)).equal(200);
        expect(await dsToken.balanceOf(anotherWallet)).equal(300);
      });
    });
  
    describe('Burn', function () {
      it('Should burn tokens from a specific wallet', async function () {
        const [investor] = await hre.ethers.getSigners();
        const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasing);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await dsToken.issueTokens(investor, 500);
        await dsToken.burn(investor, 50, 'test burn');
        expect(await dsToken.balanceOf(investor)).equal(450);
        expect(await dsToken.totalIssued()).equal(500);
      });

      it('Should emit TxShares event on burn', async function () {
        const [investor] = await hre.ethers.getSigners();
        const { dsToken, registryService, rebasingProvider } = await loadFixture(deployDSTokenRegulatedWithRebasing);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await dsToken.issueTokens(investor, 500);

        const valueToBurn = 50;
        const shares = await rebasingProvider.convertTokensToShares(valueToBurn);
        const multiplier = await rebasingProvider.multiplier();

        await expect(dsToken.burn(investor, valueToBurn, 'test burn'))
          .to.emit(dsToken, 'TxShares')
          .withArgs(investor.address, hre.ethers.ZeroAddress, shares, multiplier);
      });
    });
  
    describe('Seize', function () {
      it('Should seize tokens correctly', async function () {
        const [investor, issuer] = await hre.ethers.getSigners();
        const { dsToken, registryService, walletManager } = await loadFixture(deployDSTokenRegulatedWithRebasing);
        await walletManager.addIssuerWallet(issuer)
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await dsToken.issueTokens(investor, 500);
        await dsToken.seize(investor, issuer, 50, 'test burn');
        expect(await dsToken.balanceOf(investor)).equal(450);
        expect(await dsToken.balanceOf(issuer)).equal(50);
        expect(await dsToken.totalIssued()).equal(500);
      });

      it('Should emit TxShares event on seize', async function () {
        const [investor, issuer] = await hre.ethers.getSigners();
        const { dsToken, registryService, walletManager, rebasingProvider } = await loadFixture(deployDSTokenRegulatedWithRebasing);
        await walletManager.addIssuerWallet(issuer);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await dsToken.issueTokens(investor, 500);

        const valueToSeize = 50;
        const shares = await rebasingProvider.convertTokensToShares(valueToSeize);
        const multiplier = await rebasingProvider.multiplier();

        await expect(dsToken.seize(investor, issuer, valueToSeize, 'test seize'))
          .to.emit(dsToken, 'TxShares')
          .withArgs(investor.address, issuer.address, shares, multiplier);
      });

      it('Cannot seize more than balance', async function () {
        const [investor, issuer] = await hre.ethers.getSigners();
        const { dsToken, registryService, walletManager } = await loadFixture(deployDSTokenRegulatedWithRebasing);
        await walletManager.addIssuerWallet(issuer)
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await dsToken.issueTokens(investor, 500);
        await expect(dsToken.seize(investor, issuer, 550, 'test burn')).revertedWith('Not enough balance');
      });
    });


  });
      describe('DS Token Regulated with Rebasing 1730000000000000000 and 6 decimals', function () {
      describe('Cap', function () {
        it('Cannot be set twice', async function () {
          const { dsToken } = await loadFixture(deployDSTokenRegulatedWithRebasingAndSixDecimal);
          await dsToken.setCap(1000);
          await expect(dsToken.setCap(1000)).revertedWith('Token cap already set');
        });
    
        it('Does not prevent issuing tokens within limit', async function () {
          const [investor] = await hre.ethers.getSigners();
          const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasingAndSixDecimal);
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
          await dsToken.setCap(1000);
          await dsToken.issueTokens(investor, 500);
          await dsToken.issueTokens(investor, 500);
          expect(await dsToken.balanceOf(investor)).equal(1000);
        })
    
        it('Prevents issuing too many tokens', async function () {
          const [investor] = await hre.ethers.getSigners();
          const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasingAndSixDecimal);
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
          await dsToken.setCap(10);
          await expect(dsToken.issueTokens(investor, 500)).revertedWith('Token Cap Hit');
        });
      });

      describe('Issuance', function () {
        it('Should issue tokens to a us wallet', async function () {
          const [investor] = await hre.ethers.getSigners();
          const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasingAndSixDecimal);
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
          await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
          await dsToken.issueTokens(investor, 500);
          expect(await dsToken.balanceOf(investor)).equal(500);
        });
    
        it('Should issue tokens to a eu wallet', async function () {
          const [investor] = await hre.ethers.getSigners();
          const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasingAndSixDecimal);
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
          await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.FRANCE);
          await dsToken.issueTokens(investor, 500);
          expect(await dsToken.balanceOf(investor)).equal(500);
        });
    
        it('Should not issue tokens to a forbidden wallet', async function () {
          const [investor] = await hre.ethers.getSigners();
          const { dsToken, registryService, complianceConfigurationService } = await loadFixture(deployDSTokenRegulatedWithRebasingAndSixDecimal);
          await complianceConfigurationService.setCountryCompliance(INVESTORS.Country.CHINA, INVESTORS.Compliance.FORBIDDEN);
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
          await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.CHINA);
          await expect(dsToken.issueTokens(investor, 500)).revertedWith('Destination restricted');
        });
    
        it('Should record the number of total issued token correctly', async function () {
          const [investor, investor2] = await hre.ethers.getSigners();
          const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasingAndSixDecimal);
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);
          await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.FRANCE);
          await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, INVESTORS.Country.USA);
          await dsToken.issueTokens(investor, 500);
          await dsToken.issueTokens(investor2, 500);
          await dsToken.issueTokens(investor, 500);
          await dsToken.issueTokens(investor2, 500);
          expect(await dsToken.totalIssued()).equal(2000);
        });

        it('Should emit TxShares event on issuance', async function () {
          const [investor] = await hre.ethers.getSigners();
          const { dsToken, registryService, rebasingProvider } = await loadFixture(deployDSTokenRegulatedWithRebasingAndSixDecimal);
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
          await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);

          const valueToIssue = 500;
          const shares = await rebasingProvider.convertTokensToShares(valueToIssue);
          const multiplier = await rebasingProvider.multiplier();

          await expect(dsToken.issueTokens(investor, valueToIssue))
            .to.emit(dsToken, 'TxShares')
            .withArgs(hre.ethers.ZeroAddress, investor.address, shares, multiplier);
        });
      });
  
      describe('Issuance with no compliance', function () {
        it('Should issue tokens to a eu wallet (no compliance)', async function () {
          const [investor] = await hre.ethers.getSigners();
          const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasingAndSixDecimal);
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
          await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.FRANCE);
          await dsToken.issueTokensWithNoCompliance(investor, 500);
          expect(await dsToken.balanceOf(investor)).equal(500);
        });
    
        it('Should issue tokens to a forbidden wallet (no compliance)', async function () {
          const [investor] = await hre.ethers.getSigners();
          const { dsToken, registryService, complianceConfigurationService } = await loadFixture(deployDSTokenRegulatedWithRebasingAndSixDecimal);
          await complianceConfigurationService.setCountryCompliance(INVESTORS.Country.CHINA, INVESTORS.Compliance.FORBIDDEN);
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
          await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.CHINA);
          await dsToken.issueTokensWithNoCompliance(investor, 500);
          expect(await dsToken.balanceOf(investor)).equal(500);
        });
      });
  
      describe('Transfer', function () {
        it('Should emit TxShares event on transfer', async function () {
          const [investor, investor2] = await hre.ethers.getSigners();
          const { dsToken, registryService, rebasingProvider } = await loadFixture(deployDSTokenRegulatedWithRebasingAndSixDecimal);
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);
          await dsToken.issueTokens(investor, 500);

          const valueToTransfer = 100;
          const shares = await rebasingProvider.convertTokensToShares(valueToTransfer);
          const multiplier = await rebasingProvider.multiplier();

          const dsTokenFromInvestor = await dsToken.connect(investor);
          await expect(dsTokenFromInvestor.transfer(investor2, valueToTransfer))
            .to.emit(dsToken, 'TxShares')
            .withArgs(investor.address, investor2.address, shares, multiplier);
        });
      });

      describe('Locking', async function () {
        it('Should not allow transferring any tokens when all locked', async function () {
          const [investor, investor2] = await hre.ethers.getSigners();
          const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasingAndSixDecimal);
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);
          await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
          await dsToken.issueTokensCustom(investor, 500, await time.latest(), 500, 'TEST', await time.latest() + 1000);

          const dsTokenFromInvestor = await dsToken.connect(investor);
          await expect(dsTokenFromInvestor.transfer(investor2, 500)).revertedWith('Tokens locked');
        });

        it('Should ignore issuance time if token has disallowBackDating set to true and allow transferring', async function () {
          const [investor, investor2] = await hre.ethers.getSigners();
          const { dsToken, complianceConfigurationService, registryService, complianceService } = await loadFixture(deployDSTokenRegulatedWithRebasingAndSixDecimal);
          await complianceConfigurationService.setDisallowBackDating(true);
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);
          const issuanceTime = await time.latest();
          await dsToken.issueTokensCustom(investor, 100, issuanceTime + 10000, 0, 'TEST', 0);
          expect(await dsToken.balanceOf(investor)).equal(100);
          expect(await complianceService.getComplianceTransferableTokens(investor, await time.latest(), 0)).equal(100);

          const dsTokenFromInvestor = await dsToken.connect(investor);
          await dsTokenFromInvestor.transfer(investor2, 100);
          expect(await dsToken.balanceOf(investor)).equal(0);
          expect(await dsToken.balanceOf(investor2)).equal(100);
        });

        it('Should allow transferring tokens when other are locked', async function () {
          const [investor, investor2] = await hre.ethers.getSigners();
          const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasingAndSixDecimal);
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);
          await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
          await dsToken.issueTokensCustom(investor, 500, await time.latest(), 200, 'TEST', await time.latest() + 1000);

          const dsTokenFromInvestor = await dsToken.connect(investor);
          await dsTokenFromInvestor.transfer(investor2, 300);
          expect(await dsToken.balanceOf(investor)).equal(200);
          expect(await dsToken.balanceOf(investor2)).equal(300);
        });

        it('Should allow transferring tokens when other are locked', async function () {
          const [investor, anotherWallet] = await hre.ethers.getSigners();
          const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasingAndSixDecimal);
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
          await registryService.addWallet(anotherWallet, INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
          await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
          await dsToken.issueTokensCustom(investor, 500, await time.latest(), 500, 'TEST', await time.latest() + 1000);

          const dsTokenFromInvestor = await dsToken.connect(investor);
          await dsTokenFromInvestor.transfer(anotherWallet, 300);
          expect(await dsToken.balanceOf(investor)).equal(200);
          expect(await dsToken.balanceOf(anotherWallet)).equal(300);
        });
      });
  
      describe('Burn', function () {
        it('Should burn tokens from a specific wallet', async function () {
          const [investor] = await hre.ethers.getSigners();
          const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasingAndSixDecimal);
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
          await dsToken.issueTokens(investor, 500);
          await dsToken.burn(investor, 50, 'test burn');
          expect(await dsToken.balanceOf(investor)).equal(450);
          expect(await dsToken.totalIssued()).equal(500);
        });

        it('Should emit TxShares event on burn', async function () {
          const [investor] = await hre.ethers.getSigners();
          const { dsToken, registryService, rebasingProvider } = await loadFixture(deployDSTokenRegulatedWithRebasingAndSixDecimal);
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
          await dsToken.issueTokens(investor, 500);

          const valueToBurn = 50;
          const shares = await rebasingProvider.convertTokensToShares(valueToBurn);
          const multiplier = await rebasingProvider.multiplier();

          await expect(dsToken.burn(investor, valueToBurn, 'test burn'))
            .to.emit(dsToken, 'TxShares')
            .withArgs(investor.address, hre.ethers.ZeroAddress, shares, multiplier);
        });
      });
  
      describe('Seize', function () {
        it('Should seize tokens correctly', async function () {
          const [investor, issuer] = await hre.ethers.getSigners();
          const { dsToken, registryService, walletManager } = await loadFixture(deployDSTokenRegulatedWithRebasingAndSixDecimal);
          await walletManager.addIssuerWallet(issuer)
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
          await dsToken.issueTokens(investor, 500);
          await dsToken.seize(investor, issuer, 50, 'test burn');
          expect(await dsToken.balanceOf(investor)).equal(450);
          expect(await dsToken.balanceOf(issuer)).equal(50);
          expect(await dsToken.totalIssued()).equal(500);
        });

        it('Should emit TxShares event on seize', async function () {
          const [investor, issuer] = await hre.ethers.getSigners();
          const { dsToken, registryService, walletManager, rebasingProvider } = await loadFixture(deployDSTokenRegulatedWithRebasingAndSixDecimal);
          await walletManager.addIssuerWallet(issuer);
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
          await dsToken.issueTokens(investor, 500);

          const valueToSeize = 50;
          const shares = await rebasingProvider.convertTokensToShares(valueToSeize);
          const multiplier = await rebasingProvider.multiplier();

          await expect(dsToken.seize(investor, issuer, valueToSeize, 'test seize'))
            .to.emit(dsToken, 'TxShares')
            .withArgs(investor.address, issuer.address, shares, multiplier);
        });

        it('Cannot seize more than balance', async function () {
          const [investor, issuer] = await hre.ethers.getSigners();
          const { dsToken, registryService, walletManager } = await loadFixture(deployDSTokenRegulatedWithRebasingAndSixDecimal);
          await walletManager.addIssuerWallet(issuer)
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
          await dsToken.issueTokens(investor, 500);
          await expect(dsToken.seize(investor, issuer, 550, 'test burn')).revertedWith('Not enough balance');
        });
      });
    });

    describe('DS Token Regulated with Rebasing 1250000000000000000 and 18 decimals', function () {
      describe('Cap', function () {
        it('Cannot be set twice', async function () {
          const { dsToken } = await loadFixture(deployDSTokenRegulatedWithRebasingAndEighteenDecimal);
          await dsToken.setCap(1000);
          await expect(dsToken.setCap(1000)).revertedWith('Token cap already set');
        });
    
        it('Does not prevent issuing tokens within limit', async function () {
          const [investor] = await hre.ethers.getSigners();
          const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasingAndEighteenDecimal);
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
          await dsToken.setCap(1000);
          await dsToken.issueTokens(investor, 500);
          await dsToken.issueTokens(investor, 500);
          expect(await dsToken.balanceOf(investor)).equal(1000);
        })
    
        it('Prevents issuing too many tokens', async function () {
          const [investor] = await hre.ethers.getSigners();
          const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasingAndEighteenDecimal);
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
          await dsToken.setCap(10);
          await expect(dsToken.issueTokens(investor, 500)).revertedWith('Token Cap Hit');
        });
      });

      describe('Issuance', function () {
        it('Should issue tokens to a us wallet', async function () {
          const [investor] = await hre.ethers.getSigners();
          const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasingAndEighteenDecimal);
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
          await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
          await dsToken.issueTokens(investor, 500);
          expect(await dsToken.balanceOf(investor)).equal(500);
        });
    
        it('Should issue tokens to a eu wallet', async function () {
          const [investor] = await hre.ethers.getSigners();
          const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasingAndEighteenDecimal);
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
          await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.FRANCE);
          await dsToken.issueTokens(investor, 500);
          expect(await dsToken.balanceOf(investor)).equal(500);
        });
    
        it('Should not issue tokens to a forbidden wallet', async function () {
          const [investor] = await hre.ethers.getSigners();
          const { dsToken, registryService, complianceConfigurationService } = await loadFixture(deployDSTokenRegulatedWithRebasingAndEighteenDecimal);
          await complianceConfigurationService.setCountryCompliance(INVESTORS.Country.CHINA, INVESTORS.Compliance.FORBIDDEN);
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
          await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.CHINA);
          await expect(dsToken.issueTokens(investor, 500)).revertedWith('Destination restricted');
        });
    
        it('Should record the number of total issued token correctly', async function () {
          const [investor, investor2] = await hre.ethers.getSigners();
          const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasingAndEighteenDecimal);
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);
          await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.FRANCE);
          await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, INVESTORS.Country.USA);
          await dsToken.issueTokens(investor, 500);
          await dsToken.issueTokens(investor2, 500);
          await dsToken.issueTokens(investor, 500);
          await dsToken.issueTokens(investor2, 500);
          expect(await dsToken.totalIssued()).equal(2000);
        });

        it('Should emit TxShares event on issuance', async function () {
          const [investor] = await hre.ethers.getSigners();
          const { dsToken, registryService, rebasingProvider } = await loadFixture(deployDSTokenRegulatedWithRebasingAndEighteenDecimal);
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
          await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);

          const valueToIssue = 500;
          const shares = await rebasingProvider.convertTokensToShares(valueToIssue);
          const multiplier = await rebasingProvider.multiplier();

          await expect(dsToken.issueTokens(investor, valueToIssue))
            .to.emit(dsToken, 'TxShares')
            .withArgs(hre.ethers.ZeroAddress, investor.address, shares, multiplier);
        });
      });
  
      describe('Issuance with no compliance', function () {
        it('Should issue tokens to a eu wallet (no compliance)', async function () {
          const [investor] = await hre.ethers.getSigners();
          const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasingAndEighteenDecimal);
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
          await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.FRANCE);
          await dsToken.issueTokensWithNoCompliance(investor, 500);
          expect(await dsToken.balanceOf(investor)).equal(500);
        });
    
        it('Should issue tokens to a forbidden wallet (no compliance)', async function () {
          const [investor] = await hre.ethers.getSigners();
          const { dsToken, registryService, complianceConfigurationService } = await loadFixture(deployDSTokenRegulatedWithRebasingAndEighteenDecimal);
          await complianceConfigurationService.setCountryCompliance(INVESTORS.Country.CHINA, INVESTORS.Compliance.FORBIDDEN);
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
          await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.CHINA);
          await dsToken.issueTokensWithNoCompliance(investor, 500);
          expect(await dsToken.balanceOf(investor)).equal(500);
        });
      });
  
      describe('Transfer', function () {
        it('Should emit TxShares event on transfer', async function () {
          const [investor, investor2] = await hre.ethers.getSigners();
          const { dsToken, registryService, rebasingProvider } = await loadFixture(deployDSTokenRegulatedWithRebasingAndEighteenDecimal);
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);
          await dsToken.issueTokens(investor, 500);

          const valueToTransfer = 100;
          const shares = await rebasingProvider.convertTokensToShares(valueToTransfer);
          const multiplier = await rebasingProvider.multiplier();

          const dsTokenFromInvestor = await dsToken.connect(investor);
          await expect(dsTokenFromInvestor.transfer(investor2, valueToTransfer))
            .to.emit(dsToken, 'TxShares')
            .withArgs(investor.address, investor2.address, shares, multiplier);
        });
      });

      describe('Locking', async function () {
        it('Should not allow transferring any tokens when all locked', async function () {
          const [investor, investor2] = await hre.ethers.getSigners();
          const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasingAndEighteenDecimal);
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);
          await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
          await dsToken.issueTokensCustom(investor, 500, await time.latest(), 500, 'TEST', await time.latest() + 1000);

          const dsTokenFromInvestor = await dsToken.connect(investor);
          await expect(dsTokenFromInvestor.transfer(investor2, 500)).revertedWith('Tokens locked');
        });

        it('Should ignore issuance time if token has disallowBackDating set to true and allow transferring', async function () {
          const [investor, investor2] = await hre.ethers.getSigners();
          const { dsToken, complianceConfigurationService, registryService, complianceService } = await loadFixture(deployDSTokenRegulatedWithRebasingAndEighteenDecimal);
          await complianceConfigurationService.setDisallowBackDating(true);
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);
          const issuanceTime = await time.latest();
          await dsToken.issueTokensCustom(investor, 100, issuanceTime + 10000, 0, 'TEST', 0);
          expect(await dsToken.balanceOf(investor)).equal(100);
          expect(await complianceService.getComplianceTransferableTokens(investor, await time.latest(), 0)).equal(100);

          const dsTokenFromInvestor = await dsToken.connect(investor);
          await dsTokenFromInvestor.transfer(investor2, 100);
          expect(await dsToken.balanceOf(investor)).equal(0);
          expect(await dsToken.balanceOf(investor2)).equal(100);
        });

        it('Should allow transferring tokens when other are locked', async function () {
          const [investor, investor2] = await hre.ethers.getSigners();
          const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasingAndEighteenDecimal);
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);
          await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
          await dsToken.issueTokensCustom(investor, 500, await time.latest(), 200, 'TEST', await time.latest() + 1000);

          const dsTokenFromInvestor = await dsToken.connect(investor);
          await dsTokenFromInvestor.transfer(investor2, 300);
          expect(await dsToken.balanceOf(investor)).equal(200);
          expect(await dsToken.balanceOf(investor2)).equal(300);
        });

        it('Should allow transferring tokens when other are locked', async function () {
          const [investor, anotherWallet] = await hre.ethers.getSigners();
          const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasingAndEighteenDecimal);
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
          await registryService.addWallet(anotherWallet, INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
          await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
          await dsToken.issueTokensCustom(investor, 500, await time.latest(), 500, 'TEST', await time.latest() + 1000);

          const dsTokenFromInvestor = await dsToken.connect(investor);
          await dsTokenFromInvestor.transfer(anotherWallet, 300);
          expect(await dsToken.balanceOf(investor)).equal(200);
          expect(await dsToken.balanceOf(anotherWallet)).equal(300);
        });
      });
  
      describe('Burn', function () {
        it('Should burn tokens from a specific wallet', async function () {
          const [investor] = await hre.ethers.getSigners();
          const { dsToken, registryService } = await loadFixture(deployDSTokenRegulatedWithRebasingAndEighteenDecimal);
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
          await dsToken.issueTokens(investor, 500);
          await dsToken.burn(investor, 50, 'test burn');
          expect(await dsToken.balanceOf(investor)).equal(450);
          expect(await dsToken.totalIssued()).equal(500);
        });

        it('Should emit TxShares event on burn', async function () {
          const [investor] = await hre.ethers.getSigners();
          const { dsToken, registryService, rebasingProvider } = await loadFixture(deployDSTokenRegulatedWithRebasingAndEighteenDecimal);
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
          await dsToken.issueTokens(investor, 500);

          const valueToBurn = 50;
          const shares = await rebasingProvider.convertTokensToShares(valueToBurn);
          const multiplier = await rebasingProvider.multiplier();

          await expect(dsToken.burn(investor, valueToBurn, 'test burn'))
            .to.emit(dsToken, 'TxShares')
            .withArgs(investor.address, hre.ethers.ZeroAddress, shares, multiplier);
        });
      });
  
      describe('Seize', function () {
        it('Should seize tokens correctly', async function () {
          const [investor, issuer] = await hre.ethers.getSigners();
          const { dsToken, registryService, walletManager } = await loadFixture(deployDSTokenRegulatedWithRebasingAndEighteenDecimal);
          await walletManager.addIssuerWallet(issuer)
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
          await dsToken.issueTokens(investor, 500);
          await dsToken.seize(investor, issuer, 50, 'test burn');
          expect(await dsToken.balanceOf(investor)).equal(450);
          expect(await dsToken.balanceOf(issuer)).equal(50);
          expect(await dsToken.totalIssued()).equal(500);
        });

        it('Should emit TxShares event on seize', async function () {
          const [investor, issuer] = await hre.ethers.getSigners();
          const { dsToken, registryService, walletManager, rebasingProvider } = await loadFixture(deployDSTokenRegulatedWithRebasingAndEighteenDecimal);
          await walletManager.addIssuerWallet(issuer);
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
          await dsToken.issueTokens(investor, 500);

          const valueToSeize = 50;
          const shares = await rebasingProvider.convertTokensToShares(valueToSeize);
          const multiplier = await rebasingProvider.multiplier();

          await expect(dsToken.seize(investor, issuer, valueToSeize, 'test seize'))
            .to.emit(dsToken, 'TxShares')
            .withArgs(investor.address, issuer.address, shares, multiplier);
        });

        it('Cannot seize more than balance', async function () {
          const [investor, issuer] = await hre.ethers.getSigners();
          const { dsToken, registryService, walletManager } = await loadFixture(deployDSTokenRegulatedWithRebasingAndEighteenDecimal);
          await walletManager.addIssuerWallet(issuer)
          await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
          await dsToken.issueTokens(investor, 500);
          await expect(dsToken.seize(investor, issuer, 550, 'test burn')).revertedWith('Not enough balance');
        });
      });
    });
});
