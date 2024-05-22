import { expect } from 'chai';
import hre from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { deployDSTokenRegulated, INVESTORS } from './utils/fixture';
import { DSConstants } from '../utils/globals';
import { multisigPreApproval, registerInvestor } from './utils/test-helper';

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
});
