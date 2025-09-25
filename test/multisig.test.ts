import { expect } from 'chai';
import hre from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { deployDSTokenRegulated, deployMultisigWallet, INVESTORS } from './utils/fixture';
import { DSConstants } from '../utils/globals';
import {
  EIP712_MS_NAME,
  EIP712_MS_VERSION,
  multisigPreApproval,
  registerInvestor,
  SALT_MS
} from './utils/test-helper';

const THRESHOLD = 3;
const GAS_LIMIT = 200000000;

describe('Multisig Unit Tests', function() {
  describe('Creation', function() {
    it('Should deploy a new multisig contract', async function() {
      const [owner1, owner2, owner3] = await hre.ethers.getSigners();
      const multisig = await hre.ethers.deployContract('MultiSigWallet', [[owner1, owner2, owner3], THRESHOLD]);
      expect(multisig).to.exist;
    });

    it('SHOULD revert - Owners length > 10', async () => {
      const [owner1] = await hre.ethers.getSigners();
      await expect(hre.ethers.deployContract('MultiSigWallet', [[...await hre.ethers.getSigners(), owner1], THRESHOLD])).revertedWith('threshold not allowed');
    });

    it('SHOULD revert - Owners length = 1', async () => {
      const [owner1] = await hre.ethers.getSigners();
      await expect(hre.ethers.deployContract('MultiSigWallet', [[owner1], 0])).revertedWith('threshold not allowed');
    });

    it('SHOULD revert - Threshold > Owners length', async () => {
      const [owner1] = await hre.ethers.getSigners();
      await expect(hre.ethers.deployContract('MultiSigWallet', [[owner1], THRESHOLD])).revertedWith('threshold not allowed');
    });

    it('SHOULD revert - Threshold <= Owners length / 2', async () => {
      const [owner1, owner2] = await hre.ethers.getSigners();
      await expect(hre.ethers.deployContract('MultiSigWallet', [[owner1, owner2], THRESHOLD])).revertedWith('threshold not allowed');
    });

    it('SHOULD revert - Duplicate Owner', async () => {
      const [owner1, owner2] = await hre.ethers.getSigners();
      await expect(hre.ethers.deployContract('MultiSigWallet', [[owner1, owner1, owner2], THRESHOLD])).revertedWith('duplicate owner');
    });
  });

  describe('Test token transactions', () => {
    it('SHOULD execute issue tokens transaction', async () => {
      const [owner1, owner2, owner3, investor] = await hre.ethers.getSigners();
      const owners = [owner1, owner2, owner3].sort((a, b) => {
        if (a.address < b.address) {
          return -1;
        }
        if (a.address > b.address) {
          return -1;
        }
        return 0;
      });

      const { dsToken, trustService, registryService, multisig } = await loadFixture(deployDSTokenRegulated);

      await trustService.setRole(await multisig.getAddress(), DSConstants.roles.ISSUER);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);

      const issueTokensData = dsToken.interface.encodeFunctionData('issueTokens', [investor.address, 100]);

      const message = {
        destination: await dsToken.getAddress(),
        value: 0,
        data: issueTokensData,
        nonce: 0,
        executor: owner1.address,
        gasLimit: GAS_LIMIT
      };

      const signatures = await multisigPreApproval(owners, await multisig.getAddress(), message);
      const sigsV: number[] = [];
      const sigsR: string[] = [];
      const sigsS: string[] = [];

      signatures.forEach((signature) => {
        sigsV.push(signature.v);
        sigsR.push(signature.r);
        sigsS.push(signature.s);
      });

      await multisig.execute(
        sigsV,
        sigsR,
        sigsS,
        await dsToken.getAddress(),
        0,
        issueTokensData,
        owner1.address,
        GAS_LIMIT
      );

      expect(await dsToken.balanceOfInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1)).to.equal(100);
    });

    it('SHOULD revert when signing with owners under threshold', async () => {
      const [owner1, owner2, investor] = await hre.ethers.getSigners();
      const owners = [owner1, owner2].sort((a, b) => {
        if (a.address < b.address) {
          return -1;
        }
        if (a.address > b.address) {
          return -1;
        }
        return 0;
      });
      const { dsToken, trustService, registryService, multisig } = await loadFixture(deployDSTokenRegulated);

      await trustService.setRole(await multisig.getAddress(), DSConstants.roles.ISSUER);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);

      const issueTokensData = dsToken.interface.encodeFunctionData('issueTokens', [investor.address, 100]);

      const message = {
        destination: await dsToken.getAddress(),
        value: 0,
        data: issueTokensData,
        nonce: 0,
        executor: owner1.address,
        gasLimit: GAS_LIMIT
      };

      const signatures = await multisigPreApproval(owners, await multisig.getAddress(), message);
      const sigsV: number[] = [];
      const sigsR: string[] = [];
      const sigsS: string[] = [];

      signatures.forEach((signature) => {
        sigsV.push(signature.v);
        sigsR.push(signature.r);
        sigsS.push(signature.s);
      });

      await expect(multisig.execute(
        sigsV,
        sigsR,
        sigsS,
        await dsToken.getAddress(),
        0,
        issueTokensData,
        owner1.address,
        GAS_LIMIT
      )).revertedWith('there are fewer signatures than the threshold');
    });

    it('SHOULD revert when sender is not an owner', async () => {
      const [owner1, owner2, owner3, investor] = await hre.ethers.getSigners();
      const owners = [owner1, owner2, owner3].sort((a, b) => {
        if (a.address < b.address) {
          return -1;
        }
        if (a.address > b.address) {
          return -1;
        }
        return 0;
      });
      const { dsToken, trustService, registryService, multisig } = await loadFixture(deployDSTokenRegulated);

      await trustService.setRole(await multisig.getAddress(), DSConstants.roles.ISSUER);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);

      const issueTokensData = dsToken.interface.encodeFunctionData('issueTokens', [investor.address, 100]);

      const message = {
        destination: await dsToken.getAddress(),
        value: 0,
        data: issueTokensData,
        nonce: 0,
        executor: owner1.address,
        gasLimit: GAS_LIMIT
      };

      const signatures = await multisigPreApproval(owners, await multisig.getAddress(), message);
      const sigsV: number[] = [];
      const sigsR: string[] = [];
      const sigsS: string[] = [];

      signatures.forEach((signature) => {
        sigsV.push(signature.v);
        sigsR.push(signature.r);
        sigsS.push(signature.s);
      });

      const multiSigFromUnauthorized = await multisig.connect(investor);
      await expect(multiSigFromUnauthorized.execute(
        sigsV,
        sigsR,
        sigsS,
        await dsToken.getAddress(),
        0,
        issueTokensData,
        investor.address,
        GAS_LIMIT
      )).revertedWith('sender is not an authorized signer');
    });

    it('SHOULD revert when sender is not the executor', async () => {
      const [owner1, owner2, owner3, investor] = await hre.ethers.getSigners();
      const owners = [owner1, owner2, owner3].sort((a, b) => {
        if (a.address < b.address) {
          return -1;
        }
        if (a.address > b.address) {
          return -1;
        }
        return 0;
      });
      const { dsToken, trustService, registryService, multisig } = await loadFixture(deployDSTokenRegulated);

      await trustService.setRole(await multisig.getAddress(), DSConstants.roles.ISSUER);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);

      const issueTokensData = dsToken.interface.encodeFunctionData('issueTokens', [investor.address, 100]);

      const message = {
        destination: await dsToken.getAddress(),
        value: 0,
        data: issueTokensData,
        nonce: 0,
        executor: owner1.address,
        gasLimit: GAS_LIMIT
      };

      const signatures = await multisigPreApproval(owners, await multisig.getAddress(), message);
      const sigsV: number[] = [];
      const sigsR: string[] = [];
      const sigsS: string[] = [];

      signatures.forEach((signature) => {
        sigsV.push(signature.v);
        sigsR.push(signature.r);
        sigsS.push(signature.s);
      });

      const multiSigFromUnauthorized = await multisig.connect(investor);
      await expect(multiSigFromUnauthorized.execute(
        sigsV,
        sigsR,
        sigsS,
        await dsToken.getAddress(),
        0,
        issueTokensData,
        owner1.address,
        GAS_LIMIT
      )).revertedWith('sender is not the executor');
    });

    it('SHOULD revert when tx is signed by non-owner', async () => {
      const [owner1, owner2, owner3, investor] = await hre.ethers.getSigners();
      const owners = [owner1, owner2, investor].sort((a, b) => {
        if (a.address < b.address) {
          return -1;
        }
        if (a.address > b.address) {
          return -1;
        }
        return 0;
      });
      const { dsToken, trustService, registryService, multisig } = await loadFixture(deployDSTokenRegulated);

      await trustService.setRole(await multisig.getAddress(), DSConstants.roles.ISSUER);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);

      const issueTokensData = dsToken.interface.encodeFunctionData('issueTokens', [investor.address, 100]);

      const message = {
        destination: await dsToken.getAddress(),
        value: 0,
        data: issueTokensData,
        nonce: 0,
        executor: owner1.address,
        gasLimit: GAS_LIMIT
      };

      const signatures = await multisigPreApproval(owners, await multisig.getAddress(), message);
      const sigsV: number[] = [];
      const sigsR: string[] = [];
      const sigsS: string[] = [];

      signatures.forEach((signature) => {
        sigsV.push(signature.v);
        sigsR.push(signature.r);
        sigsS.push(signature.s);
      });

      await expect(multisig.execute(
        sigsV,
        sigsR,
        sigsS,
        await dsToken.getAddress(),
        0,
        issueTokensData,
        owner1.address,
        GAS_LIMIT
      )).revertedWith('incorrect signature');
    });

    it('SHOULD revert when s,r,v have different length', async () => {
      const [owner1, owner2, owner3, investor] = await hre.ethers.getSigners();
      const owners = [owner1, owner2, owner3].sort((a, b) => {
        if (a.address < b.address) {
          return -1;
        }
        if (a.address > b.address) {
          return -1;
        }
        return 0;
      });
      const { dsToken, trustService, registryService, multisig } = await loadFixture(deployDSTokenRegulated);

      await trustService.setRole(await multisig.getAddress(), DSConstants.roles.ISSUER);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);

      const issueTokensData = dsToken.interface.encodeFunctionData('issueTokens', [investor.address, 100]);

      const message = {
        destination: await dsToken.getAddress(),
        value: 0,
        data: issueTokensData,
        nonce: 0,
        executor: owner1.address,
        gasLimit: GAS_LIMIT
      };

      const signatures = await multisigPreApproval(owners, await multisig.getAddress(), message);
      const sigsV: number[] = [];
      const sigsR: string[] = [];
      const sigsS: string[] = [];

      signatures.forEach((signature) => {
        sigsV.push(signature.v);
        sigsR.push(signature.r);
      });

      await expect(multisig.execute(
        sigsV,
        sigsR,
        sigsS,
        await dsToken.getAddress(),
        0,
        issueTokensData,
        owner1.address,
        GAS_LIMIT
      )).revertedWith('signature arrays with different length');
    });

    it('SHOULD revert when signing with wrong typed name', async () => {
      const [owner1, owner2, owner3, investor] = await hre.ethers.getSigners();
      const owners = [owner1, owner2, owner3].sort((a, b) => {
        if (a.address < b.address) {
          return -1;
        }
        if (a.address > b.address) {
          return -1;
        }
        return 0;
      });
      const { dsToken, trustService, registryService, multisig } = await loadFixture(deployDSTokenRegulated);

      await trustService.setRole(await multisig.getAddress(), DSConstants.roles.ISSUER);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);

      const issueTokensData = dsToken.interface.encodeFunctionData('issueTokens', [investor.address, 100]);

      const message = {
        destination: await dsToken.getAddress(),
        value: 0,
        data: issueTokensData,
        nonce: 0,
        executor: owner1.address,
        gasLimit: GAS_LIMIT
      };

      const domainDataWrongName = {
        name: 'wrong name',
        version: EIP712_MS_VERSION,
        chainId: (await hre.ethers.provider.getNetwork()).chainId,
        salt: SALT_MS
      };

      const signatures = await multisigPreApproval(owners, await multisig.getAddress(), message, domainDataWrongName);
      const sigsV: number[] = [];
      const sigsR: string[] = [];
      const sigsS: string[] = [];

      signatures.forEach((signature) => {
        sigsV.push(signature.v);
        sigsR.push(signature.r);
        sigsS.push(signature.s);
      });

      await expect(multisig.execute(
        sigsV,
        sigsR,
        sigsS,
        await dsToken.getAddress(),
        0,
        issueTokensData,
        owner1.address,
        GAS_LIMIT
      )).revertedWith('incorrect signature');
    });

    it('SHOULD revert when signing with wrong typed version', async () => {
      const [owner1, owner2, owner3, investor] = await hre.ethers.getSigners();
      const owners = [owner1, owner2, owner3].sort((a, b) => {
        if (a.address < b.address) {
          return -1;
        }
        if (a.address > b.address) {
          return -1;
        }
        return 0;
      });
      const { dsToken, trustService, registryService, multisig } = await loadFixture(deployDSTokenRegulated);

      await trustService.setRole(await multisig.getAddress(), DSConstants.roles.ISSUER);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);

      const issueTokensData = dsToken.interface.encodeFunctionData('issueTokens', [investor.address, 100]);

      const message = {
        destination: await dsToken.getAddress(),
        value: 0,
        data: issueTokensData,
        nonce: 0,
        executor: owner1.address,
        gasLimit: GAS_LIMIT
      };

      const domainDataWrongName = {
        name: EIP712_MS_NAME,
        version: 'wrong version',
        chainId: (await hre.ethers.provider.getNetwork()).chainId,
        salt: SALT_MS
      };

      const signatures = await multisigPreApproval(owners, await multisig.getAddress(), message, domainDataWrongName);
      const sigsV: number[] = [];
      const sigsR: string[] = [];
      const sigsS: string[] = [];

      signatures.forEach((signature) => {
        sigsV.push(signature.v);
        sigsR.push(signature.r);
        sigsS.push(signature.s);
      });

      await expect(multisig.execute(
        sigsV,
        sigsR,
        sigsS,
        await dsToken.getAddress(),
        0,
        issueTokensData,
        owner1.address,
        GAS_LIMIT
      )).revertedWith('incorrect signature');
    });

    it('SHOULD revert when signing with wrong domain data', async () => {
      const [owner1, owner2, owner3, investor] = await hre.ethers.getSigners();
      const owners = [owner1, owner2, owner3].sort((a, b) => {
        if (a.address < b.address) {
          return -1;
        }
        if (a.address > b.address) {
          return -1;
        }
        return 0;
      });
      const { dsToken, trustService, registryService, multisig } = await loadFixture(deployDSTokenRegulated);

      await trustService.setRole(await multisig.getAddress(), DSConstants.roles.ISSUER);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, investor, registryService);

      const issueTokensData = dsToken.interface.encodeFunctionData('issueTokens', [investor.address, 100]);

      const message = {
        destination: await dsToken.getAddress(),
        value: 0,
        data: issueTokensData,
        nonce: 0,
        executor: owner1.address,
        gasLimit: GAS_LIMIT
      };

      const domainDataWrongName = {
        name: EIP712_MS_NAME,
        version: EIP712_MS_VERSION,
        chainId: (await hre.ethers.provider.getNetwork()).chainId + 1n,
        salt: SALT_MS
      };

      const signatures = await multisigPreApproval(owners, await multisig.getAddress(), message, domainDataWrongName);
      const sigsV: number[] = [];
      const sigsR: string[] = [];
      const sigsS: string[] = [];

      signatures.forEach((signature) => {
        sigsV.push(signature.v);
        sigsR.push(signature.r);
        sigsS.push(signature.s);
      });

      await expect(multisig.execute(
        sigsV,
        sigsR,
        sigsS,
        await dsToken.getAddress(),
        0,
        issueTokensData,
        owner1.address,
        GAS_LIMIT
      )).revertedWith('incorrect signature');
    });
  });
});
