import hre from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { deployDSTokenRegulated, INVESTORS } from './utils/fixture';
import { expect } from 'chai';
import { DSConstants } from '../utils/globals';
import {
  EIP712_TR_NAME,
  EIP712_TR_VERSION,
  registerInvestor,
  transactionRelayerPreApproval
} from './utils/test-helper';

describe('Transaction Relayer Unit Tests', function() {
  describe('Creation', function() {
    it('Should fail when trying to initialize twice', async function() {
      const { transactionRelayer } = await loadFixture(deployDSTokenRegulated);
      await expect(transactionRelayer.initialize()).revertedWithCustomError(transactionRelayer, 'InvalidInitialization');
    });

    it('Should get version correctly', async function() {
      const { transactionRelayer } = await loadFixture(deployDSTokenRegulated);
      expect(await transactionRelayer.getInitializedVersion()).to.equal(1);
    });

    it('Should get implementation address correctly', async function() {
      const { transactionRelayer } = await loadFixture(deployDSTokenRegulated);
      expect(await transactionRelayer.getImplementationAddress()).to.be.exist;
    });
  });

  describe('executePreApprovedTransaction method', function() {
    it('Should wallet issuer sign an issueTokens() transaction', async function() {
      const [investor, hsm] = await hre.ethers.getSigners();
      const {
        dsToken,
        transactionRelayer,
        trustService,
        registryService
      } = await loadFixture(deployDSTokenRegulated);

      await trustService.setRole(hsm, DSConstants.roles.ISSUER);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);

      const issueTokensData = dsToken.interface.encodeFunctionData('issueTokens', [investor.address, 100]);
      const block = await hre.ethers.provider.getBlock('latest');
      const blockLimit = (block?.number ?? 0) + 5;
      const nonce = await transactionRelayer.nonceByInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
      const dataHash = hre.ethers.keccak256(issueTokensData);
      const investorIdHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(INVESTORS.INVESTOR_ID.INVESTOR_ID_1));

      const investorId = INVESTORS.INVESTOR_ID.INVESTOR_ID_1;
      const message = {
        destination: await dsToken.getAddress(),
        data: dataHash,
        nonce: nonce,
        senderInvestor: investorIdHash,
        blockLimit
      };

      const signature = await transactionRelayerPreApproval(hsm, await transactionRelayer.getAddress(), message);

      await transactionRelayer.executePreApprovedTransaction(
        signature.serialized,
        {
          destination: await dsToken.getAddress(),
          data: issueTokensData,
          senderInvestor: investorId,
          nonce,
          blockLimit
        }
      );

      expect(await transactionRelayer.nonceByInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).to.equal(nonce + 1n);
      expect(await dsToken.balanceOf(investor)).to.equal(100);
    });

    it('SHOULD revert when reusing the same nonce', async function() {
      const [investor, hsm] = await hre.ethers.getSigners();
      const {
        dsToken,
        transactionRelayer,
        trustService,
        registryService
      } = await loadFixture(deployDSTokenRegulated);

      await trustService.setRole(hsm, DSConstants.roles.ISSUER);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);

      const issueTokensData = dsToken.interface.encodeFunctionData('issueTokens', [investor.address, 100]);
      const block = await hre.ethers.provider.getBlock('latest');
      const blockLimit = (block?.number ?? 0) + 5;
      const nonce = await transactionRelayer.nonceByInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
      const dataHash = hre.ethers.keccak256(issueTokensData);
      const investorIdHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(INVESTORS.INVESTOR_ID.INVESTOR_ID_1));

      const investorId = INVESTORS.INVESTOR_ID.INVESTOR_ID_1;
      const message = {
        destination: await dsToken.getAddress(),
        data: dataHash,
        nonce: nonce,
        senderInvestor: investorIdHash,
        blockLimit
      };

      const signature = await transactionRelayerPreApproval(hsm, await transactionRelayer.getAddress(), message);

      const txData = {
        destination: await dsToken.getAddress(),
        data: issueTokensData,
        senderInvestor: investorId,
        nonce,
        blockLimit
      };

      await transactionRelayer.executePreApprovedTransaction(
        signature.serialized,
        txData
      );

      await expect(transactionRelayer.executePreApprovedTransaction(
        signature.serialized,
        txData
      )).revertedWith('Invalid nonce');
    });

    it('SHOULD revert when blockLimit is expired', async () => {
      const [investor, hsm] = await hre.ethers.getSigners();
      const {
        dsToken,
        transactionRelayer,
        trustService,
        registryService
      } = await loadFixture(deployDSTokenRegulated);

      await trustService.setRole(hsm, DSConstants.roles.ISSUER);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);

      const issueTokensData = dsToken.interface.encodeFunctionData('issueTokens', [investor.address, 100]);
      const block = await hre.ethers.provider.getBlock('latest');
      const blockLimit = (block?.number ?? 0) - 5;
      const nonce = await transactionRelayer.nonceByInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
      const dataHash = hre.ethers.keccak256(issueTokensData);
      const investorIdHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(INVESTORS.INVESTOR_ID.INVESTOR_ID_1));

      const investorId = INVESTORS.INVESTOR_ID.INVESTOR_ID_1;
      const message = {
        destination: await dsToken.getAddress(),
        data: dataHash,
        nonce: nonce,
        senderInvestor: investorIdHash,
        blockLimit
      };

      const signature = await transactionRelayerPreApproval(hsm, await transactionRelayer.getAddress(), message);

      const txData = {
        destination: await dsToken.getAddress(),
        data: issueTokensData,
        senderInvestor: investorId,
        nonce,
        blockLimit
      };

      await expect(transactionRelayer.executePreApprovedTransaction(
        signature.serialized,
        txData
      )).revertedWith('Transaction too old');
    });

    it('SHOULD revert when signing with wrong typed name and version', async () => {
      const [investor, hsm] = await hre.ethers.getSigners();
      const {
        dsToken,
        transactionRelayer,
        trustService,
        registryService
      } = await loadFixture(deployDSTokenRegulated);

      await trustService.setRole(hsm, DSConstants.roles.ISSUER);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);

      const issueTokensData = dsToken.interface.encodeFunctionData('issueTokens', [investor.address, 100]);
      const block = await hre.ethers.provider.getBlock('latest');
      const blockLimit = (block?.number ?? 0) + 5;
      const nonce = await transactionRelayer.nonceByInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
      const dataHash = hre.ethers.keccak256(issueTokensData);
      const investorIdHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(INVESTORS.INVESTOR_ID.INVESTOR_ID_1));

      const investorId = INVESTORS.INVESTOR_ID.INVESTOR_ID_1;
      const message = {
        destination: await dsToken.getAddress(),
        data: dataHash,
        nonce: nonce,
        senderInvestor: investorIdHash,
        blockLimit
      };

      const domainDataWrongName = {
        name: 'wrong name',
        version: EIP712_TR_VERSION,
        chainId: (await hre.ethers.provider.getNetwork()).chainId
      };

      let signature = await transactionRelayerPreApproval(hsm, await transactionRelayer.getAddress(), message, domainDataWrongName);

      const txData = {
        destination: await dsToken.getAddress(),
        data: issueTokensData,
        senderInvestor: investorId,
        nonce,
        blockLimit
      };

      await expect(transactionRelayer.executePreApprovedTransaction(
        signature.serialized,
        txData
      )).revertedWith('Invalid signature');

      const domainDataWrongVersion = {
        name: EIP712_TR_NAME,
        version: 'wrong version',
        chainId: (await hre.ethers.provider.getNetwork()).chainId
      };

      signature = await transactionRelayerPreApproval(hsm, await transactionRelayer.getAddress(), message, domainDataWrongVersion);

      await expect(transactionRelayer.executePreApprovedTransaction(
        signature.serialized,
        txData
      )).revertedWith('Invalid signature');
    });
  });

});
