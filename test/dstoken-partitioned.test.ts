import { expect } from 'chai';
import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { deployDSTokenPartitioned, deployDSTokenPartitioned, INVESTORS } from './utils/fixture';
import hre from 'hardhat';
import { registerInvestor } from './utils/test-helper';
import { zeroAddress } from 'ethereumjs-util';

describe.only('DS Token Partiioned Unit Tests', function() {
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
      const { dsToken, registryService, complianceConfigurationService, partitionsManager } = await loadFixture(deployDSTokenPartitioned);
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

    it('Should create a partition with the given time and region', async function () {
      const [investor] = await hre.ethers.getSigners();
      const { dsToken, registryService, complianceConfigurationService, partitionsManager } = await loadFixture(deployDSTokenPartitioned);
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

    it('Should return the correct balance of wallet by partition', async function () {
      const [investor] = await hre.ethers.getSigners();
      const { dsToken, registryService } = await loadFixture(deployDSTokenPartitioned);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.FRANCE);
      await dsToken.issueTokensCustom(investor, 100, 1, 0, 'TEST', 0);
      const partition = await dsToken.partitionOf(investor, 0);
      expect(await dsToken.balanceOfByPartition(investor, partition)).equal(100);
    });
  });

  describe('Issuance with no compliance', function () {
    it('Should issue tokens to a eu wallet (no compliance)', async function () {
      const [investor] = await hre.ethers.getSigners();
      const { dsToken, registryService } = await loadFixture(deployDSTokenPartitioned);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.FRANCE);
      await dsToken.issueTokensWithNoCompliance(investor, 500);
      expect(await dsToken.balanceOf(investor)).equal(500);
    });

    it('Should issue tokens to a forbidden wallet (no compliance)', async function () {
      const [investor] = await hre.ethers.getSigners();
      const { dsToken, registryService, complianceConfigurationService } = await loadFixture(deployDSTokenPartitioned);
      await complianceConfigurationService.setCountryCompliance(INVESTORS.Country.CHINA, INVESTORS.Compliance.FORBIDDEN);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);
      await registryService.setCountry(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, INVESTORS.Country.CHINA);
      await dsToken.issueTokensWithNoCompliance(investor, 500);
      expect(await dsToken.balanceOf(investor)).equal(500);
    });
  });
});
