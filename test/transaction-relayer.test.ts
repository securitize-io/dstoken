import hre from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { deployDSTokenRegulated, INVESTORS } from './utils/fixture';
import { expect } from 'chai';
import { DSConstants } from '../utils/globals';
import {
  EIP712_TR_NAME,
  EIP712_TR_VERSION,
  registerInvestor,
  transactionRelayerPreApproval,
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
      expect(await transactionRelayer.getImplementationAddress()).to.be.ok;
    });

    it('SHOULD fail when trying to initialize implementation contract directly', async () => {
      const implementation = await hre.ethers.deployContract('TransactionRelayer');
      await expect(implementation.initialize()).to.revertedWithCustomError(implementation, 'UUPSUnauthorizedCallContext');
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

      const message = {
        destination: await dsToken.getAddress(),
        data: issueTokensData,
        nonce,
        senderInvestor: INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
        blockLimit,
      };

      const signature = await transactionRelayerPreApproval(hsm, await transactionRelayer.getAddress(), message);

      await transactionRelayer.executePreApprovedTransaction(
        signature,
        message,
      );

      expect(await transactionRelayer.nonceByInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).to.equal(nonce + 1n);
      expect(await dsToken.balanceOf(investor)).to.equal(100);
    });

    it('Should exchange wallet sign a register investor transaction', async function() {
      const [, hsm] = await hre.ethers.getSigners();
      const {
        transactionRelayer,
        trustService,
        registryService,
      } = await loadFixture(deployDSTokenRegulated);

      await trustService.setRole(hsm, DSConstants.roles.EXCHANGE);

      const registerInvestorData = registryService.interface.encodeFunctionData('registerInvestor', [INVESTORS.INVESTOR_ID.INVESTOR_ID_2, '']);
      const block = await hre.ethers.provider.getBlock('latest');
      const blockLimit = (block?.number ?? 0) + 5;
      const nonce = await transactionRelayer.nonceByInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2);

      const message = {
        destination: await registryService.getAddress(),
        data: registerInvestorData,
        nonce,
        senderInvestor: INVESTORS.INVESTOR_ID.INVESTOR_ID_2,
        blockLimit,
      };

      const signature = await transactionRelayerPreApproval(hsm, await transactionRelayer.getAddress(), message);

      await transactionRelayer.executePreApprovedTransaction(
        signature,
        message,
      );

      expect(await transactionRelayer.nonceByInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2)).to.equal(nonce + 1n);
      expect(await registryService.isInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2)).to.equal(true);
    });

    it('Should revert if an unauthorized wallet sign a register investor transaction', async function() {
      const [, hsm] = await hre.ethers.getSigners();
      const {
        transactionRelayer,
        registryService,
      } = await loadFixture(deployDSTokenRegulated);

      const registerInvestorData = registryService.interface.encodeFunctionData('registerInvestor', [INVESTORS.INVESTOR_ID.INVESTOR_ID_2, '']);
      const block = await hre.ethers.provider.getBlock('latest');
      const blockLimit = (block?.number ?? 0) + 5;
      const nonce = await transactionRelayer.nonceByInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2);

      const message = {
        destination: await registryService.getAddress(),
        data: registerInvestorData,
        nonce,
        senderInvestor: INVESTORS.INVESTOR_ID.INVESTOR_ID_2,
        blockLimit,
      };

      const signature = await transactionRelayerPreApproval(hsm, await transactionRelayer.getAddress(), message);

      await expect(transactionRelayer.executePreApprovedTransaction(
        signature,
        message,
      )).to.revertedWith('Invalid signature');
    });

    it('SHOULD revert when reusing the same nonce', async function() {
      const [investor, hsm] = await hre.ethers.getSigners();
      const {
        dsToken,
        transactionRelayer,
        trustService,
        registryService,
      } = await loadFixture(deployDSTokenRegulated);

      await trustService.setRole(hsm, DSConstants.roles.ISSUER);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);

      const issueTokensData = dsToken.interface.encodeFunctionData('issueTokens', [investor.address, 100]);
      const block = await hre.ethers.provider.getBlock('latest');
      const blockLimit = (block?.number ?? 0) + 5;
      const nonce = await transactionRelayer.nonceByInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1);

      const message = {
        destination: await dsToken.getAddress(),
        data: issueTokensData,
        nonce,
        senderInvestor: INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
        blockLimit,
      };

      const signature = await transactionRelayerPreApproval(hsm, await transactionRelayer.getAddress(), message);

      await transactionRelayer.executePreApprovedTransaction(
        signature,
        message,
      );

      await expect(transactionRelayer.executePreApprovedTransaction(
        signature,
        message,
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

      const message = {
        destination: await dsToken.getAddress(),
        data: issueTokensData,
        nonce,
        senderInvestor: INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
        blockLimit,
      };

      const signature = await transactionRelayerPreApproval(hsm, await transactionRelayer.getAddress(), message);

      await expect(transactionRelayer.executePreApprovedTransaction(
        signature,
        message,
      )).revertedWith('Transaction too old');
    });

    it('SHOULD revert when signing with wrong typed name and version', async () => {
      const [investor, hsm] = await hre.ethers.getSigners();
      const {
        dsToken,
        transactionRelayer,
        trustService,
        registryService,
      } = await loadFixture(deployDSTokenRegulated);

      await trustService.setRole(hsm, DSConstants.roles.ISSUER);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);

      const issueTokensData = dsToken.interface.encodeFunctionData('issueTokens', [investor.address, 100]);
      const block = await hre.ethers.provider.getBlock('latest');
      const blockLimit = (block?.number ?? 0) + 5;
      const nonce = await transactionRelayer.nonceByInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1);

      const message = {
        destination: await dsToken.getAddress(),
        data: issueTokensData,
        nonce,
        senderInvestor: INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
        blockLimit,
      };

      const domainDataWrongName = {
        name: 'wrong name',
        version: EIP712_TR_VERSION,
        chainId: (await hre.ethers.provider.getNetwork()).chainId
      };

      let signature = await transactionRelayerPreApproval(hsm, await transactionRelayer.getAddress(), message, domainDataWrongName);

      await expect(transactionRelayer.executePreApprovedTransaction(
        signature,
        message,
      )).revertedWith('Invalid signature');

      const domainDataWrongVersion = {
        name: EIP712_TR_NAME,
        version: 'wrong version',
        chainId: (await hre.ethers.provider.getNetwork()).chainId
      };

      signature = await transactionRelayerPreApproval(hsm, await transactionRelayer.getAddress(), message, domainDataWrongVersion);

      await expect(transactionRelayer.executePreApprovedTransaction(
        signature,
        message,
      )).revertedWith('Invalid signature');
    });
  });
});
