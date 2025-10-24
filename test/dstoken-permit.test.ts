import { expect } from 'chai';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import hre from 'hardhat';
import {
  deployDSTokenRegulated,
  INVESTORS,
} from './utils/fixture';
import { buildPermitSignature, registerInvestor } from './utils/test-helper';

/**
 * Comprehensive test suite for ERC-2612 Permit functionality
 * 
 * Tests cover:
 * - permit() core functionality (signature validation, nonces, allowances)
 * - transferWithPermit() single-transaction flow
 * - Security: replay protection, invalid signers, domain binding
 * - Edge cases: zero values, allowance overwrites, expired deadlines
 */
describe('DSToken - ERC-2612 Permit & transferWithPermit', function() {
  
  describe('permit() - Core Functionality', function() {
    
    it('Sets allowance via valid signature and emits Approval event', async function() {
      const [owner, spender] = await hre.ethers.getSigners();
      const { dsToken } = await loadFixture(deployDSTokenRegulated);
      
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

      // Call permit and expect Approval event
      await expect(dsToken.permit(owner.address, spender.address, value, deadline, v, r, s))
        .to.emit(dsToken, 'Approval')
        .withArgs(owner.address, spender.address, value);

      // Verify allowance set correctly
      const allowance = await dsToken.allowance(owner.address, spender.address);
      expect(allowance).to.equal(value);

      // Verify nonce incremented
      const nonceAfter = await dsToken.nonces(owner.address);
      expect(nonceAfter).to.equal(nonceBefore + 1n);
    });

    it('Reverts with expired deadline', async function() {
      const [owner, spender] = await hre.ethers.getSigners();
      const { dsToken } = await loadFixture(deployDSTokenRegulated);
      
      const value = 100;
      const deadline = BigInt(Math.floor(Date.now() / 1000) - 10); // Expired 10 seconds ago
      
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

      await expect(
        dsToken.permit(owner.address, spender.address, value, deadline, v, r, s)
      ).to.be.revertedWith('Permit: expired deadline');

      // Verify allowance remains 0
      const allowance = await dsToken.allowance(owner.address, spender.address);
      expect(allowance).to.equal(0);

      // Verify nonce NOT incremented
      const nonce = await dsToken.nonces(owner.address);
      expect(nonce).to.equal(0n);
    });

    it('Rejects reused signature (replay protection)', async function() {
      const [owner, spender] = await hre.ethers.getSigners();
      const { dsToken } = await loadFixture(deployDSTokenRegulated);
      
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

      // First permit succeeds
      await dsToken.permit(owner.address, spender.address, value, deadline, v, r, s);
      
      const allowanceAfterFirst = await dsToken.allowance(owner.address, spender.address);
      expect(allowanceAfterFirst).to.equal(value);

      // Reusing same signature should fail (nonce already consumed)
      await expect(
        dsToken.permit(owner.address, spender.address, value, deadline, v, r, s)
      ).to.be.revertedWith('Permit: invalid signature');

      // Allowance should still be from first permit
      const allowanceAfterReplay = await dsToken.allowance(owner.address, spender.address);
      expect(allowanceAfterReplay).to.equal(value);
    });

    it('Rejects signature from wrong signer', async function() {
      const [owner, spender, attacker] = await hre.ethers.getSigners();
      const { dsToken } = await loadFixture(deployDSTokenRegulated);
      
      const value = 100;
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      
      const message = {
        owner: owner.address,
        spender: spender.address,
        value,
        nonce: await dsToken.nonces(owner.address),
        deadline,
      };
      
      // Attacker signs the message instead of owner
      const { v, r, s } = await buildPermitSignature(
        attacker,
        message,
        await dsToken.name(),
        await dsToken.getAddress()
      );

      // Should revert because signature is from attacker, not owner
      await expect(
        dsToken.permit(owner.address, spender.address, value, deadline, v, r, s)
      ).to.be.revertedWith('Permit: invalid signature');

      // Verify allowance remains 0
      const allowance = await dsToken.allowance(owner.address, spender.address);
      expect(allowance).to.equal(0);
    });

    it('Rejects signature with wrong chainId', async function() {
      const [owner, spender] = await hre.ethers.getSigners();
      const { dsToken } = await loadFixture(deployDSTokenRegulated);
      
      const value = 100;
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      
      // Build domain with wrong chainId
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

      // Should revert because chainId doesn't match
      await expect(
        dsToken.permit(owner.address, spender.address, value, deadline, v, r, s)
      ).to.be.revertedWith('Permit: invalid signature');

      // Verify allowance remains 0
      const allowance = await dsToken.allowance(owner.address, spender.address);
      expect(allowance).to.equal(0);
    });

    it('Rejects signature with wrong verifyingContract', async function() {
      const [owner, spender] = await hre.ethers.getSigners();
      const { dsToken } = await loadFixture(deployDSTokenRegulated);
      
      const value = 100;
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      
      // Build domain with wrong contract address
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

      // Should revert because verifyingContract doesn't match
      await expect(
        dsToken.permit(owner.address, spender.address, value, deadline, v, r, s)
      ).to.be.revertedWith('Permit: invalid signature');

      // Verify allowance remains 0
      const allowance = await dsToken.allowance(owner.address, spender.address);
      expect(allowance).to.equal(0);
    });

    it('DOMAIN_SEPARATOR matches EIP-712 spec', async function() {
      const { dsToken } = await loadFixture(deployDSTokenRegulated);
      
      const expectedDomain = hre.ethers.TypedDataEncoder.hashDomain({
        version: '1',
        name: await dsToken.name(),
        verifyingContract: await dsToken.getAddress(),
        chainId: (await hre.ethers.provider.getNetwork()).chainId,
      });

      const actualSeparator = await dsToken.DOMAIN_SEPARATOR();
      expect(actualSeparator).to.equal(expectedDomain);
    });

    it('Permits zero value (increments nonce, sets allowance to 0)', async function() {
      const [owner, spender] = await hre.ethers.getSigners();
      const { dsToken } = await loadFixture(deployDSTokenRegulated);
      
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

      // Permit with value 0 should succeed
      await expect(dsToken.permit(owner.address, spender.address, value, deadline, v, r, s))
        .to.emit(dsToken, 'Approval')
        .withArgs(owner.address, spender.address, 0);

      // Allowance should be 0
      const allowance = await dsToken.allowance(owner.address, spender.address);
      expect(allowance).to.equal(0);

      // Nonce should still increment
      const nonceAfter = await dsToken.nonces(owner.address);
      expect(nonceAfter).to.equal(nonceBefore + 1n);
    });

    it('Overwrites existing allowance', async function() {
      const [owner, spender] = await hre.ethers.getSigners();
      const { dsToken } = await loadFixture(deployDSTokenRegulated);
      
      // First, set allowance to 50 via direct approve
      await dsToken.connect(owner).approve(spender.address, 50);
      expect(await dsToken.allowance(owner.address, spender.address)).to.equal(50);

      // Now use permit to set allowance to 200 (should overwrite, not add)
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

      await dsToken.permit(owner.address, spender.address, value, deadline, v, r, s);

      // Allowance should be 200, not 250 (overwritten, not added)
      const allowance = await dsToken.allowance(owner.address, spender.address);
      expect(allowance).to.equal(200);
    });

    it('Can reduce allowance', async function() {
      const [owner, spender] = await hre.ethers.getSigners();
      const { dsToken } = await loadFixture(deployDSTokenRegulated);
      
      // First, set allowance to 500 via direct approve
      await dsToken.connect(owner).approve(spender.address, 500);
      expect(await dsToken.allowance(owner.address, spender.address)).to.equal(500);

      // Now use permit to reduce allowance to 100
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

      await dsToken.permit(owner.address, spender.address, value, deadline, v, r, s);

      // Allowance should be reduced to 100
      const allowance = await dsToken.allowance(owner.address, spender.address);
      expect(allowance).to.equal(100);
    });

    it('Nonces increment monotonically for each permit', async function() {
      const [owner, spender1, spender2] = await hre.ethers.getSigners();
      const { dsToken } = await loadFixture(deployDSTokenRegulated);
      
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      
      // Initial nonce should be 0
      let nonce = await dsToken.nonces(owner.address);
      expect(nonce).to.equal(0n);

      // First permit to spender1
      let message = {
        owner: owner.address,
        spender: spender1.address,
        value: 100,
        nonce,
        deadline,
      };
      let sig = await buildPermitSignature(owner, message, await dsToken.name(), await dsToken.getAddress());
      await dsToken.permit(owner.address, spender1.address, 100, deadline, sig.v, sig.r, sig.s);
      
      nonce = await dsToken.nonces(owner.address);
      expect(nonce).to.equal(1n);

      // Second permit to spender2
      message = {
        owner: owner.address,
        spender: spender2.address,
        value: 200,
        nonce,
        deadline,
      };
      sig = await buildPermitSignature(owner, message, await dsToken.name(), await dsToken.getAddress());
      await dsToken.permit(owner.address, spender2.address, 200, deadline, sig.v, sig.r, sig.s);
      
      nonce = await dsToken.nonces(owner.address);
      expect(nonce).to.equal(2n);

      // Third permit to spender1 again (new allowance)
      message = {
        owner: owner.address,
        spender: spender1.address,
        value: 300,
        nonce,
        deadline,
      };
      sig = await buildPermitSignature(owner, message, await dsToken.name(), await dsToken.getAddress());
      await dsToken.permit(owner.address, spender1.address, 300, deadline, sig.v, sig.r, sig.s);
      
      nonce = await dsToken.nonces(owner.address);
      expect(nonce).to.equal(3n);

      // Verify allowances are independent
      expect(await dsToken.allowance(owner.address, spender1.address)).to.equal(300);
      expect(await dsToken.allowance(owner.address, spender2.address)).to.equal(200);
    });

    it('Nonces are wallet-specific (independent per user)', async function() {
      const [user1, user2, spender] = await hre.ethers.getSigners();
      const { dsToken } = await loadFixture(deployDSTokenRegulated);
      
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      
      // User1 makes 3 permits
      for (let i = 0; i < 3; i++) {
        const message = {
          owner: user1.address,
          spender: spender.address,
          value: 100 * (i + 1),
          nonce: await dsToken.nonces(user1.address),
          deadline,
        };
        const sig = await buildPermitSignature(user1, message, await dsToken.name(), await dsToken.getAddress());
        await dsToken.permit(user1.address, spender.address, 100 * (i + 1), deadline, sig.v, sig.r, sig.s);
      }

      // User1's nonce should be 3
      const nonce1 = await dsToken.nonces(user1.address);
      expect(nonce1).to.equal(3n);

      // User2's nonce should still be 0 (unaffected)
      const nonce2 = await dsToken.nonces(user2.address);
      expect(nonce2).to.equal(0n);
    });
  });

  describe('transferWithPermit() - Single Transaction Flow', function() {
    
    it('Permits and transfers in single transaction (happy path)', async function() {
      const [owner, spender, recipient] = await hre.ethers.getSigners();
      const { dsToken, registryService } = await loadFixture(deployDSTokenRegulated);
      
      // Register investors for compliance
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, owner, registryService);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, recipient, registryService);
      
      // Issue tokens to owner
      const value = 100;
      await dsToken.issueTokens(owner.address, value);
      
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

      const balanceBefore = await dsToken.balanceOf(recipient.address);

      // Spender calls transferWithPermit (single transaction)
      await expect(
        dsToken.connect(spender).transferWithPermit(owner.address, recipient.address, value, deadline, v, r, s)
      ).to.emit(dsToken, 'Transfer').withArgs(owner.address, recipient.address, value);

      // Verify transfer succeeded
      const balanceAfter = await dsToken.balanceOf(recipient.address);
      expect(balanceAfter - balanceBefore).to.equal(value);

      // Owner balance should be 0
      const ownerBalance = await dsToken.balanceOf(owner.address);
      expect(ownerBalance).to.equal(0);

      // Allowance should be consumed (reduced to 0 after transferFrom)
      const allowance = await dsToken.allowance(owner.address, spender.address);
      expect(allowance).to.equal(0);

      // Nonce should be incremented
      const nonce = await dsToken.nonces(owner.address);
      expect(nonce).to.equal(1n);
    });

    it('Emits Approval before Transfer (event order verification)', async function() {
      const [owner, spender, recipient] = await hre.ethers.getSigners();
      const { dsToken, registryService } = await loadFixture(deployDSTokenRegulated);
      
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, owner, registryService);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, recipient, registryService);
      
      const value = 100;
      await dsToken.issueTokens(owner.address, value);
      
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

      // Parse all events with proper log indexing
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

      // Both events should exist
      expect(approvalIndex).to.be.greaterThan(-1, 'Approval event not found');
      expect(transferIndex).to.be.greaterThan(-1, 'Transfer event not found');

      // Approval should come before Transfer
      expect(approvalIndex).to.be.lessThan(transferIndex, 'Approval should be emitted before Transfer');
    });

    it('Reverts with expired deadline during permit phase', async function() {
      const [owner, spender, recipient] = await hre.ethers.getSigners();
      const { dsToken, registryService } = await loadFixture(deployDSTokenRegulated);
      
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, owner, registryService);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, recipient, registryService);
      
      const value = 100;
      await dsToken.issueTokens(owner.address, value);
      
      const deadline = BigInt(Math.floor(Date.now() / 1000) - 10); // Expired
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

      // Should revert during permit phase
      await expect(
        dsToken.connect(spender).transferWithPermit(owner.address, recipient.address, value, deadline, v, r, s)
      ).to.be.revertedWith('Permit: expired deadline');

      // No tokens should be transferred
      expect(await dsToken.balanceOf(recipient.address)).to.equal(0);
      expect(await dsToken.balanceOf(owner.address)).to.equal(value);
    });

    it('Reverts if owner has insufficient balance', async function() {
      const [owner, spender, recipient] = await hre.ethers.getSigners();
      const { dsToken, registryService } = await loadFixture(deployDSTokenRegulated);
      
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, owner, registryService);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, recipient, registryService);
      
      // Issue only 50 tokens but try to permit 100
      await dsToken.issueTokens(owner.address, 50);
      
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

      // Should revert during transferFrom phase (insufficient balance)
      await expect(
        dsToken.connect(spender).transferWithPermit(owner.address, recipient.address, value, deadline, v, r, s)
      ).to.be.revertedWith('Not enough tokens');

      // Recipient should have 0 tokens
      expect(await dsToken.balanceOf(recipient.address)).to.equal(0);
      
      // Owner should still have 50 tokens
      expect(await dsToken.balanceOf(owner.address)).to.equal(50);

      // Note: Entire transaction reverted, so allowance remains 0 (permit was also reverted)
      const allowance = await dsToken.allowance(owner.address, spender.address);
      expect(allowance).to.equal(0);
      
      // Nonce should also remain 0 (not incremented due to revert)
      const nonce = await dsToken.nonces(owner.address);
      expect(nonce).to.equal(0n);
    });

    it('Prevents replay attacks on transferWithPermit', async function() {
      const [owner, spender, recipient] = await hre.ethers.getSigners();
      const { dsToken, registryService } = await loadFixture(deployDSTokenRegulated);
      
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, owner, registryService);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, recipient, registryService);
      
      // Issue 200 tokens to owner
      await dsToken.issueTokens(owner.address, 200);
      
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

      // First transferWithPermit succeeds
      await dsToken.connect(spender).transferWithPermit(owner.address, recipient.address, value, deadline, v, r, s);
      
      expect(await dsToken.balanceOf(recipient.address)).to.equal(100);
      expect(await dsToken.balanceOf(owner.address)).to.equal(100);

      // Attempt to replay same signature (should fail due to nonce)
      await expect(
        dsToken.connect(spender).transferWithPermit(owner.address, recipient.address, value, deadline, v, r, s)
      ).to.be.revertedWith('Permit: invalid signature');

      // Balances should remain unchanged (only 100 transferred, not 200)
      expect(await dsToken.balanceOf(recipient.address)).to.equal(100);
      expect(await dsToken.balanceOf(owner.address)).to.equal(100);
    });

    it('Succeeds with zero value transfer', async function() {
      const [owner, spender, recipient] = await hre.ethers.getSigners();
      const { dsToken, registryService } = await loadFixture(deployDSTokenRegulated);
      
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_1, owner, registryService);
      await registerInvestor(INVESTORS.INVESTOR_ID.INVESTOR_ID_2, recipient, registryService);
      
      await dsToken.issueTokens(owner.address, 100);
      
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

      // Should succeed with zero value (no-op transfer)
      await expect(
        dsToken.connect(spender).transferWithPermit(owner.address, recipient.address, value, deadline, v, r, s)
      ).to.emit(dsToken, 'Transfer').withArgs(owner.address, recipient.address, 0);

      // Balances should be unchanged
      expect(await dsToken.balanceOf(owner.address)).to.equal(100);
      expect(await dsToken.balanceOf(recipient.address)).to.equal(0);

      // Nonce should still increment
      const nonceAfter = await dsToken.nonces(owner.address);
      expect(nonceAfter).to.equal(nonceBefore + 1n);
    });
  });
});

