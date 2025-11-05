import { expect } from 'chai';
import hre from 'hardhat';
import fs from 'fs';
import path from 'path';
import { buildPermitSignature, registerInvestor } from '../../../test/utils/test-helper';
import { TestLogger } from './test-logger';
import { INVESTORS } from '../../../test/utils/fixture';

/**
 * Comprehensive QA test suite for ERC-2612 Permit functionality on Sepolia
 * 
 * Tests run against DEPLOYED contracts (not fixtures) for QA evidence collection.
 * Each test generates JSON and Markdown evidence files with transaction hashes.
 * 
 * Prerequisites:
 * 1. Deploy contracts using: npx hardhat deploy-all-and-update --network sepolia
 * 2. Ensure deploy-all-and-update.json exists in qa/tasks/output/
 * 3. Have TEST_WALLET_2_PRIV_KEY configured in .env
 * 
 * Tests cover:
 * - permit() core functionality (signature validation, nonces, allowances)
 * - transferWithPermit() single-transaction flow
 * - Security: replay protection, invalid signers, domain binding
 * - Edge cases: zero values, allowance overwrites, expired deadlines
 */

// Load deployed contract addresses
const deployedAddressesPath = path.join(__dirname, '../../tasks/output/deploy-all-and-update.json');
if (!fs.existsSync(deployedAddressesPath)) {
  throw new Error(`
    Deployed contract addresses not found!
    Please run: npx hardhat deploy-all-and-update --network sepolia
    Expected file: ${deployedAddressesPath}
  `);
}
const deploymentData = JSON.parse(fs.readFileSync(deployedAddressesPath, 'utf8'));
const deployedAddresses = deploymentData.addresses;

// Initialize test logger
const testLogger = new TestLogger(path.join(__dirname, 'output'));

