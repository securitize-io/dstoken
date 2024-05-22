import hre from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { deployDSTokenRegulated, INVESTORS } from './utils/fixture';
import { expect } from 'chai';
import { DSConstants } from '../utils/globals';
import {
  EIP712_TR_NAME,
  EIP712_TR_VERSION,
  registerInvestor,
  SALT_TR,
  transactionRelayerPreApproval
} from './utils/test-helper';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const GAS_LIMIT = 200000000;

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

  describe('executeByInvestorWithBlockLimit method', function() {
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
      const blockLimit = block?.number + 5;
      const nonce = await transactionRelayer.nonceByInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1);

      const message = {
        destination: await dsToken.getAddress(),
        value: 0,
        data: issueTokensData,
        nonce: nonce,
        executor: ZERO_ADDRESS,
        gasLimit: GAS_LIMIT,
        investorId: INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
        blockLimit
      };

      const signature = await transactionRelayerPreApproval(hsm, await transactionRelayer.getAddress(), message);

      await transactionRelayer.executeByInvestorWithBlockLimit(
        signature.v,
        signature.r,
        signature.s,
        INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
        await dsToken.getAddress(),
        ZERO_ADDRESS,
        issueTokensData,
        [0, GAS_LIMIT, blockLimit]
      );

      expect(await transactionRelayer.nonceByInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).to.equal(nonce + 1n);
      expect(await dsToken.balanceOf(investor)).to.equal(100);
    });

    it('SHOULD revert when passing wrong params array length', async function() {
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
      const blockLimit = block?.number + 5;
      const nonce = await transactionRelayer.nonceByInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1);

      const message = {
        destination: await dsToken.getAddress(),
        value: 0,
        data: issueTokensData,
        nonce: nonce,
        executor: ZERO_ADDRESS,
        gasLimit: GAS_LIMIT,
        investorId: INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
        blockLimit
      };

      const signature = await transactionRelayerPreApproval(hsm, await transactionRelayer.getAddress(), message);

      await expect(transactionRelayer.executeByInvestorWithBlockLimit(
        signature.v,
        signature.r,
        signature.s,
        INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
        await dsToken.getAddress(),
        ZERO_ADDRESS,
        issueTokensData,
        [0, GAS_LIMIT, blockLimit, blockLimit]
      )).revertedWith('Incorrect params length');
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
      const blockLimit = block?.number - 5;
      const nonce = await transactionRelayer.nonceByInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1);

      const message = {
        destination: await dsToken.getAddress(),
        value: 0,
        data: issueTokensData,
        nonce: nonce,
        executor: ZERO_ADDRESS,
        gasLimit: GAS_LIMIT,
        investorId: INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
        blockLimit
      };

      const signature = await transactionRelayerPreApproval(hsm, await transactionRelayer.getAddress(), message);

      await expect(transactionRelayer.executeByInvestorWithBlockLimit(
        signature.v,
        signature.r,
        signature.s,
        INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
        await dsToken.getAddress(),
        ZERO_ADDRESS,
        issueTokensData,
        [0, GAS_LIMIT, blockLimit]
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
      const blockLimit = block?.number + 5;
      const nonce = await transactionRelayer.nonceByInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1);

      const message = {
        destination: await dsToken.getAddress(),
        value: 0,
        data: issueTokensData,
        nonce: nonce,
        executor: ZERO_ADDRESS,
        gasLimit: GAS_LIMIT,
        investorId: INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
        blockLimit
      };

      const domainDataWrongName = {
        name: 'wrong name',
        version: EIP712_TR_VERSION,
        chainId: (await hre.ethers.provider.getNetwork()).chainId,
        salt: SALT_TR
      };

      let signature = await transactionRelayerPreApproval(hsm, await transactionRelayer.getAddress(), message, domainDataWrongName);

      await expect(transactionRelayer.executeByInvestorWithBlockLimit(
        signature.v,
        signature.r,
        signature.s,
        INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
        await dsToken.getAddress(),
        ZERO_ADDRESS,
        issueTokensData,
        [0, GAS_LIMIT, blockLimit]
      )).revertedWith('Invalid signature');

      const domainDataWrongVersion = {
        name: EIP712_TR_NAME,
        version: 'wrong version',
        chainId: (await hre.ethers.provider.getNetwork()).chainId,
        salt: SALT_TR
      };

      signature = await transactionRelayerPreApproval(hsm, await transactionRelayer.getAddress(), message, domainDataWrongVersion);

      await expect(transactionRelayer.executeByInvestorWithBlockLimit(
        signature.v,
        signature.r,
        signature.s,
        INVESTORS.INVESTOR_ID.INVESTOR_ID_1,
        await dsToken.getAddress(),
        ZERO_ADDRESS,
        issueTokensData,
        [0, GAS_LIMIT, blockLimit]
      )).revertedWith('Invalid signature');
    });
  });

});
