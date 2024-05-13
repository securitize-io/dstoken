import { expect } from 'chai';
import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { deployDSTokenPartitioned, INVESTORS } from './utils/fixture';
import hre from 'hardhat';
import { registerInvestor } from './utils/test-helper';
import { zeroAddress } from 'ethereumjs-util';

describe('DS Token Partitioned Unit Tests', function() {
  describe('Creation', function() {
    it('Should get the basic details of the token correctly', async function() {
      const { dsToken } = await loadFixture(deployDSTokenPartitioned);
      expect(await dsToken.name()).equal('Token Example 1');
      expect(await dsToken.symbol()).equal('TX1');
      expect(await dsToken.decimals()).equal(2);
      expect(await dsToken.totalSupply()).equal(0);
    });
  });

  describe('Ownership', function() {
    it('Should allow to transfer ownership and return the correct owner address', async function() {
      const [owner, newOwner] = await hre.ethers.getSigners();
      const { dsToken } = await loadFixture(deployDSTokenPartitioned);
      await dsToken.transferOwnership(newOwner);

      expect(await dsToken.owner()).equal(newOwner);
    });
  });

  describe('Issuance', function() {
    it('Should issue tokens to a us wallet', async function() {
      const [investor] = await hre.ethers.getSigners();
      const {
        dsToken,
        registryService,
        complianceConfigurationService,
        partitionsManager
      } = await loadFixture(deployDSTokenPartitioned);
      await complianceConfigurationService.setCountryCompliance(INVESTORS.Country.USA, INVESTORS.Compliance.US);
      await complianceConfigurationService.setAll(
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 150, INVESTORS.Time.YEARS, 0, 0],
        [true, false, false, false, false]
      );
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
      const latest = await time.latest();
      await expect(await dsToken.issueTokensCustom(investor, 500, latest, 500, 'TEST', 0))
        .emit(dsToken, 'Issue').withArgs(investor, 500, 0)
        .emit(dsToken, 'Transfer').withArgs(zeroAddress(), investor, 500)
        .emit(dsToken, 'IssueByPartition').withArgs(investor, 500, await dsToken.partitionOf(investor, 0))
        .emit(dsToken, 'TransferByPartition').withArgs(zeroAddress(), investor, 500, await dsToken.partitionOf(investor, 0))
        .emit(partitionsManager, 'PartitionCreated').withArgs(latest, INVESTORS.Compliance.US, await dsToken.partitionOf(investor, 0));
      expect(await dsToken.balanceOf(investor)).equal(500);
    });

    it('Should issue tokens to a eu wallet', async function() {
      const [investor] = await hre.ethers.getSigners();
      const { dsToken, registryService } = await loadFixture(deployDSTokenPartitioned);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.FRANCE);
      await dsToken.issueTokens(investor, 500);
      expect(await dsToken.balanceOf(investor)).equal(500);
    });

    it('Should not issue tokens to a forbidden wallet', async function() {
      const [investor] = await hre.ethers.getSigners();
      const { dsToken, registryService, complianceConfigurationService } = await loadFixture(deployDSTokenPartitioned);
      await complianceConfigurationService.setCountryCompliance(INVESTORS.Country.CHINA, INVESTORS.Compliance.FORBIDDEN);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.CHINA);
      await expect(dsToken.issueTokens(investor, 500)).revertedWith('Destination restricted');
    });

    it('Should record the number of total issued token correctly', async function() {
      const [investor, investor2] = await hre.ethers.getSigners();
      const { dsToken, registryService } = await loadFixture(deployDSTokenPartitioned);
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

    it('Should create a partition with the given time and region', async function() {
      const [investor] = await hre.ethers.getSigners();
      const {
        dsToken,
        registryService,
        complianceConfigurationService,
        partitionsManager
      } = await loadFixture(deployDSTokenPartitioned);
      await complianceConfigurationService.setCountryCompliance(INVESTORS.Country.USA, INVESTORS.Compliance.US);
      await complianceConfigurationService.setAll(
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 150, INVESTORS.Time.YEARS, 0, 0],
        [true, false, false, false, false]
      );
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
      const latest = await time.latest();
      await dsToken.issueTokensCustom(investor, 100, latest, 0, 'TEST', 0);

      const partition = await dsToken.partitionOf(investor, 0);
      expect(await partitionsManager.getPartitionIssuanceDate(partition)).equal(latest);
      expect(await partitionsManager.getPartitionRegion(partition)).equal(INVESTORS.Compliance.US);
    });

    it('Should return the correct balance of investor by partition', async function() {
      const [investor] = await hre.ethers.getSigners();
      const { dsToken, registryService } = await loadFixture(deployDSTokenPartitioned);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.FRANCE);
      await dsToken.issueTokensCustom(investor, 100, 1, 0, 'TEST', 0);
      const partition = await dsToken.partitionOf(investor, 0);
      expect(await dsToken.balanceOfInvestorByPartition(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, partition)).equal(100);
    });

    it('Should return the correct balance of wallet by partition', async function() {
      const [investor] = await hre.ethers.getSigners();
      const { dsToken, registryService } = await loadFixture(deployDSTokenPartitioned);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.FRANCE);
      await dsToken.issueTokensCustom(investor, 100, 1, 0, 'TEST', 0);
      const partition = await dsToken.partitionOf(investor, 0);
      expect(await dsToken.balanceOfByPartition(investor, partition)).equal(100);
    });
  });

  describe('Issuance with no compliance', function() {
    it('Should issue tokens to a eu wallet (no compliance)', async function() {
      const [investor] = await hre.ethers.getSigners();
      const { dsToken, registryService } = await loadFixture(deployDSTokenPartitioned);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.FRANCE);
      await dsToken.issueTokensWithNoCompliance(investor, 500);
      expect(await dsToken.balanceOf(investor)).equal(500);
    });

    it('Should issue tokens to a forbidden wallet (no compliance)', async function() {
      const [investor] = await hre.ethers.getSigners();
      const { dsToken, registryService, complianceConfigurationService } = await loadFixture(deployDSTokenPartitioned);
      await complianceConfigurationService.setCountryCompliance(INVESTORS.Country.CHINA, INVESTORS.Compliance.FORBIDDEN);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.CHINA);
      await dsToken.issueTokensWithNoCompliance(investor, 500);
      expect(await dsToken.balanceOf(investor)).equal(500);
    });

    it('Should issue tokens to a none wallet (no compliance)', async function() {
      const [investor] = await hre.ethers.getSigners();
      const { dsToken, registryService } = await loadFixture(deployDSTokenPartitioned);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await dsToken.issueTokensWithNoCompliance(investor, 500);
      expect(await dsToken.balanceOf(investor)).equal(500);
    });
  });

  describe('Locking', function() {
    it('Should not allow transferring any tokens when all locked', async function() {
      it('Should not allow transferring any tokens when all locked', async function() {
        const [investor, investor2] = await hre.ethers.getSigners();
        const { dsToken, registryService } = await loadFixture(deployDSTokenPartitioned);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
        await dsToken.issueTokensCustom(investor, 500, await time.latest(), 500, 'TEST', await time.latest() + 1000);

        const dsTokenFromInvestor = await dsToken.connect(investor);
        await expect(dsTokenFromInvestor.transfer(investor2, 500)).revertedWith('Tokens locked');
      });

      it('Should ignore issuance time if token has disallowBackDating set to true and allow transferring', async function() {
        const [investor, investor2] = await hre.ethers.getSigners();
        const {
          dsToken,
          complianceConfigurationService,
          registryService,
          complianceService
        } = await loadFixture(deployDSTokenPartitioned);
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

      it('Should allow transferring tokens when other are locked', async function() {
        const [investor, investor2] = await hre.ethers.getSigners();
        const { dsToken, registryService } = await loadFixture(deployDSTokenPartitioned);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
        await dsToken.issueTokensCustom(investor, 500, await time.latest(), 200, 'TEST', await time.latest() + 1000);

        const dsTokenFromInvestor = await dsToken.connect(investor);
        await dsTokenFromInvestor.transfer(investor2, 300);
        expect(await dsToken.balanceOf(investor)).equal(200);
        expect(await dsToken.balanceOf(investor2)).equal(300);
      });
    });

    describe('Transfer', function() {
      it('Should transfer from more than one partition', async function() {
        const [investor, investor2] = await hre.ethers.getSigners();
        const { dsToken, registryService } = await loadFixture(deployDSTokenPartitioned);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
        await dsToken.issueTokensCustom(investor, 100, 1, 0, 'TEST', 0);
        await dsToken.issueTokensCustom(investor, 100, 2, 0, 'TEST', 0);
        await dsToken.issueTokensCustom(investor, 100, 3, 0, 'TEST', 0);
        const partition1 = await dsToken.partitionOf(investor, 0);
        const partition2 = await dsToken.partitionOf(investor, 1);
        const partition3 = await dsToken.partitionOf(investor, 2);

        const dsTokenFromInvestor = await dsToken.connect(investor);
        await dsTokenFromInvestor.transfer(investor2, 300);

        expect(await dsToken.balanceOfByPartition(investor2, partition1)).to.equal(100);
        expect(await dsToken.balanceOfByPartition(investor2, partition2)).to.equal(100);
        expect(await dsToken.balanceOfByPartition(investor2, partition3)).to.equal(100);
      });

      it('Should transfer by specific partitions', async function() {
        const [investor, investor2] = await hre.ethers.getSigners();
        const { dsToken, registryService } = await loadFixture(deployDSTokenPartitioned);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, investor2, registryService);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.USA);
        await dsToken.issueTokensCustom(investor, 100, 1, 0, 'TEST', 0);
        await dsToken.issueTokensCustom(investor, 100, 2, 0, 'TEST', 0);
        await dsToken.issueTokensCustom(investor, 100, 3, 0, 'TEST', 0);
        const partition1 = await dsToken.partitionOf(investor, 0);
        const partition2 = await dsToken.partitionOf(investor, 1);

        const dsTokenFromInvestor = await dsToken.connect(investor);
        expect(await dsTokenFromInvestor.transferByPartitions(investor2, 150, [partition1, partition2], [100, 50]))
          .emit(dsToken, 'Transfer')
          .emit(dsToken, 'TransferByPartition')
          .emit(dsToken, 'TransferByPartition');

        expect(await dsToken.balanceOfByPartition(investor2, partition1)).to.equal(100);
        expect(await dsToken.balanceOfByPartition(investor, partition1)).to.equal(0);
        expect(await dsToken.balanceOfByPartition(investor2, partition2)).to.equal(50);
        expect(await dsToken.balanceOfByPartition(investor, partition2)).to.equal(50);

        expect(await dsToken.partitionCountOf(investor)).to.equal(2);
        expect(await dsToken.partitionCountOf(investor2)).to.equal(2);
      });
    });

    describe('Burn', function() {
      it('Should not allow burn without specifying a partition', async function() {
        const [investor] = await hre.ethers.getSigners();
        const { dsToken, registryService } = await loadFixture(deployDSTokenPartitioned);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.FRANCE);
        await dsToken.issueTokens(investor, 500);
        await expect(dsToken.burn(investor, 100, 'test')).revertedWith('Partitioned Token');
      });

      it('Should burn tokens of a partition correctly', async function() {
        const [investor] = await hre.ethers.getSigners();
        const { dsToken, registryService } = await loadFixture(deployDSTokenPartitioned);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.FRANCE);
        await dsToken.issueTokens(investor, 500);
        const partition = await dsToken.partitionOf(investor, 0);

        expect(await dsToken.burnByPartition(investor, 100, 'test', partition))
          .emit(dsToken, 'Burn')
          .emit(dsToken, 'Transfer')
          .emit(dsToken, 'BurnByPartition')
          .emit(dsToken, 'TransferByPartition');

        expect(await dsToken.balanceOfByPartition(investor, partition)).to.equal(400);
      });
    });

    describe('Seize', function() {
      it('Should not allow seize without specifying a partition', async function() {
        const [investor, issuer] = await hre.ethers.getSigners();
        const { dsToken, registryService, walletManager } = await loadFixture(deployDSTokenPartitioned);
        await walletManager.addIssuerWallet(issuer);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.FRANCE);
        await dsToken.issueTokens(investor, 500);
        await expect(dsToken.seize(investor, issuer, 100, 'test')).revertedWith('Partitioned Token');
      });

      it('Should seize tokens correctly by partition', async function() {
        const [investor, issuer] = await hre.ethers.getSigners();
        const { dsToken, registryService, walletManager } = await loadFixture(deployDSTokenPartitioned);
        await walletManager.addIssuerWallet(issuer);
        await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
        await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.FRANCE);
        await dsToken.issueTokens(investor, 500);
        const partition = await dsToken.partitionOf(investor, 0);

        expect(await dsToken.seizeByPartition(investor, issuer, 100, 'test', partition))
          .emit(dsToken, 'Seize')
          .emit(dsToken, 'Transfer')
          .emit(dsToken, 'SeizeByPartition')
          .emit(dsToken, 'TransferByPartition');

        expect(await dsToken.balanceOfByPartition(investor, partition)).to.equal(400);
      });
    });
  });
});