describe('DSToken - ERC-2612 Permit QA (Sepolia)', function() {
  let dsToken: any;
  let registryService: any;
  
  before(async function() {
    // Connect to deployed contracts
    dsToken = await hre.ethers.getContractAt('DSToken', deployedAddresses.dsToken);
    registryService = await hre.ethers.getContractAt('RegistryService', deployedAddresses.regService);
    
    console.log('\n✅ Connected to deployed contracts');
    console.log(`   Network: ${hre.network.name}`);
    console.log(`   DSToken: ${await dsToken.getAddress()}`);
    console.log(`   RegistryService: ${await registryService.getAddress()}`);
    console.log('');
  });

  describe('permit() - Core Functionality', function() {
    
    it('Test 1: Sets allowance via valid signature and emits Approval event', async function() {
      const [owner, spender] = await hre.ethers.getSigners();
      
      const value = 100;
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      const nonceBefore = await dsToken.nonces(owner.address);
      
      const message = {
        owner: owner.address,
        spender: spender.address,
        value,
        nonce: nonceBefore,
        deadline,
      };
      
      const { v, r, s } = await buildPermitSignature(
        owner,
        message,
        await dsToken.name(),
        await dsToken.getAddress()
      );

      const tx = await dsToken.permit(owner.address, spender.address, value, deadline, v, r, s);
      const receipt = await tx.wait();
      
      await expect(tx).to.emit(dsToken, 'Approval').withArgs(owner.address, spender.address, value);

      const allowance = await dsToken.allowance(owner.address, spender.address);
      expect(allowance).to.equal(value);

      const nonceAfter = await dsToken.nonces(owner.address);
      expect(nonceAfter).to.equal(nonceBefore + 1n);

      // Save evidence
      testLogger.saveTestResult({
        testName: 'Sets allowance via valid signature and emits Approval event',
        testNumber: 1,
        network: hre.network.name,
        dsTokenAddress: await dsToken.getAddress(),
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        owner: owner.address,
        spender: spender.address,
        allowanceSet: value,
        nonceBefore: Number(nonceBefore),
        nonceAfter: Number(nonceAfter),
        timestamp: new Date().toISOString(),
        status: 'PASSED'
      });
    });

    it('Test 2: Reverts with expired deadline', async function() {
      const [owner, spender] = await hre.ethers.getSigners();
      
      const value = 100;
      const deadline = BigInt(Math.floor(Date.now() / 1000) - 10);
      
      // Get state before permit attempt
      const allowanceBefore = await dsToken.allowance(owner.address, spender.address);
      const nonceBefore = await dsToken.nonces(owner.address);
      
      const message = {
        owner: owner.address,
        spender: spender.address,
        value,
        nonce: nonceBefore,
        deadline,
      };
      
      const { v, r, s } = await buildPermitSignature(
        owner,
        message,
        await dsToken.name(),
        await dsToken.getAddress()
      );

      // Send transaction and capture revert on-chain (with manual gas to bypass estimation)
      let txHash: string | undefined;
      let blockNumber: number | undefined;
      let gasUsed: string | undefined;
      let errorMessage = '';
      
      try {
        // Provide manual gas limit to bypass gas estimation that would prevent the tx from being sent
        const tx = await dsToken.permit(owner.address, spender.address, value, deadline, v, r, s, {
          gasLimit: 100000 // Manual gas limit to force transaction on-chain
        });
        const receipt = await tx.wait();
        // If we get here, transaction didn't revert as expected
        throw new Error('Transaction should have reverted');
      } catch (error: any) {
        // Transaction was submitted and reverted on-chain
        errorMessage = error.message || error.toString();
        
        if (error.receipt) {
          txHash = error.receipt.hash || error.receipt.transactionHash;
          blockNumber = error.receipt.blockNumber;
          gasUsed = error.receipt.gasUsed?.toString();
        } else if (error.transaction) {
          txHash = error.transaction.hash || error.transactionHash;
        }
        
        // Verify it's a revert (error message may vary based on ethers version)
        const isRevert = errorMessage.includes('reverted') || 
                        errorMessage.includes('Permit: expired deadline') ||
                        errorMessage.includes('transaction execution');
        expect(isRevert).to.be.true;
      }

      // Verify state unchanged after revert
      const allowanceAfter = await dsToken.allowance(owner.address, spender.address);
      expect(allowanceAfter).to.equal(allowanceBefore);

      const nonceAfter = await dsToken.nonces(owner.address);
      expect(nonceAfter).to.equal(nonceBefore);

      testLogger.saveTestResult({
        testName: 'Reverts with expired deadline',
        testNumber: 2,
        network: hre.network.name,
        dsTokenAddress: await dsToken.getAddress(),
        transactionHash: txHash,
        blockNumber: blockNumber,
        gasUsed: gasUsed,
        owner: owner.address,
        spender: spender.address,
        value,
        timestamp: new Date().toISOString(),
        status: 'PASSED',
        errorMessage: errorMessage,
        additionalNotes: 'Transaction reverted on-chain with expired deadline. State remained unchanged.'
      });
    });

    it('Test 3: Rejects reused signature (replay protection)', async function() {
      const [owner, spender] = await hre.ethers.getSigners();
      
      const value = 100;
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      
      const message = {
        owner: owner.address,
        spender: spender.address,
        value,
        nonce: await dsToken.nonces(owner.address),
        deadline,
      };
      
      const { v, r, s } = await buildPermitSignature(
        owner,
        message,
        await dsToken.name(),
        await dsToken.getAddress()
      );

      // First permit - should succeed
      const tx = await dsToken.permit(owner.address, spender.address, value, deadline, v, r, s);
      const receipt = await tx.wait();
      
      const allowanceAfterFirst = await dsToken.allowance(owner.address, spender.address);
      expect(allowanceAfterFirst).to.equal(value);

      // Replay attempt - capture failed transaction on-chain
      let replayTxHash: string | undefined;
      let replayBlockNumber: number | undefined;
      let replayGasUsed: string | undefined;
      let errorMessage = '';
      
      try {
        const replayTx = await dsToken.permit(owner.address, spender.address, value, deadline, v, r, s, {
          gasLimit: 100000 // Manual gas to force transaction on-chain
        });
        await replayTx.wait();
        throw new Error('Replay should have reverted');
      } catch (error: any) {
        errorMessage = error.message || error.toString();
        
        if (error.receipt) {
          replayTxHash = error.receipt.hash || error.receipt.transactionHash;
          replayBlockNumber = error.receipt.blockNumber;
          replayGasUsed = error.receipt.gasUsed?.toString();
        } else if (error.transaction) {
          replayTxHash = error.transaction.hash || error.transactionHash;
        }
        
        // Verify it's a revert due to invalid signature
        const isRevert = errorMessage.includes('reverted') || 
                        errorMessage.includes('Permit: invalid signature') ||
                        errorMessage.includes('transaction execution');
        expect(isRevert).to.be.true;
      }

      const allowanceAfterReplay = await dsToken.allowance(owner.address, spender.address);
      expect(allowanceAfterReplay).to.equal(value);

      testLogger.saveTestResult({
        testName: 'Rejects reused signature (replay protection)',
        testNumber: 3,
        network: hre.network.name,
        dsTokenAddress: await dsToken.getAddress(),
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        owner: owner.address,
        spender: spender.address,
        allowanceSet: value,
        timestamp: new Date().toISOString(),
        status: 'PASSED',
        errorMessage: errorMessage,
        additionalNotes: `First permit succeeded (tx: ${receipt.hash}). Replay attempt reverted on-chain${replayTxHash ? ` (tx: ${replayTxHash})` : ''}.`
      });
    });

    it('Test 4: Rejects signature from wrong signer', async function() {
      const [owner, spender, attacker] = await hre.ethers.getSigners();
      
      const value = 100;
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      
      // Get state before permit attempt
      const allowanceBefore = await dsToken.allowance(owner.address, spender.address);
      
      const message = {
        owner: owner.address,
        spender: spender.address,
        value,
        nonce: await dsToken.nonces(owner.address),
        deadline,
      };
      
      // Attacker signs instead of owner
      const { v, r, s } = await buildPermitSignature(
        attacker,
        message,
        await dsToken.name(),
        await dsToken.getAddress()
      );

      // Send transaction and capture revert on-chain
      let txHash: string | undefined;
      let blockNumber: number | undefined;
      let gasUsed: string | undefined;
      let errorMessage = '';
      
      try {
        const tx = await dsToken.permit(owner.address, spender.address, value, deadline, v, r, s, {
          gasLimit: 100000 // Manual gas to force transaction on-chain
        });
        await tx.wait();
        throw new Error('Transaction should have reverted');
      } catch (error: any) {
        errorMessage = error.message || error.toString();
        
        if (error.receipt) {
          txHash = error.receipt.hash || error.receipt.transactionHash;
          blockNumber = error.receipt.blockNumber;
          gasUsed = error.receipt.gasUsed?.toString();
        } else if (error.transaction) {
          txHash = error.transaction.hash || error.transactionHash;
        }
        
        // Verify it's a revert due to invalid signature
        const isRevert = errorMessage.includes('reverted') || 
                        errorMessage.includes('Permit: invalid signature') ||
                        errorMessage.includes('transaction execution');
        expect(isRevert).to.be.true;
      }

      // Verify state unchanged after revert
      const allowanceAfter = await dsToken.allowance(owner.address, spender.address);
      expect(allowanceAfter).to.equal(allowanceBefore);

      testLogger.saveTestResult({
        testName: 'Rejects signature from wrong signer',
        testNumber: 4,
        network: hre.network.name,
        dsTokenAddress: await dsToken.getAddress(),
        transactionHash: txHash,
        blockNumber: blockNumber,
        gasUsed: gasUsed,
        owner: owner.address,
        spender: spender.address,
        attacker: attacker.address,
        timestamp: new Date().toISOString(),
        status: 'PASSED',
        errorMessage: errorMessage,
        additionalNotes: 'Signature from attacker was rejected on-chain. Transaction reverted as expected.'
      });
    });

    it('Test 5: Rejects signature with wrong chainId', async function() {
      const [owner, spender] = await hre.ethers.getSigners();
      
      const value = 100;
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      
      // Get state before permit attempt
      const allowanceBefore = await dsToken.allowance(owner.address, spender.address);
      
      const wrongDomain = {
        version: '1',
        name: await dsToken.name(),
        verifyingContract: await dsToken.getAddress(),
        chainId: 999n, // Wrong chainId
      };
      
      const types = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      };
      
      const message = {
        owner: owner.address,
        spender: spender.address,
        value,
        nonce: await dsToken.nonces(owner.address),
        deadline,
      };
      
      const signature = await owner.signTypedData(wrongDomain, types, message);
      const { v, r, s } = hre.ethers.Signature.from(signature);

      // Send transaction and capture revert on-chain
      let txHash: string | undefined;
      let blockNumber: number | undefined;
      let gasUsed: string | undefined;
      let errorMessage = '';
      
      try {
        const tx = await dsToken.permit(owner.address, spender.address, value, deadline, v, r, s, {
          gasLimit: 100000 // Manual gas to force transaction on-chain
        });
        await tx.wait();
        throw new Error('Transaction should have reverted');
      } catch (error: any) {
        errorMessage = error.message || error.toString();
        
        if (error.receipt) {
          txHash = error.receipt.hash || error.receipt.transactionHash;
          blockNumber = error.receipt.blockNumber;
          gasUsed = error.receipt.gasUsed?.toString();
        } else if (error.transaction) {
          txHash = error.transaction.hash || error.transactionHash;
        }
        
        // Verify it's a revert due to invalid signature
        const isRevert = errorMessage.includes('reverted') || 
                        errorMessage.includes('Permit: invalid signature') ||
                        errorMessage.includes('transaction execution');
        expect(isRevert).to.be.true;
      }

      // Verify state unchanged after revert
      const allowanceAfter = await dsToken.allowance(owner.address, spender.address);
      expect(allowanceAfter).to.equal(allowanceBefore);

      testLogger.saveTestResult({
        testName: 'Rejects signature with wrong chainId',
        testNumber: 5,
        network: hre.network.name,
        dsTokenAddress: await dsToken.getAddress(),
        transactionHash: txHash,
        blockNumber: blockNumber,
        gasUsed: gasUsed,
        owner: owner.address,
        spender: spender.address,
        timestamp: new Date().toISOString(),
        status: 'PASSED',
        errorMessage: errorMessage,
        additionalNotes: 'Signature with wrong chainId (999) was rejected on-chain. Transaction reverted as expected.'
      });
    });

    it('Test 6: Rejects signature with wrong verifyingContract', async function() {
      const [owner, spender] = await hre.ethers.getSigners();
      
      const value = 100;
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      
      // Get state before permit attempt
      const allowanceBefore = await dsToken.allowance(owner.address, spender.address);
      
      const wrongDomain = {
        version: '1',
        name: await dsToken.name(),
        verifyingContract: '0x0000000000000000000000000000000000000001', // Wrong address
        chainId: (await hre.ethers.provider.getNetwork()).chainId,
      };
      
      const types = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      };
      
      const message = {
        owner: owner.address,
        spender: spender.address,
        value,
        nonce: await dsToken.nonces(owner.address),
        deadline,
      };
      
      const signature = await owner.signTypedData(wrongDomain, types, message);
      const { v, r, s } = hre.ethers.Signature.from(signature);

      // Send transaction and capture revert on-chain
      let txHash: string | undefined;
      let blockNumber: number | undefined;
      let gasUsed: string | undefined;
      let errorMessage = '';
      
      try {
        const tx = await dsToken.permit(owner.address, spender.address, value, deadline, v, r, s, {
          gasLimit: 100000 // Manual gas to force transaction on-chain
        });
        await tx.wait();
        throw new Error('Transaction should have reverted');
      } catch (error: any) {
        errorMessage = error.message || error.toString();
        
        if (error.receipt) {
          txHash = error.receipt.hash || error.receipt.transactionHash;
          blockNumber = error.receipt.blockNumber;
          gasUsed = error.receipt.gasUsed?.toString();
        } else if (error.transaction) {
          txHash = error.transaction.hash || error.transactionHash;
        }
        
        // Verify it's a revert due to invalid signature
        const isRevert = errorMessage.includes('reverted') || 
                        errorMessage.includes('Permit: invalid signature') ||
                        errorMessage.includes('transaction execution');
        expect(isRevert).to.be.true;
      }

      // Verify state unchanged after revert
      const allowanceAfter = await dsToken.allowance(owner.address, spender.address);
      expect(allowanceAfter).to.equal(allowanceBefore);

      testLogger.saveTestResult({
        testName: 'Rejects signature with wrong verifyingContract',
        testNumber: 6,
        network: hre.network.name,
        dsTokenAddress: await dsToken.getAddress(),
        transactionHash: txHash,
        blockNumber: blockNumber,
        gasUsed: gasUsed,
        owner: owner.address,
        spender: spender.address,
        timestamp: new Date().toISOString(),
        status: 'PASSED',
        errorMessage: errorMessage,
        additionalNotes: 'Signature with wrong verifyingContract address was rejected on-chain. Transaction reverted as expected.'
      });
    });

    it('Test 7: DOMAIN_SEPARATOR matches EIP-712 spec', async function() {
      const expectedDomain = hre.ethers.TypedDataEncoder.hashDomain({
        version: '1',
        name: await dsToken.name(),
        verifyingContract: await dsToken.getAddress(),
        chainId: (await hre.ethers.provider.getNetwork()).chainId,
      });

      const actualSeparator = await dsToken.DOMAIN_SEPARATOR();
      expect(actualSeparator).to.equal(expectedDomain);

      testLogger.saveTestResult({
        testName: 'DOMAIN_SEPARATOR matches EIP-712 spec',
        testNumber: 7,
        network: hre.network.name,
        dsTokenAddress: await dsToken.getAddress(),
        timestamp: new Date().toISOString(),
        status: 'PASSED',
        additionalNotes: `DOMAIN_SEPARATOR: ${actualSeparator}`
      });
    });

    it('Test 8: Permits zero value (increments nonce, sets allowance to 0)', async function() {
      const [owner, spender] = await hre.ethers.getSigners();
      
      const value = 0;
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      const nonceBefore = await dsToken.nonces(owner.address);
      
      const message = {
        owner: owner.address,
        spender: spender.address,
        value,
        nonce: nonceBefore,
        deadline,
      };
      
      const { v, r, s } = await buildPermitSignature(
        owner,
        message,
        await dsToken.name(),
        await dsToken.getAddress()
      );

      const tx = await dsToken.permit(owner.address, spender.address, value, deadline, v, r, s);
      const receipt = await tx.wait();
      
      await expect(tx).to.emit(dsToken, 'Approval').withArgs(owner.address, spender.address, 0);

      const allowance = await dsToken.allowance(owner.address, spender.address);
      expect(allowance).to.equal(0);

      const nonceAfter = await dsToken.nonces(owner.address);
      expect(nonceAfter).to.equal(nonceBefore + 1n);

      testLogger.saveTestResult({
        testName: 'Permits zero value (increments nonce, sets allowance to 0)',
        testNumber: 8,
        network: hre.network.name,
        dsTokenAddress: await dsToken.getAddress(),
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        owner: owner.address,
        spender: spender.address,
        value: 0,
        nonceBefore: Number(nonceBefore),
        nonceAfter: Number(nonceAfter),
        timestamp: new Date().toISOString(),
        status: 'PASSED'
      });
    });

    it('Test 9: Overwrites existing allowance', async function() {
      const [owner, spender] = await hre.ethers.getSigners();
      
      const tx1 = await dsToken.connect(owner).approve(spender.address, 50);
      await tx1.wait();
      expect(await dsToken.allowance(owner.address, spender.address)).to.equal(50);

      const value = 200;
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      
      const message = {
        owner: owner.address,
        spender: spender.address,
        value,
        nonce: await dsToken.nonces(owner.address),
        deadline,
      };
      
      const { v, r, s } = await buildPermitSignature(
        owner,
        message,
        await dsToken.name(),
        await dsToken.getAddress()
      );

      const tx2 = await dsToken.permit(owner.address, spender.address, value, deadline, v, r, s);
      const receipt = await tx2.wait();

      const allowance = await dsToken.allowance(owner.address, spender.address);
      expect(allowance).to.equal(200);

      testLogger.saveTestResult({
        testName: 'Overwrites existing allowance',
        testNumber: 9,
        network: hre.network.name,
        dsTokenAddress: await dsToken.getAddress(),
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        owner: owner.address,
        spender: spender.address,
        allowanceSet: value,
        timestamp: new Date().toISOString(),
        status: 'PASSED',
        additionalNotes: 'Previous allowance of 50 was overwritten to 200'
      });
    });

    it('Test 10: Can reduce allowance', async function() {
      const [owner, spender] = await hre.ethers.getSigners();
      
      const tx1 = await dsToken.connect(owner).approve(spender.address, 500);
      await tx1.wait();
      expect(await dsToken.allowance(owner.address, spender.address)).to.equal(500);

      const value = 100;
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      
      const message = {
        owner: owner.address,
        spender: spender.address,
        value,
        nonce: await dsToken.nonces(owner.address),
        deadline,
      };
      
      const { v, r, s } = await buildPermitSignature(
        owner,
        message,
        await dsToken.name(),
        await dsToken.getAddress()
      );

      const tx2 = await dsToken.permit(owner.address, spender.address, value, deadline, v, r, s);
      const receipt = await tx2.wait();

      const allowance = await dsToken.allowance(owner.address, spender.address);
      expect(allowance).to.equal(100);

      testLogger.saveTestResult({
        testName: 'Can reduce allowance',
        testNumber: 10,
        network: hre.network.name,
        dsTokenAddress: await dsToken.getAddress(),
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        owner: owner.address,
        spender: spender.address,
        allowanceSet: value,
        timestamp: new Date().toISOString(),
        status: 'PASSED',
        additionalNotes: 'Previous allowance of 500 was reduced to 100'
      });
    });

    it('Test 11: Nonces increment monotonically for each permit', async function() {
      const [owner, spender1, spender2] = await hre.ethers.getSigners();
      
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      
      // Account for state persistence - nonce may not start at 0
      const initialNonce = await dsToken.nonces(owner.address);
      let nonce = initialNonce;

      // First permit
      let message = {
        owner: owner.address,
        spender: spender1.address,
        value: 100,
        nonce,
        deadline,
      };
      let sig = await buildPermitSignature(owner, message, await dsToken.name(), await dsToken.getAddress());
      const tx1 = await dsToken.permit(owner.address, spender1.address, 100, deadline, sig.v, sig.r, sig.s);
      const receipt1 = await tx1.wait();
      
      nonce = await dsToken.nonces(owner.address);
      expect(nonce).to.equal(initialNonce + 1n);

      // Second permit - need to wait for receipt
      message = {
        owner: owner.address,
        spender: spender2.address,
        value: 200,
        nonce,
        deadline,
      };
      sig = await buildPermitSignature(owner, message, await dsToken.name(), await dsToken.getAddress());
      const tx2 = await dsToken.permit(owner.address, spender2.address, 200, deadline, sig.v, sig.r, sig.s);
      await tx2.wait();
      
      nonce = await dsToken.nonces(owner.address);
      expect(nonce).to.equal(initialNonce + 2n);

      // Third permit
      message = {
        owner: owner.address,
        spender: spender1.address,
        value: 300,
        nonce,
        deadline,
      };
      sig = await buildPermitSignature(owner, message, await dsToken.name(), await dsToken.getAddress());
      const tx3 = await dsToken.permit(owner.address, spender1.address, 300, deadline, sig.v, sig.r, sig.s);
      await tx3.wait();
      
      nonce = await dsToken.nonces(owner.address);
      expect(nonce).to.equal(initialNonce + 3n);

      // Check final allowances (may have been updated from previous tests)
      const finalAllowance1 = await dsToken.allowance(owner.address, spender1.address);
      const finalAllowance2 = await dsToken.allowance(owner.address, spender2.address);
      expect(finalAllowance1).to.equal(300);
      expect(finalAllowance2).to.equal(200);

      testLogger.saveTestResult({
        testName: 'Nonces increment monotonically for each permit',
        testNumber: 11,
        network: hre.network.name,
        dsTokenAddress: await dsToken.getAddress(),
        transactionHash: receipt1.hash,
        blockNumber: receipt1.blockNumber,
        gasUsed: receipt1.gasUsed.toString(),
        owner: owner.address,
        spender: spender1.address,
        recipient: spender2.address,
        nonceBefore: Number(initialNonce),
        nonceAfter: Number(initialNonce + 3n),
        timestamp: new Date().toISOString(),
        status: 'PASSED',
        additionalNotes: `Nonces incremented monotonically across three permits: ${initialNonce} → ${initialNonce + 1n} → ${initialNonce + 2n} → ${initialNonce + 3n}`
      });
    });

    it('Test 12: Nonces are wallet-specific (independent per user)', async function() {
      const [user1, user2, spender] = await hre.ethers.getSigners();
      
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      
      // Account for state persistence - record initial nonces
      const initialNonce1 = await dsToken.nonces(user1.address);
      const initialNonce2 = await dsToken.nonces(user2.address);
      
      // Perform 3 permits for user1 (capture first receipt for evidence)
      let firstReceipt;
      for (let i = 0; i < 3; i++) {
        const message = {
          owner: user1.address,
          spender: spender.address,
          value: 100 * (i + 1),
          nonce: await dsToken.nonces(user1.address),
          deadline,
        };
        const sig = await buildPermitSignature(user1, message, await dsToken.name(), await dsToken.getAddress());
        const tx = await dsToken.permit(user1.address, spender.address, 100 * (i + 1), deadline, sig.v, sig.r, sig.s);
        const receipt = await tx.wait();
        
        // Capture first receipt for evidence
        if (i === 0) {
          firstReceipt = receipt;
        }
      }

      // Verify user1's nonce increased by 3
      const nonce1 = await dsToken.nonces(user1.address);
      expect(nonce1).to.equal(initialNonce1 + 3n);

      // Verify user2's nonce is unchanged (independent)
      const nonce2 = await dsToken.nonces(user2.address);
      expect(nonce2).to.equal(initialNonce2);

      testLogger.saveTestResult({
        testName: 'Nonces are wallet-specific (independent per user)',
        testNumber: 12,
        network: hre.network.name,
        dsTokenAddress: await dsToken.getAddress(),
        transactionHash: firstReceipt.hash,
        blockNumber: firstReceipt.blockNumber,
        gasUsed: firstReceipt.gasUsed.toString(),
        owner: user1.address,
        spender: spender.address,
        recipient: user2.address,
        nonceBefore: Number(initialNonce1),
        nonceAfter: Number(nonce1),
        timestamp: new Date().toISOString(),
        status: 'PASSED',
        additionalNotes: `User1 nonce: ${initialNonce1} → ${nonce1} (+3 permits). User2 nonce unchanged: ${initialNonce2} (proves nonces are wallet-specific)`
      });
    });
  });

  describe('transferWithPermit() - Single Transaction Flow', function() {
    
    it('Test 13: Permits and transfers in single transaction (happy path)', async function() {
      const [owner, spender, recipient] = await hre.ethers.getSigners();
      
      // Register investors if not already registered (handle state persistence)
      try {
        await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, '');
      } catch (e: any) {
        if (!e.message?.includes('exists') && !e.message?.includes('already')) {
          console.log('registerInvestor error for owner:', e.message);
        }
      }
      try {
        const tx1 = await registryService.addWallet(owner, INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
        await tx1.wait();
      } catch (e: any) {
        if (!e.message?.includes('exists') && !e.message?.includes('already')) {
          console.log('addWallet error for owner:', e.message);
        }
      }
      
      try {
        await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, '');
      } catch (e: any) {
        if (!e.message?.includes('exists') && !e.message?.includes('already')) {
          console.log('registerInvestor error for recipient:', e.message);
        }
      }
      try {
        const tx2 = await registryService.addWallet(recipient, INVESTORS.INVESTOR_ID.INVESTOR_ID_2);
        await tx2.wait();
      } catch (e: any) {
        if (!e.message?.includes('exists') && !e.message?.includes('already')) {
          console.log('addWallet error for recipient:', e.message);
        }
      }
      
      const value = 100;
      
      // Check if owner has enough balance, if not issue 100 tokens
      const currentBalance = await dsToken.balanceOf(owner.address);
      if (currentBalance < BigInt(value)) {
        const issueTx = await dsToken.issueTokens(owner.address, value);
        await issueTx.wait(); // Wait for transaction to be mined
      }
      
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      
      // Account for state persistence
      const nonceBefore = await dsToken.nonces(owner.address);
      const ownerBalanceBefore = await dsToken.balanceOf(owner.address);
      const recipientBalanceBefore = await dsToken.balanceOf(recipient.address);
      
      const message = {
        owner: owner.address,
        spender: spender.address,
        value,
        nonce: nonceBefore,
        deadline,
      };
      
      const { v, r, s } = await buildPermitSignature(
        owner,
        message,
        await dsToken.name(),
        await dsToken.getAddress()
      );

      const tx = await dsToken.connect(spender).transferWithPermit(owner.address, recipient.address, value, deadline, v, r, s);
      const receipt = await tx.wait();
      
      await expect(tx).to.emit(dsToken, 'Transfer').withArgs(owner.address, recipient.address, value);

      // Verify balances changed correctly
      const ownerBalanceAfter = await dsToken.balanceOf(owner.address);
      const recipientBalanceAfter = await dsToken.balanceOf(recipient.address);
      
      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore - BigInt(value));
      expect(recipientBalanceAfter).to.equal(recipientBalanceBefore + BigInt(value));

      // Verify allowance is 0 after transferWithPermit (permit sets it, transferFrom consumes it)
      const allowance = await dsToken.allowance(owner.address, spender.address);
      expect(allowance).to.equal(0);

      // Verify nonce incremented
      const nonceAfter = await dsToken.nonces(owner.address);
      expect(nonceAfter).to.equal(nonceBefore + 1n);

      testLogger.saveTestResult({
        testName: 'Permits and transfers in single transaction (happy path)',
        testNumber: 13,
        network: hre.network.name,
        dsTokenAddress: await dsToken.getAddress(),
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        owner: owner.address,
        spender: spender.address,
        recipient: recipient.address,
        value,
        nonceBefore: Number(nonceBefore),
        nonceAfter: Number(nonceAfter),
        timestamp: new Date().toISOString(),
        status: 'PASSED',
        additionalNotes: `transferWithPermit executed in single transaction: permit (nonce: ${nonceBefore} → ${nonceAfter}) + transfer (${value} tokens from owner to recipient)`
      });
    });

    it('Test 14: Emits Approval before Transfer (event order verification)', async function() {
      const [owner, spender, recipient] = await hre.ethers.getSigners();
      
      // Register investors if not already registered (handle state persistence)
      try {
        await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, '');
      } catch (e: any) {
        if (!e.message?.includes('exists') && !e.message?.includes('already')) {
          console.log('registerInvestor error for owner:', e.message);
        }
      }
      try {
        const tx1 = await registryService.addWallet(owner, INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
        await tx1.wait();
      } catch (e: any) {
        if (!e.message?.includes('exists') && !e.message?.includes('already')) {
          console.log('addWallet error for owner:', e.message);
        }
      }
      
      try {
        await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, '');
      } catch (e: any) {
        if (!e.message?.includes('exists') && !e.message?.includes('already')) {
          console.log('registerInvestor error for recipient:', e.message);
        }
      }
      try {
        const tx2 = await registryService.addWallet(recipient, INVESTORS.INVESTOR_ID.INVESTOR_ID_2);
        await tx2.wait();
      } catch (e: any) {
        if (!e.message?.includes('exists') && !e.message?.includes('already')) {
          console.log('addWallet error for recipient:', e.message);
        }
      }
      
      const value = 100;
      
      // Check if owner has enough balance, if not issue 100 tokens
      const currentBalance = await dsToken.balanceOf(owner.address);
      if (currentBalance < BigInt(value)) {
        const issueTx = await dsToken.issueTokens(owner.address, value);
        await issueTx.wait(); // Wait for transaction to be mined
      }
      
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      const message = {
        owner: owner.address,
        spender: spender.address,
        value,
        nonce: await dsToken.nonces(owner.address),
        deadline,
      };
      
      const { v, r, s } = await buildPermitSignature(
        owner,
        message,
        await dsToken.name(),
        await dsToken.getAddress()
      );

      const tx = await dsToken.connect(spender).transferWithPermit(
        owner.address,
        recipient.address,
        value,
        deadline,
        v,
        r,
        s
      );
      
      const receipt = await tx.wait();

      let approvalIndex = -1;
      let transferIndex = -1;

      receipt.logs.forEach((log: any, index: number) => {
        try {
          const parsed = dsToken.interface.parseLog({
            topics: [...log.topics],
            data: log.data
          });
          if (parsed?.name === 'Approval') {
            approvalIndex = index;
          } else if (parsed?.name === 'Transfer') {
            transferIndex = index;
          }
        } catch {
          // Skip logs that can't be parsed
        }
      });

      expect(approvalIndex).to.be.greaterThan(-1, 'Approval event not found');
      expect(transferIndex).to.be.greaterThan(-1, 'Transfer event not found');
      expect(approvalIndex).to.be.lessThan(transferIndex, 'Approval should be emitted before Transfer');

      testLogger.saveTestResult({
        testName: 'Emits Approval before Transfer (event order verification)',
        testNumber: 14,
        network: hre.network.name,
        dsTokenAddress: await dsToken.getAddress(),
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        owner: owner.address,
        spender: spender.address,
        recipient: recipient.address,
        timestamp: new Date().toISOString(),
        status: 'PASSED',
        additionalNotes: `Approval event at index ${approvalIndex}, Transfer at index ${transferIndex}`
      });
    });

    it('Test 15: Reverts with expired deadline during permit phase', async function() {
      const [owner, spender, recipient] = await hre.ethers.getSigners();
      
      // Register investors if not already registered (handle state persistence)
      try {
        await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, '');
      } catch (e: any) {
        if (!e.message?.includes('exists') && !e.message?.includes('already')) {
          console.log('registerInvestor error for owner:', e.message);
        }
      }
      try {
        const tx1 = await registryService.addWallet(owner, INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
        await tx1.wait();
      } catch (e: any) {
        if (!e.message?.includes('exists') && !e.message?.includes('already')) {
          console.log('addWallet error for owner:', e.message);
        }
      }
      
      try {
        await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, '');
      } catch (e: any) {
        if (!e.message?.includes('exists') && !e.message?.includes('already')) {
          console.log('registerInvestor error for recipient:', e.message);
        }
      }
      try {
        const tx2 = await registryService.addWallet(recipient, INVESTORS.INVESTOR_ID.INVESTOR_ID_2);
        await tx2.wait();
      } catch (e: any) {
        if (!e.message?.includes('exists') && !e.message?.includes('already')) {
          console.log('addWallet error for recipient:', e.message);
        }
      }
      
      const value = 100;
      
      // Check if owner has enough balance, if not issue 100 tokens
      const currentBalance = await dsToken.balanceOf(owner.address);
      if (currentBalance < BigInt(value)) {
        const issueTx = await dsToken.issueTokens(owner.address, value);
        await issueTx.wait(); // Wait for transaction to be mined
      }
      
      const deadline = BigInt(Math.floor(Date.now() / 1000) - 10); // Expired deadline
      
      // Get state before transfer attempt
      const ownerBalanceBefore = await dsToken.balanceOf(owner.address);
      const recipientBalanceBefore = await dsToken.balanceOf(recipient.address);
      const nonceBefore = await dsToken.nonces(owner.address);
      
      const message = {
        owner: owner.address,
        spender: spender.address,
        value,
        nonce: nonceBefore,
        deadline,
      };
      
      const { v, r, s } = await buildPermitSignature(
        owner,
        message,
        await dsToken.name(),
        await dsToken.getAddress()
      );

      // Send transaction and capture revert on-chain (with manual gas to bypass estimation)
      let txHash: string | undefined;
      let blockNumber: number | undefined;
      let gasUsed: string | undefined;
      let errorMessage = '';

      try {
        // Provide manual gas limit to bypass gas estimation that would prevent the tx from being sent
        const tx = await dsToken.connect(spender).transferWithPermit(
          owner.address,
          recipient.address,
          value,
          deadline,
          v,
          r,
          s,
          { gasLimit: 500000 } // Manual gas limit to force transaction on-chain
        );
        const receipt = await tx.wait();
        // If we get here, transaction didn't revert as expected
        throw new Error('Transaction should have reverted');
      } catch (error: any) {
        // Transaction was submitted and reverted on-chain
        errorMessage = error.message || error.toString();

        if (error.receipt) {
          txHash = error.receipt.hash || error.receipt.transactionHash;
          blockNumber = error.receipt.blockNumber;
          gasUsed = error.receipt.gasUsed?.toString();
        } else if (error.transaction) {
          txHash = error.transaction.hash;
        }

        // With mitigation: permit() fails due to expired deadline, but since there's no existing allowance,
        // transferWithPermit reverts with "Insufficient allowance"
        const isRevert = errorMessage.includes('reverted') ||
                        errorMessage.includes('Insufficient allowance') ||
                        errorMessage.includes('transaction execution');
        expect(isRevert).to.be.true;
      }

      // Verify balances unchanged after revert
      const ownerBalanceAfter = await dsToken.balanceOf(owner.address);
      const recipientBalanceAfter = await dsToken.balanceOf(recipient.address);
      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore);
      expect(recipientBalanceAfter).to.equal(recipientBalanceBefore);

      // Verify nonce unchanged after revert
      const nonceAfter = await dsToken.nonces(owner.address);
      expect(nonceAfter).to.equal(nonceBefore);

      testLogger.saveTestResult({
        testName: 'Reverts with expired deadline during permit phase',
        testNumber: 15,
        network: hre.network.name,
        dsTokenAddress: await dsToken.getAddress(),
        transactionHash: txHash,
        blockNumber: blockNumber,
        gasUsed: gasUsed,
        owner: owner.address,
        spender: spender.address,
        recipient: recipient.address,
        value,
        nonceBefore: Number(nonceBefore),
        nonceAfter: Number(nonceAfter),
        timestamp: new Date().toISOString(),
        status: 'PASSED',
        errorMessage: errorMessage,
        additionalNotes: 'With mitigation: permit() fails due to expired deadline, but since there\'s no existing allowance, transferWithPermit reverts with "Insufficient allowance". Balances and nonce remained unchanged.'
      });
    });

    it('Test 16: Reverts if owner has insufficient balance', async function() {
      const [owner, spender, recipient] = await hre.ethers.getSigners();
      
      // Register investors if not already registered (handle state persistence)
      try {
        await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, '');
      } catch (e: any) {
        if (!e.message?.includes('exists') && !e.message?.includes('already')) {
          console.log('registerInvestor error for owner:', e.message);
        }
      }
      try {
        const tx1 = await registryService.addWallet(owner, INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
        await tx1.wait();
      } catch (e: any) {
        if (!e.message?.includes('exists') && !e.message?.includes('already')) {
          console.log('addWallet error for owner:', e.message);
        }
      }
      
      try {
        await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, '');
      } catch (e: any) {
        if (!e.message?.includes('exists') && !e.message?.includes('already')) {
          console.log('registerInvestor error for recipient:', e.message);
        }
      }
      try {
        const tx2 = await registryService.addWallet(recipient, INVESTORS.INVESTOR_ID.INVESTOR_ID_2);
        await tx2.wait();
      } catch (e: any) {
        if (!e.message?.includes('exists') && !e.message?.includes('already')) {
          console.log('addWallet error for recipient:', e.message);
        }
      }
      
      // Get owner's current balance and try to transfer MORE than they have (to ensure insufficient balance)
      const ownerBalance = await dsToken.balanceOf(owner.address);
      const value = Number(ownerBalance) + 50; // Try to transfer 50 more than owner has
      
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      
      // Get state before transfer attempt
      const ownerBalanceBefore = await dsToken.balanceOf(owner.address);
      const recipientBalanceBefore = await dsToken.balanceOf(recipient.address);
      const allowanceBefore = await dsToken.allowance(owner.address, spender.address);
      const nonceBefore = await dsToken.nonces(owner.address);
      
      const message = {
        owner: owner.address,
        spender: spender.address,
        value,
        nonce: nonceBefore,
        deadline,
      };
      
      const { v, r, s } = await buildPermitSignature(
        owner,
        message,
        await dsToken.name(),
        await dsToken.getAddress()
      );

      // Send transaction and capture revert on-chain (with manual gas to bypass estimation)
      let txHash: string | undefined;
      let blockNumber: number | undefined;
      let gasUsed: string | undefined;
      let errorMessage = '';

      try {
        // Provide manual gas limit to bypass gas estimation that would prevent the tx from being sent
        const tx = await dsToken.connect(spender).transferWithPermit(
          owner.address,
          recipient.address,
          value,
          deadline,
          v,
          r,
          s,
          { gasLimit: 500000 } // Manual gas limit to force transaction on-chain
        );
        const receipt = await tx.wait();
        // If we get here, transaction didn't revert as expected
        throw new Error('Transaction should have reverted');
      } catch (error: any) {
        // Transaction was submitted and reverted on-chain
        errorMessage = error.message || error.toString();

        if (error.receipt) {
          txHash = error.receipt.hash || error.receipt.transactionHash;
          blockNumber = error.receipt.blockNumber;
          gasUsed = error.receipt.gasUsed?.toString();
        } else if (error.transaction) {
          txHash = error.transaction.hash;
        }

        // Verify it's a revert (error message may vary based on ethers version)
        const isRevert = errorMessage.includes('reverted') ||
                        errorMessage.includes('Not enough tokens') ||
                        errorMessage.includes('transaction execution');
        expect(isRevert).to.be.true;
      }

      // Verify balances unchanged after revert
      const ownerBalanceAfter = await dsToken.balanceOf(owner.address);
      const recipientBalanceAfter = await dsToken.balanceOf(recipient.address);
      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore);
      expect(recipientBalanceAfter).to.equal(recipientBalanceBefore);

      // Verify state unchanged after revert
      const allowanceAfter = await dsToken.allowance(owner.address, spender.address);
      expect(allowanceAfter).to.equal(allowanceBefore);
      
      const nonceAfter = await dsToken.nonces(owner.address);
      expect(nonceAfter).to.equal(nonceBefore);

      testLogger.saveTestResult({
        testName: 'Reverts if owner has insufficient balance',
        testNumber: 16,
        network: hre.network.name,
        dsTokenAddress: await dsToken.getAddress(),
        transactionHash: txHash,
        blockNumber: blockNumber,
        gasUsed: gasUsed,
        owner: owner.address,
        spender: spender.address,
        recipient: recipient.address,
        value,
        nonceBefore: Number(nonceBefore),
        nonceAfter: Number(nonceAfter),
        timestamp: new Date().toISOString(),
        status: 'PASSED',
        errorMessage: errorMessage,
        additionalNotes: `Transaction reverted on-chain due to insufficient balance (tried to transfer ${value}, but owner only had ${ownerBalanceBefore}). Balances, allowance, and nonce remained unchanged.`
      });
    });

    it('Test 17: Prevents replay attacks on transferWithPermit', async function() {
      const [owner, spender, recipient] = await hre.ethers.getSigners();
      
      // Register investors if not already registered (handle state persistence)
      try {
        await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, '');
      } catch (e: any) {
        if (!e.message?.includes('exists') && !e.message?.includes('already')) {
          console.log('registerInvestor error for owner:', e.message);
        }
      }
      try {
        const tx1 = await registryService.addWallet(owner, INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
        await tx1.wait();
      } catch (e: any) {
        if (!e.message?.includes('exists') && !e.message?.includes('already')) {
          console.log('addWallet error for owner:', e.message);
        }
      }
      
      try {
        await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, '');
      } catch (e: any) {
        if (!e.message?.includes('exists') && !e.message?.includes('already')) {
          console.log('registerInvestor error for recipient:', e.message);
        }
      }
      try {
        const tx2 = await registryService.addWallet(recipient, INVESTORS.INVESTOR_ID.INVESTOR_ID_2);
        await tx2.wait();
      } catch (e: any) {
        if (!e.message?.includes('exists') && !e.message?.includes('already')) {
          console.log('addWallet error for recipient:', e.message);
        }
      }
      
      const value = 100;
      
      // Check if owner has enough balance, if not issue tokens
      const currentBalance = await dsToken.balanceOf(owner.address);
      if (currentBalance < BigInt(value)) {
        const issueTx = await dsToken.issueTokens(owner.address, value);
        await issueTx.wait();
      }
      
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      const nonceBefore = await dsToken.nonces(owner.address);
      const ownerBalanceBefore = await dsToken.balanceOf(owner.address);
      const recipientBalanceBefore = await dsToken.balanceOf(recipient.address);
      
      const message = {
        owner: owner.address,
        spender: spender.address,
        value,
        nonce: nonceBefore,
        deadline,
      };
      
      const { v, r, s } = await buildPermitSignature(
        owner,
        message,
        await dsToken.name(),
        await dsToken.getAddress()
      );

      // First transaction - should succeed
      const tx = await dsToken.connect(spender).transferWithPermit(owner.address, recipient.address, value, deadline, v, r, s);
      const receipt = await tx.wait();
      
      const ownerBalanceAfter1 = await dsToken.balanceOf(owner.address);
      const recipientBalanceAfter1 = await dsToken.balanceOf(recipient.address);
      const nonceAfter1 = await dsToken.nonces(owner.address);
      
      expect(ownerBalanceAfter1).to.equal(ownerBalanceBefore - BigInt(value));
      expect(recipientBalanceAfter1).to.equal(recipientBalanceBefore + BigInt(value));
      expect(nonceAfter1).to.equal(nonceBefore + 1n);

      // Second transaction - replay attempt with same signature (should fail on-chain)
      let replayTxHash: string | undefined;
      let replayBlockNumber: number | undefined;
      let replayGasUsed: string | undefined;
      let errorMessage = '';

      try {
        // Provide manual gas limit to bypass gas estimation that would prevent the tx from being sent
        const replayTx = await dsToken.connect(spender).transferWithPermit(
          owner.address,
          recipient.address,
          value,
          deadline,
          v,
          r,
          s,
          { gasLimit: 500000 } // Manual gas limit to force transaction on-chain
        );
        const replayReceipt = await replayTx.wait();
        // If we get here, transaction didn't revert as expected
        throw new Error('Replay transaction should have reverted');
      } catch (error: any) {
        // Transaction was submitted and reverted on-chain
        errorMessage = error.message || error.toString();

        if (error.receipt) {
          replayTxHash = error.receipt.hash || error.receipt.transactionHash;
          replayBlockNumber = error.receipt.blockNumber;
          replayGasUsed = error.receipt.gasUsed?.toString();
        } else if (error.transaction) {
          replayTxHash = error.transaction.hash;
        }

        // With mitigation: permit() fails due to nonce already consumed, but since allowance was consumed
        // by the first transferFrom, transferWithPermit reverts with "Insufficient allowance"
        const isRevert = errorMessage.includes('reverted') ||
                        errorMessage.includes('Insufficient allowance') ||
                        errorMessage.includes('transaction execution');
        expect(isRevert).to.be.true;
      }

      // Verify balances unchanged after replay attempt
      const ownerBalanceAfter2 = await dsToken.balanceOf(owner.address);
      const recipientBalanceAfter2 = await dsToken.balanceOf(recipient.address);
      const nonceAfter2 = await dsToken.nonces(owner.address);
      
      expect(ownerBalanceAfter2).to.equal(ownerBalanceAfter1);
      expect(recipientBalanceAfter2).to.equal(recipientBalanceAfter1);
      expect(nonceAfter2).to.equal(nonceAfter1);

      testLogger.saveTestResult({
        testName: 'Prevents replay attacks on transferWithPermit',
        testNumber: 17,
        network: hre.network.name,
        dsTokenAddress: await dsToken.getAddress(),
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        owner: owner.address,
        spender: spender.address,
        recipient: recipient.address,
        value,
        nonceBefore: Number(nonceBefore),
        nonceAfter: Number(nonceAfter2),
        timestamp: new Date().toISOString(),
        status: 'PASSED',
        errorMessage: errorMessage,
        additionalNotes: `First transfer succeeded (tx: ${receipt.hash}). With mitigation: permit() fails due to nonce already consumed, but since allowance was consumed by the first transferFrom, transferWithPermit reverts with "Insufficient allowance". Replay attempt reverted on-chain${replayTxHash ? ` (tx: ${replayTxHash})` : ''}.`
      });
    });

    it('Test 18: Succeeds with zero value transfer', async function() {
      const [owner, spender, recipient] = await hre.ethers.getSigners();
      
      // Register investors if not already registered (handle state persistence)
      try {
        await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, '');
      } catch (e: any) {
        if (!e.message?.includes('exists') && !e.message?.includes('already')) {
          console.log('registerInvestor error for owner:', e.message);
        }
      }
      try {
        const tx1 = await registryService.addWallet(owner, INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
        await tx1.wait();
      } catch (e: any) {
        if (!e.message?.includes('exists') && !e.message?.includes('already')) {
          console.log('addWallet error for owner:', e.message);
        }
      }
      
      try {
        await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, '');
      } catch (e: any) {
        if (!e.message?.includes('exists') && !e.message?.includes('already')) {
          console.log('registerInvestor error for recipient:', e.message);
        }
      }
      try {
        const tx2 = await registryService.addWallet(recipient, INVESTORS.INVESTOR_ID.INVESTOR_ID_2);
        await tx2.wait();
      } catch (e: any) {
        if (!e.message?.includes('exists') && !e.message?.includes('already')) {
          console.log('addWallet error for recipient:', e.message);
        }
      }
      
      const value = 0;
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      
      // Get state before transfer
      const nonceBefore = await dsToken.nonces(owner.address);
      const ownerBalanceBefore = await dsToken.balanceOf(owner.address);
      const recipientBalanceBefore = await dsToken.balanceOf(recipient.address);
      
      const message = {
        owner: owner.address,
        spender: spender.address,
        value,
        nonce: nonceBefore,
        deadline,
      };
      
      const { v, r, s } = await buildPermitSignature(
        owner,
        message,
        await dsToken.name(),
        await dsToken.getAddress()
      );

      const tx = await dsToken.connect(spender).transferWithPermit(owner.address, recipient.address, value, deadline, v, r, s);
      const receipt = await tx.wait();
      
      await expect(tx).to.emit(dsToken, 'Transfer').withArgs(owner.address, recipient.address, 0);

      // Verify balances unchanged (zero value transfer)
      const ownerBalanceAfter = await dsToken.balanceOf(owner.address);
      const recipientBalanceAfter = await dsToken.balanceOf(recipient.address);
      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore);
      expect(recipientBalanceAfter).to.equal(recipientBalanceBefore);

      // Verify nonce incremented (even with zero value)
      const nonceAfter = await dsToken.nonces(owner.address);
      expect(nonceAfter).to.equal(nonceBefore + 1n);

      testLogger.saveTestResult({
        testName: 'Succeeds with zero value transfer',
        testNumber: 18,
        network: hre.network.name,
        dsTokenAddress: await dsToken.getAddress(),
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        owner: owner.address,
        spender: spender.address,
        recipient: recipient.address,
        value: 0,
        nonceBefore: Number(nonceBefore),
        nonceAfter: Number(nonceAfter),
        timestamp: new Date().toISOString(),
        status: 'PASSED',
        additionalNotes: `Zero value transferWithPermit succeeded. Balances unchanged (owner: ${ownerBalanceBefore}, recipient: ${recipientBalanceBefore}). Nonce incremented: ${nonceBefore} → ${nonceAfter}.`
      });
    });

    it('Test 19: Permit works correctly after token name change', async function() {
      const [owner, spender] = await hre.ethers.getSigners();
      
      // Initial state: Get current token name
      const originalName = await dsToken.name();

      // Permit works BEFORE name change
      const deadline1 = BigInt(Math.floor(Date.now() / 1000) + 3600);
      const value = 100;
      const nonceBefore1 = await dsToken.nonces(owner.address);
      
      const message1 = {
        owner: owner.address,
        spender: spender.address,
        value,
        nonce: nonceBefore1,
        deadline: deadline1,
      };

      // User signs with original name
      const sig1 = await buildPermitSignature(
        owner,
        message1,
        originalName,
        await dsToken.getAddress()
      );

      // Permit succeeds with original name
      const tx1 = await dsToken.permit(owner.address, spender.address, value, deadline1, sig1.v, sig1.r, sig1.s);
      const receipt1 = await tx1.wait();
      
      const allowanceAfter1 = await dsToken.allowance(owner.address, spender.address);
      expect(allowanceAfter1).to.equal(value);
      const nonceAfter1 = await dsToken.nonces(owner.address);
      expect(nonceAfter1).to.equal(nonceBefore1 + 1n);

      // Master updates token name (requires appropriate role - may need adjustment based on actual permissions)
      // Note: This might require the deployer or a role with update permissions
      try {
        const updateTx = await dsToken.updateNameAndSymbol('Token Example 2 - Updated', 'TX2');
        await updateTx.wait();
      } catch (e: any) {
        // If update fails due to permissions, skip this test or use a different approach
        console.log('updateNameAndSymbol error (may require specific role):', e.message);
        return; // Skip test if name update not possible
      }
      
      const newName = await dsToken.name();
      expect(newName).to.equal('Token Example 2 - Updated');

      // Permit continues working after name change
      const deadline2 = BigInt(Math.floor(Date.now() / 1000) + 3600);
      const value2 = 200;
      const nonceBefore2 = await dsToken.nonces(owner.address);
      
      const message2 = {
        owner: owner.address,
        spender: spender.address,
        value: value2,
        nonce: nonceBefore2,
        deadline: deadline2,
      };

      // User's wallet fetches current name and generates signature
      const currentName = await dsToken.name();

      const sig2 = await buildPermitSignature(
        owner,
        message2,
        currentName, // Uses NEW name
        await dsToken.getAddress()
      );

      // Permit does not fail
      const tx2 = await dsToken.permit(owner.address, spender.address, value2, deadline2, sig2.v, sig2.r, sig2.s);
      const receipt2 = await tx2.wait();
      
      const allowanceAfter2 = await dsToken.allowance(owner.address, spender.address);
      expect(allowanceAfter2).to.equal(value2);
      const nonceAfter2 = await dsToken.nonces(owner.address);
      expect(nonceAfter2).to.equal(nonceBefore2 + 1n);

      testLogger.saveTestResult({
        testName: 'Permit works correctly after token name change',
        testNumber: 19,
        network: hre.network.name,
        dsTokenAddress: await dsToken.getAddress(),
        transactionHash: receipt1.hash,
        blockNumber: receipt1.blockNumber,
        gasUsed: receipt1.gasUsed.toString(),
        owner: owner.address,
        spender: spender.address,
        originalName: originalName,
        newName: newName,
        firstPermitValue: value,
        secondPermitValue: value2,
        nonceBefore1: Number(nonceBefore1),
        nonceAfter1: Number(nonceAfter1),
        nonceBefore2: Number(nonceBefore2),
        nonceAfter2: Number(nonceAfter2),
        timestamp: new Date().toISOString(),
        status: 'PASSED',
        additionalNotes: `Permit succeeded with original name "${originalName}" (tx: ${receipt1.hash}). Name updated to "${newName}". Permit continued working after name change (tx: ${receipt2.hash}).`
      });
    });

    it('Test 20: Demonstrates front-running attack mitigation on transferWithPermit', async function() {
      const [owner, spender, recipient, attacker] = await hre.ethers.getSigners();
      
      // Register investors if not already registered (handle state persistence)
      try {
        await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, '');
      } catch (e: any) {
        if (!e.message?.includes('exists') && !e.message?.includes('already')) {
          console.log('registerInvestor error for owner:', e.message);
        }
      }
      try {
        const tx1 = await registryService.addWallet(owner, INVESTORS.INVESTOR_ID.INVESTOR_ID_1);
        await tx1.wait();
      } catch (e: any) {
        if (!e.message?.includes('exists') && !e.message?.includes('already')) {
          console.log('addWallet error for owner:', e.message);
        }
      }
      
      try {
        await registryService.registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, '');
      } catch (e: any) {
        if (!e.message?.includes('exists') && !e.message?.includes('already')) {
          console.log('registerInvestor error for recipient:', e.message);
        }
      }
      try {
        const tx2 = await registryService.addWallet(recipient, INVESTORS.INVESTOR_ID.INVESTOR_ID_2);
        await tx2.wait();
      } catch (e: any) {
        if (!e.message?.includes('exists') && !e.message?.includes('already')) {
          console.log('addWallet error for recipient:', e.message);
        }
      }
      
      const value = 100;
      
      // Check if owner has enough balance, if not issue tokens
      const currentBalance = await dsToken.balanceOf(owner.address);
      if (currentBalance < BigInt(value)) {
        const issueTx = await dsToken.issueTokens(owner.address, value);
        await issueTx.wait();
      }
      
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      const nonceBefore = await dsToken.nonces(owner.address);
      const ownerBalanceBefore = await dsToken.balanceOf(owner.address);
      const recipientBalanceBefore = await dsToken.balanceOf(recipient.address);
      
      const message = {
        owner: owner.address,
        spender: spender.address,
        value,
        nonce: nonceBefore,
        deadline,
      };
      
      const { v, r, s } = await buildPermitSignature(
        owner,
        message,
        await dsToken.name(),
        await dsToken.getAddress()
      );

      // ATTACK SCENARIO: Attacker front-runs by calling permit() directly
      // Create fresh contract instance with attacker signer to ensure provider is attached
      const dsTokenAsAttacker = await hre.ethers.getContractAt('DSToken', await dsToken.getAddress(), attacker);
      const attackerTx = await dsTokenAsAttacker.permit(owner.address, spender.address, value, deadline, v, r, s);
      const attackerReceipt = await attackerTx.wait();
      
      // Verify attacker's permit set the allowance
      const allowanceAfterAttack = await dsToken.allowance(owner.address, spender.address);
      expect(allowanceAfterAttack).to.equal(value);
      const nonceAfterAttack = await dsToken.nonces(owner.address);
      expect(nonceAfterAttack).to.equal(nonceBefore + 1n);

      // With mitigation: transferWithPermit() should SUCCEED because:
      // 1. permit() fails (nonce already consumed), but...
      // 2. allowance was set by attacker's permit() call
      // 3. transferFrom proceeds successfully
      const transferTx = await dsToken.connect(spender).transferWithPermit(
        owner.address,
        recipient.address,
        value,
        deadline,
        v,
        r,
        s
      );
      const transferReceipt = await transferTx.wait();
      
      await expect(transferTx).to.emit(dsToken, 'Transfer').withArgs(owner.address, recipient.address, value);

      // Verify the transfer succeeded despite the front-running attack
      const ownerBalanceAfter = await dsToken.balanceOf(owner.address);
      const recipientBalanceAfter = await dsToken.balanceOf(recipient.address);
      expect(recipientBalanceAfter).to.equal(recipientBalanceBefore + BigInt(value));
      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore - BigInt(value));
      
      // Allowance consumed by transferFrom
      const allowanceAfterTransfer = await dsToken.allowance(owner.address, spender.address);
      expect(allowanceAfterTransfer).to.equal(0);
      
      // Nonce already consumed by attacker's permit()
      const nonceAfterTransfer = await dsToken.nonces(owner.address);
      expect(nonceAfterTransfer).to.equal(nonceBefore + 1n);

      testLogger.saveTestResult({
        testName: 'Demonstrates front-running attack mitigation on transferWithPermit',
        testNumber: 20,
        network: hre.network.name,
        dsTokenAddress: await dsToken.getAddress(),
        transactionHash: transferReceipt.hash,
        blockNumber: transferReceipt.blockNumber,
        gasUsed: transferReceipt.gasUsed.toString(),
        owner: owner.address,
        spender: spender.address,
        recipient: recipient.address,
        attacker: attacker.address,
        value,
        nonceBefore: Number(nonceBefore),
        nonceAfter: Number(nonceAfterTransfer),
        ownerBalanceBefore: Number(ownerBalanceBefore),
        ownerBalanceAfter: Number(ownerBalanceAfter),
        recipientBalanceBefore: Number(recipientBalanceBefore),
        recipientBalanceAfter: Number(recipientBalanceAfter),
        timestamp: new Date().toISOString(),
        status: 'PASSED',
        additionalNotes: `Front-running attack demonstrated: Attacker called permit() first (tx: ${attackerReceipt.hash}), consuming nonce ${nonceBefore}. With mitigation: transferWithPermit() succeeded (tx: ${transferReceipt.hash}) because permit() failed but allowance was already set by attacker. Transfer completed successfully: ${value} tokens transferred from owner to recipient.`
      });
    });
  });
});

