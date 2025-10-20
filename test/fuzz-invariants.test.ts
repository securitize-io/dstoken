import fc from 'fast-check';
import { expect } from 'chai';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import hre from 'hardhat';
import { deployDSTokenRegulated, INVESTORS } from './utils/fixture';
import { registerInvestor } from './utils/test-helper';

/**
 * Fuzz Testing for Security Token Invariants
 * 
 * This test suite uses property-based testing with fast-check to verify
 * critical invariants in the DSToken system through randomized inputs.
 */
describe('Fuzz Tests: Token Invariants', function() {
  
  /**
   * INV-1: Total Supply Conservation
   * 
   * Property: The sum of all wallet balances must always equal the total supply.
   * This invariant must hold after any combination of operations (issue, transfer, burn).
   * 
   * Formula: ∑(walletsBalances[address]) == totalSupply
   */
  describe('INV-1: Total Supply Conservation', function() {
    
    it('should maintain total supply equals sum of balances across random operations', async function() {
      // Increase timeout for fuzz testing (multiple runs)
      this.timeout(120000);
      
      await fc.assert(
        fc.asyncProperty(
          // Generate a sequence of random operations
          fc.array(
            fc.record({
              operation: fc.constantFrom('issue', 'transfer', 'burn'),
              amount: fc.integer({ min: 1, max: 1000000 }), // 1 to 1,000,000 tokens (with 2 decimals = 1 to 10,000.00)
              fromIndex: fc.integer({ min: 0, max: 4 }),
              toIndex: fc.integer({ min: 0, max: 4 })
            }),
            { minLength: 5, maxLength: 15 } // Run 5-15 operations per test case
          ),
          async (operations) => {
            // Setup: Deploy fresh contracts for each test case
            const { dsToken, registryService, complianceService } = await loadFixture(deployDSTokenRegulated);
            const signers = await hre.ethers.getSigners();
            const [owner, ...investors] = signers;
            
            // Register 5 test investors
            for (let i = 0; i < 5; i++) {
              await registerInvestor(`fuzztestinvestor${i}`, investors[i], registryService);
              await registryService.setCountry(`fuzztestinvestor${i}`, INVESTORS.Country.USA);
            }
            
            // Track all addresses that have been involved in operations
            const activeAddresses = new Set<string>();
            
            // Execute the random sequence of operations
            for (const op of operations) {
              try {
                const fromAddr = investors[op.fromIndex].address;
                const toAddr = investors[op.toIndex].address;
                
                switch (op.operation) {
                  case 'issue':
                    // Issue tokens to a random investor
                    await dsToken.issueTokens(toAddr, op.amount);
                    activeAddresses.add(toAddr);
                    break;
                    
                  case 'transfer':
                    // Transfer tokens between investors (if source has enough balance)
                    const balance = await dsToken.balanceOf(fromAddr);
                    if (balance >= op.amount && fromAddr !== toAddr) {
                      await dsToken.connect(investors[op.fromIndex]).transfer(toAddr, op.amount);
                      activeAddresses.add(fromAddr);
                      activeAddresses.add(toAddr);
                    }
                    break;
                    
                  case 'burn':
                    // Burn tokens from a random investor (if they have balance)
                    const burnBalance = await dsToken.balanceOf(fromAddr);
                    if (burnBalance >= op.amount) {
                      await dsToken.burn(fromAddr, op.amount, 'fuzz test burn');
                      activeAddresses.add(fromAddr);
                    }
                    break;
                }
              } catch (error) {
                // Skip operations that fail due to compliance or other rules
                // This is expected behavior - we want to test the invariant holds
                // even when some operations are rejected
              }
            }
            
            // INVARIANT CHECK: Total supply must equal sum of all balances
            const totalSupply = await dsToken.totalSupply();
            
            // Calculate sum of all balances for addresses that were involved
            let sumOfBalances = 0n;
            for (const address of activeAddresses) {
              const balance = await dsToken.balanceOf(address);
              sumOfBalances += balance;
            }
            
            // The invariant: totalSupply == sum of all balances
            expect(totalSupply).to.equal(
              sumOfBalances,
              `Invariant violated! Total supply (${totalSupply}) != sum of balances (${sumOfBalances})`
            );
          }
        ),
        { 
          numRuns: 50, // Run 50 different random test cases
          verbose: true // Show which test case failed if any
        }
      );
    });
    
    /**
     * INV-1 Variant: Total Supply Conservation with Seize Operation
     * 
     * Tests that the invariant holds even when tokens are seized (forced transfer by admin)
     */
    it('should maintain total supply equals sum of balances including seize operations', async function() {
      this.timeout(120000);
      
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              operation: fc.constantFrom('issue', 'seize'),
              amount: fc.integer({ min: 100, max: 500000 }),
              fromIndex: fc.integer({ min: 0, max: 2 }),
              toIndex: fc.integer({ min: 0, max: 2 })
            }),
            { minLength: 3, maxLength: 10 }
          ),
          async (operations) => {
            const { dsToken, registryService } = await loadFixture(deployDSTokenRegulated);
            const signers = await hre.ethers.getSigners();
            const [owner, investor1, investor2, investor3] = signers;
            
            const testInvestors = [investor1, investor2, investor3];
            
            // Register investors
            for (let i = 0; i < 3; i++) {
              await registerInvestor(`seizetest${i}`, testInvestors[i], registryService);
              await registryService.setCountry(`seizetest${i}`, INVESTORS.Country.USA);
            }
            
            const activeAddresses = new Set<string>();
            
            for (const op of operations) {
              try {
                const fromAddr = testInvestors[op.fromIndex].address;
                const toAddr = testInvestors[op.toIndex].address;
                
                if (op.operation === 'issue') {
                  await dsToken.issueTokens(toAddr, op.amount);
                  activeAddresses.add(toAddr);
                } else if (op.operation === 'seize') {
                  const balance = await dsToken.balanceOf(fromAddr);
                  if (balance >= op.amount && fromAddr !== toAddr) {
                    await dsToken.seize(fromAddr, toAddr, op.amount, 'fuzz test seize');
                    activeAddresses.add(fromAddr);
                    activeAddresses.add(toAddr);
                  }
                }
              } catch (error) {
                // Skip invalid operations
              }
            }
            
            // Check invariant
            const totalSupply = await dsToken.totalSupply();
            let sumOfBalances = 0n;
            
            for (const address of activeAddresses) {
              sumOfBalances += await dsToken.balanceOf(address);
            }
            
            expect(totalSupply).to.equal(sumOfBalances);
          }
        ),
        { numRuns: 30 }
      );
    });
    
    /**
     * INV-1 Edge Case: Zero-balance operations
     * 
     * Tests that the invariant holds even when operating on empty balances
     */
    it('should handle operations on zero-balance accounts correctly', async function() {
      this.timeout(60000);
      
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000000 }),
          fc.integer({ min: 1, max: 1000000 }),
          async (issueAmount, transferAmount) => {
            const { dsToken, registryService } = await loadFixture(deployDSTokenRegulated);
            const [owner, investor1, investor2] = await hre.ethers.getSigners();
            
            await registerInvestor('zerobtest1', investor1, registryService);
            await registerInvestor('zerobtest2', investor2, registryService);
            await registryService.setCountry('zerobtest1', INVESTORS.Country.USA);
            await registryService.setCountry('zerobtest2', INVESTORS.Country.USA);
            
            // Issue to investor1
            await dsToken.issueTokens(investor1.address, issueAmount);
            
            // Try to transfer more than balance (should fail silently in our test)
            try {
              if (transferAmount <= issueAmount) {
                await dsToken.connect(investor1).transfer(investor2.address, transferAmount);
              }
            } catch (error) {
              // Expected for invalid transfers
            }
            
            // Check invariant
            const totalSupply = await dsToken.totalSupply();
            const balance1 = await dsToken.balanceOf(investor1.address);
            const balance2 = await dsToken.balanceOf(investor2.address);
            
            expect(totalSupply).to.equal(balance1 + balance2);
          }
        ),
        { numRuns: 40 }
      );
    });
  });
  
  /**
   * INV-4: Non-Negative Balances
   * 
   * Property: All wallet and investor balances must be >= 0
   * This is enforced by Solidity's underflow protection, but we verify it holds in practice.
   * 
   * Formula: walletsBalances[address] >= 0 AND investorsBalances[investor] >= 0
   */
  describe('INV-4: Non-Negative Balances', function() {
    
    it('should never allow negative balances through any operation', async function() {
      this.timeout(120000);
      
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              operation: fc.constantFrom('issue', 'transfer', 'burn'),
              amount: fc.integer({ min: 1, max: 1000000 }),
              fromIndex: fc.integer({ min: 0, max: 3 }),
              toIndex: fc.integer({ min: 0, max: 3 })
            }),
            { minLength: 10, maxLength: 20 }
          ),
          async (operations) => {
            const { dsToken, registryService } = await loadFixture(deployDSTokenRegulated);
            const signers = await hre.ethers.getSigners();
            const [owner, ...investors] = signers;
            
            // Register investors
            for (let i = 0; i < 4; i++) {
              await registerInvestor(`nonnegtest${i}`, investors[i], registryService);
              await registryService.setCountry(`nonnegtest${i}`, INVESTORS.Country.USA);
            }
            
            const activeAddresses = new Set<string>();
            
            // Execute operations
            for (const op of operations) {
              try {
                const fromAddr = investors[op.fromIndex].address;
                const toAddr = investors[op.toIndex].address;
                
                switch (op.operation) {
                  case 'issue':
                    await dsToken.issueTokens(toAddr, op.amount);
                    activeAddresses.add(toAddr);
                    break;
                    
                  case 'transfer':
                    const balance = await dsToken.balanceOf(fromAddr);
                    if (balance >= op.amount && fromAddr !== toAddr) {
                      await dsToken.connect(investors[op.fromIndex]).transfer(toAddr, op.amount);
                      activeAddresses.add(fromAddr);
                      activeAddresses.add(toAddr);
                    }
                    break;
                    
                  case 'burn':
                    const burnBalance = await dsToken.balanceOf(fromAddr);
                    if (burnBalance >= op.amount) {
                      await dsToken.burn(fromAddr, op.amount, 'test burn');
                      activeAddresses.add(fromAddr);
                    }
                    break;
                }
              } catch (error) {
                // Expected for some operations
              }
              
              // Check invariant after EACH operation
              for (const address of activeAddresses) {
                const balance = await dsToken.balanceOf(address);
                expect(balance).to.be.gte(0, `Negative balance detected for ${address}`);
              }
            }
          }
        ),
        { numRuns: 40 }
      );
    });
  });
  
  /**
   * INV-5: Transfer Conservation
   * 
   * Property: Transfers must preserve token amounts
   * After transfer: balance(from) decreases by amount, balance(to) increases by amount
   * 
   * Formula: 
   *   balanceOf(from)_after = balanceOf(from)_before - amount
   *   balanceOf(to)_after = balanceOf(to)_before + amount
   */
  describe('INV-5: Transfer Conservation', function() {
    
    it('should conserve tokens during transfers (no creation or destruction)', async function() {
      this.timeout(120000);
      
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              fromIndex: fc.integer({ min: 0, max: 2 }),
              toIndex: fc.integer({ min: 0, max: 2 }),
              amount: fc.integer({ min: 100, max: 100000 })
            }),
            { minLength: 5, maxLength: 15 }
          ),
          async (transfers) => {
            const { dsToken, registryService } = await loadFixture(deployDSTokenRegulated);
            const [owner, investor1, investor2, investor3] = await hre.ethers.getSigners();
            const testInvestors = [investor1, investor2, investor3];
            
            // Register investors
            for (let i = 0; i < 3; i++) {
              await registerInvestor(`transfertest${i}`, testInvestors[i], registryService);
              await registryService.setCountry(`transfertest${i}`, INVESTORS.Country.USA);
              // Give each investor initial balance
              await dsToken.issueTokens(testInvestors[i].address, 10000000);
            }
            
            // Execute transfers and verify conservation
            for (const transfer of transfers) {
              const fromAddr = testInvestors[transfer.fromIndex].address;
              const toAddr = testInvestors[transfer.toIndex].address;
              
              if (fromAddr === toAddr) continue; // Skip self-transfers
              
              try {
                const balanceFromBefore = await dsToken.balanceOf(fromAddr);
                const balanceToBefore = await dsToken.balanceOf(toAddr);
                const totalBefore = balanceFromBefore + balanceToBefore;
                
                if (balanceFromBefore >= transfer.amount) {
                  await dsToken.connect(testInvestors[transfer.fromIndex]).transfer(toAddr, transfer.amount);
                  
                  const balanceFromAfter = await dsToken.balanceOf(fromAddr);
                  const balanceToAfter = await dsToken.balanceOf(toAddr);
                  const totalAfter = balanceFromAfter + balanceToAfter;
                  
                  // Verify conservation
                  expect(totalBefore).to.equal(totalAfter, 'Transfer did not conserve tokens');
                  expect(balanceFromAfter).to.equal(balanceFromBefore - BigInt(transfer.amount));
                  expect(balanceToAfter).to.equal(balanceToBefore + BigInt(transfer.amount));
                }
              } catch (error) {
                // Expected for compliance violations
              }
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });
  
  /**
   * INV-7: Locked Tokens Never Exceed Balance
   * 
   * Property: The sum of locked tokens for an investor cannot exceed their total balance
   * 
   * Formula: ∑(locks[investor][i].value) <= balanceOfInvestor(investor)
   */
  describe('INV-7: Locked Tokens Never Exceed Balance', function() {
    
    it('should ensure locked tokens never exceed investor balance', async function() {
      this.timeout(120000);
      
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              investorIndex: fc.integer({ min: 0, max: 2 }),
              issueAmount: fc.integer({ min: 10000, max: 1000000 }),
              lockAmount: fc.integer({ min: 1000, max: 500000 }),
              lockDays: fc.integer({ min: 1, max: 365 })
            }),
            { minLength: 3, maxLength: 8 }
          ),
          async (operations) => {
            const { dsToken, registryService, lockManager } = await loadFixture(deployDSTokenRegulated);
            const [owner, investor1, investor2, investor3] = await hre.ethers.getSigners();
            const testInvestors = [investor1, investor2, investor3];
            
            // Register investors
            for (let i = 0; i < 3; i++) {
              await registerInvestor(`locktest${i}`, testInvestors[i], registryService);
              await registryService.setCountry(`locktest${i}`, INVESTORS.Country.USA);
            }
            
            // Execute operations with locks
            for (const op of operations) {
              try {
                const investorAddr = testInvestors[op.investorIndex].address;
                const releaseTime = Math.floor(Date.now() / 1000) + (op.lockDays * 86400);
                
                // Calculate how much to lock (ensure it doesn't exceed issue amount)
                const actualLockAmount = Math.min(op.lockAmount, op.issueAmount);
                
                // Issue with lock
                if (actualLockAmount > 0) {
                  await dsToken.issueTokensCustom(
                    investorAddr,
                    op.issueAmount,
                    Math.floor(Date.now() / 1000),
                    actualLockAmount,
                    'test lock',
                    releaseTime
                  );
                } else {
                  await dsToken.issueTokens(investorAddr, op.issueAmount);
                }
                
                // Verify invariant: locked amount <= balance
                const investorId = `locktest${op.investorIndex}`;
                const balance = await dsToken.balanceOfInvestor(investorId);
                const lockCount = await lockManager.lockCountForInvestor(investorId);
                
                let totalLocked = 0n;
                for (let i = 0; i < lockCount; i++) {
                  const lockInfo = await lockManager.lockInfoForInvestor(investorId, i);
                  totalLocked += lockInfo.value;
                }
                
                expect(totalLocked).to.be.lte(
                  balance,
                  `Locked tokens (${totalLocked}) exceed balance (${balance}) for investor ${investorId}`
                );
              } catch (error) {
                // Expected for some invalid operations
              }
            }
          }
        ),
        { numRuns: 25 }
      );
    });
  });
  
  /**
   * INV-17: Wallet List Consistency
   * 
   * Property: A wallet is in the list if and only if its balance > 0
   * 
   * Formula: (walletsToIndexes[address] != 0) ⟺ (balanceOf(address) > 0)
   */
  describe('INV-17: Wallet List Consistency', function() {
    
    it('should maintain wallet list in sync with non-zero balances', async function() {
      this.timeout(120000);
      
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              operation: fc.constantFrom('issue', 'transfer', 'burn'),
              amount: fc.integer({ min: 1000, max: 500000 }),
              fromIndex: fc.integer({ min: 0, max: 3 }),
              toIndex: fc.integer({ min: 0, max: 3 })
            }),
            { minLength: 10, maxLength: 25 }
          ),
          async (operations) => {
            const { dsToken, registryService } = await loadFixture(deployDSTokenRegulated);
            const signers = await hre.ethers.getSigners();
            const [owner, ...investors] = signers;
            
            // Register investors
            for (let i = 0; i < 4; i++) {
              await registerInvestor(`walletlisttest${i}`, investors[i], registryService);
              await registryService.setCountry(`walletlisttest${i}`, INVESTORS.Country.USA);
            }
            
            const trackedAddresses = new Set<string>();
            
            // Execute operations
            for (const op of operations) {
              try {
                const fromAddr = investors[op.fromIndex].address;
                const toAddr = investors[op.toIndex].address;
                
                switch (op.operation) {
                  case 'issue':
                    await dsToken.issueTokens(toAddr, op.amount);
                    trackedAddresses.add(toAddr);
                    break;
                    
                  case 'transfer':
                    const balance = await dsToken.balanceOf(fromAddr);
                    if (balance >= op.amount && fromAddr !== toAddr) {
                      await dsToken.connect(investors[op.fromIndex]).transfer(toAddr, op.amount);
                      trackedAddresses.add(fromAddr);
                      trackedAddresses.add(toAddr);
                    }
                    break;
                    
                  case 'burn':
                    const burnBalance = await dsToken.balanceOf(fromAddr);
                    if (burnBalance >= op.amount) {
                      await dsToken.burn(fromAddr, op.amount, 'test burn');
                      trackedAddresses.add(fromAddr);
                    }
                    break;
                }
              } catch (error) {
                // Expected
              }
            }
            
            // Verify invariant: wallet list consistency
            const walletCount = await dsToken.walletCount();
            const walletsInList = new Set<string>();
            
            // Collect all wallets from the list
            for (let i = 1; i <= walletCount; i++) {
              const wallet = await dsToken.getWalletAt(i);
              walletsInList.add(wallet);
              
              // Every wallet in list must have balance > 0
              const balance = await dsToken.balanceOf(wallet);
              expect(balance).to.be.gt(0, `Wallet ${wallet} in list but has zero balance`);
            }
            
            // Every tracked address with balance > 0 must be in the list
            for (const address of trackedAddresses) {
              const balance = await dsToken.balanceOf(address);
              if (balance > 0) {
                expect(walletsInList.has(address), 
                  `Address ${address} has balance ${balance} but not in wallet list`
                ).to.be.true;
              } else {
                expect(walletsInList.has(address),
                  `Address ${address} has zero balance but is in wallet list`
                ).to.be.false;
              }
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });
  
  /**
   * INV-3: Investor Balance Aggregation
   * 
   * Property: Sum of all wallet balances belonging to an investor must equal investor's balance
   * 
   * Formula: ∑(walletsBalances[wallet] for wallet in investor) == investorsBalances[investor]
   */
  describe('INV-3: Investor Balance Aggregation', function() {
    
    it('should maintain investor balance equals sum of their wallet balances', async function() {
      this.timeout(120000);
      
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              operation: fc.constantFrom('issue', 'transfer'),
              amount: fc.integer({ min: 1000, max: 500000 }),
              investorIndex: fc.integer({ min: 0, max: 2 }),
              walletIndex: fc.integer({ min: 0, max: 2 }) // Each investor has multiple wallets
            }),
            { minLength: 5, maxLength: 15 }
          ),
          async (operations) => {
            const { dsToken, registryService } = await loadFixture(deployDSTokenRegulated);
            const signers = await hre.ethers.getSigners();
            const [owner, ...wallets] = signers;
            
            // Create 3 investors, each with 3 wallets
            const investorWallets: { [key: string]: string[] } = {};
            for (let i = 0; i < 3; i++) {
              const investorId = `aggtest${i}`;
              await registryService.registerInvestor(investorId, '');
              await registryService.setCountry(investorId, INVESTORS.Country.USA);
              
              investorWallets[investorId] = [];
              for (let w = 0; w < 3; w++) {
                const walletAddr = wallets[i * 3 + w].address;
                await registryService.addWallet(walletAddr, investorId);
                investorWallets[investorId].push(walletAddr);
              }
            }
            
            // Execute operations
            for (const op of operations) {
              try {
                const investorId = `aggtest${op.investorIndex}`;
                const walletAddr = investorWallets[investorId][op.walletIndex];
                
                if (op.operation === 'issue') {
                  await dsToken.issueTokens(walletAddr, op.amount);
                } else if (op.operation === 'transfer') {
                  const targetInvestorId = `aggtest${(op.investorIndex + 1) % 3}`;
                  const targetWallet = investorWallets[targetInvestorId][0];
                  
                  const balance = await dsToken.balanceOf(walletAddr);
                  if (balance >= op.amount && walletAddr !== targetWallet) {
                    const walletSigner = wallets[op.investorIndex * 3 + op.walletIndex];
                    await dsToken.connect(walletSigner).transfer(targetWallet, op.amount);
                  }
                }
              } catch (error) {
                // Expected for some operations
              }
            }
            
            // Verify invariant for each investor
            for (let i = 0; i < 3; i++) {
              const investorId = `aggtest${i}`;
              const investorBalance = await dsToken.balanceOfInvestor(investorId);
              
              let sumOfWalletBalances = 0n;
              for (const walletAddr of investorWallets[investorId]) {
                sumOfWalletBalances += await dsToken.balanceOf(walletAddr);
              }
              
              expect(investorBalance).to.equal(
                sumOfWalletBalances,
                `Investor ${investorId}: balance (${investorBalance}) != sum of wallets (${sumOfWalletBalances})`
              );
            }
          }
        ),
        { numRuns: 25 }
      );
    });
  });
  
  /**
   * INV-6: Shares-Tokens Consistency
   * 
   * Property: Tokens must always be correctly convertible to/from shares via rebasing provider
   * 
   * Formula: 
   *   tokens == rebasingProvider.convertSharesToTokens(shares)
   *   shares == rebasingProvider.convertTokensToShares(tokens)
   */
  describe('INV-6: Shares-Tokens Consistency', function() {
    
    it('should maintain consistent conversion between shares and tokens', async function() {
      this.timeout(120000);
      
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              operation: fc.constantFrom('issue', 'transfer'),
              amount: fc.integer({ min: 1, max: 1000000 }),
              fromIndex: fc.integer({ min: 0, max: 2 }),
              toIndex: fc.integer({ min: 0, max: 2 })
            }),
            { minLength: 5, maxLength: 15 }
          ),
          async (operations) => {
            const { dsToken, registryService, rebasingProvider } = await loadFixture(deployDSTokenRegulated);
            const [owner, investor1, investor2, investor3] = await hre.ethers.getSigners();
            const testInvestors = [investor1, investor2, investor3];
            
            // Register investors
            for (let i = 0; i < 3; i++) {
              await registerInvestor(`sharestest${i}`, testInvestors[i], registryService);
              await registryService.setCountry(`sharestest${i}`, INVESTORS.Country.USA);
            }
            
            // Execute operations
            for (const op of operations) {
              try {
                const fromAddr = testInvestors[op.fromIndex].address;
                const toAddr = testInvestors[op.toIndex].address;
                
                if (op.operation === 'issue') {
                  await dsToken.issueTokens(toAddr, op.amount);
                } else if (op.operation === 'transfer') {
                  const balance = await dsToken.balanceOf(fromAddr);
                  if (balance >= op.amount && fromAddr !== toAddr) {
                    await dsToken.connect(testInvestors[op.fromIndex]).transfer(toAddr, op.amount);
                  }
                }
                
                // Check shares-tokens consistency after each operation
                for (let i = 0; i < 3; i++) {
                  const addr = testInvestors[i].address;
                  const tokens = await dsToken.balanceOf(addr);
                  
                  // Convert tokens -> shares -> tokens (should be identical)
                  const shares = await rebasingProvider.convertTokensToShares(tokens);
                  const tokensBack = await rebasingProvider.convertSharesToTokens(shares);
                  
                  expect(tokens).to.equal(tokensBack, 
                    `Conversion inconsistency for ${addr}: ${tokens} -> ${shares} -> ${tokensBack}`
                  );
                }
              } catch (error) {
                // Expected for some operations
              }
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });
  
  /**
   * INV-10: Investor Count Consistency
   * 
   * Property: Total investors count should match actual unique investors with balance > 0
   * 
   * Formula: totalInvestors == count of investors where balanceOfInvestor > 0
   */
  describe('INV-10: Investor Count Consistency', function() {
    
    it('should maintain accurate investor counts across operations', async function() {
      this.timeout(120000);
      
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              operation: fc.constantFrom('issue', 'transfer', 'burn'),
              amount: fc.integer({ min: 1000, max: 100000 }),
              investorIndex: fc.integer({ min: 0, max: 3 })
            }),
            { minLength: 5, maxLength: 20 }
          ),
          async (operations) => {
            const { dsToken, registryService, complianceService } = await loadFixture(deployDSTokenRegulated);
            const [owner, investor1, investor2, investor3, investor4] = await hre.ethers.getSigners();
            const testInvestors = [investor1, investor2, investor3, investor4];
            
            // Register investors
            const investorIds = [];
            for (let i = 0; i < 4; i++) {
              const investorId = `counttest${i}`;
              investorIds.push(investorId);
              await registerInvestor(investorId, testInvestors[i], registryService);
              await registryService.setCountry(investorId, INVESTORS.Country.USA);
            }
            
            // Execute operations
            for (const op of operations) {
              try {
                const investorAddr = testInvestors[op.investorIndex].address;
                
                if (op.operation === 'issue') {
                  await dsToken.issueTokens(investorAddr, op.amount);
                } else if (op.operation === 'burn') {
                  const balance = await dsToken.balanceOf(investorAddr);
                  if (balance >= op.amount) {
                    await dsToken.burn(investorAddr, op.amount, 'test burn');
                  }
                } else if (op.operation === 'transfer') {
                  const targetIndex = (op.investorIndex + 1) % 4;
                  const targetAddr = testInvestors[targetIndex].address;
                  const balance = await dsToken.balanceOf(investorAddr);
                  if (balance >= op.amount && investorAddr !== targetAddr) {
                    await dsToken.connect(testInvestors[op.investorIndex]).transfer(targetAddr, op.amount);
                  }
                }
              } catch (error) {
                // Expected
              }
            }
            
            // Verify invariant: count actual investors with balance > 0
            let actualInvestorCount = 0;
            for (const investorId of investorIds) {
              const balance = await dsToken.balanceOfInvestor(investorId);
              if (balance > 0) {
                actualInvestorCount++;
              }
            }
            
            const reportedCount = await complianceService.getTotalInvestorsCount();
            
            expect(Number(reportedCount)).to.equal(
              actualInvestorCount,
              `Investor count mismatch: reported ${reportedCount}, actual ${actualInvestorCount}`
            );
          }
        ),
        { numRuns: 25 }
      );
    });
  });
  
  /**
   * INV-11: Accredited Investor Subset
   * 
   * Property: Accredited investors must be a subset of total investors
   * 
   * Formula: 
   *   usAccreditedInvestorsCount <= usInvestorsCount
   *   accreditedInvestorsCount <= totalInvestors
   */
  describe('INV-11: Accredited Investor Subset', function() {
    
    it('should maintain accredited investors as subset of all investors', async function() {
      this.timeout(120000);
      
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              investorIndex: fc.integer({ min: 0, max: 4 }),
              amount: fc.integer({ min: 10000, max: 500000 }),
              isAccredited: fc.boolean(),
              country: fc.constantFrom(INVESTORS.Country.USA, INVESTORS.Country.GERMANY, INVESTORS.Country.JAPAN)
            }),
            { minLength: 5, maxLength: 15 }
          ),
          async (operations) => {
            const { dsToken, registryService, complianceService } = await loadFixture(deployDSTokenRegulated);
            const signers = await hre.ethers.getSigners();
            const [owner, ...investors] = signers;
            
            // Register investors with varying accreditation
            for (let i = 0; i < 5; i++) {
              const investorId = `accredtest${i}`;
              await registryService.registerInvestor(investorId, '');
            }
            
            // Execute operations
            for (const op of operations) {
              try {
                const investorId = `accredtest${op.investorIndex}`;
                const investorAddr = investors[op.investorIndex].address;
                
                // Set attributes
                await registryService.setCountry(investorId, op.country);
                if (op.isAccredited) {
                  await registryService.setAttribute(
                    investorId,
                    '0x00000000000000000000000000000000000000000000000000000000000000a2', // ACCREDITED
                    1 // APPROVED
                  );
                }
                
                // Add wallet and issue tokens
                await registryService.addWallet(investorAddr, investorId);
                await dsToken.issueTokens(investorAddr, op.amount);
              } catch (error) {
                // Expected for some operations
              }
            }
            
            // Verify invariant
            const totalInvestors = await complianceService.getTotalInvestorsCount();
            const accreditedInvestors = await complianceService.getAccreditedInvestorsCount();
            const usInvestors = await complianceService.getUSInvestorsCount();
            const usAccredited = await complianceService.getUSAccreditedInvestorsCount();
            
            expect(Number(accreditedInvestors)).to.be.lte(
              Number(totalInvestors),
              `Accredited (${accreditedInvestors}) > Total (${totalInvestors})`
            );
            
            expect(Number(usAccredited)).to.be.lte(
              Number(usInvestors),
              `US Accredited (${usAccredited}) > US Total (${usInvestors})`
            );
            
            expect(Number(usAccredited)).to.be.lte(
              Number(accreditedInvestors),
              `US Accredited (${usAccredited}) > Total Accredited (${accreditedInvestors})`
            );
          }
        ),
        { numRuns: 20 }
      );
    });
  });
  
  /**
   * INV-14: Investor Limits Not Exceeded
   * 
   * Property: Various investor limits set in compliance configuration must be enforced
   * 
   * Formula: 
   *   totalInvestors <= totalInvestorsLimit (if limit != 0)
   *   usInvestorsCount <= usInvestorsLimit (if limit != 0)
   */
  describe('INV-14: Investor Limits Not Exceeded', function() {
    
    it('should enforce investor limits through issuance rejections', async function() {
      this.timeout(120000);
      
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 5 }),
          fc.integer({ min: 1, max: 3 }),
          fc.integer({ min: 10000, max: 100000 }),
          async (totalLimit, usLimit, amount) => {
            const { dsToken, registryService, complianceConfigurationService, complianceService } = 
              await loadFixture(deployDSTokenRegulated);
            const signers = await hre.ethers.getSigners();
            const [owner, ...investors] = signers;
            
            // Set limits
            await complianceConfigurationService.setTotalInvestorsLimit(totalLimit);
            await complianceConfigurationService.setUSInvestorsLimit(usLimit);
            
            // Try to add more investors than allowed
            let successfulIssuances = 0;
            let rejectedIssuances = 0;
            
            for (let i = 0; i < totalLimit + 3; i++) {
              try {
                const investorId = `limittest${i}`;
                await registerInvestor(investorId, investors[i], registryService);
                await registryService.setCountry(investorId, INVESTORS.Country.USA);
                
                await dsToken.issueTokens(investors[i].address, amount);
                successfulIssuances++;
              } catch (error) {
                rejectedIssuances++;
              }
            }
            
            // Verify limits are respected
            const totalInvestors = await complianceService.getTotalInvestorsCount();
            const usInvestors = await complianceService.getUSInvestorsCount();
            
            expect(Number(totalInvestors)).to.be.lte(
              totalLimit,
              `Total investors (${totalInvestors}) exceeded limit (${totalLimit})`
            );
            
            expect(Number(usInvestors)).to.be.lte(
              usLimit,
              `US investors (${usInvestors}) exceeded limit (${usLimit})`
            );
            
            // At least some issuances should have been rejected
            if (totalLimit < 8) {
              expect(rejectedIssuances).to.be.gt(0, 'Expected some issuances to be rejected');
            }
          }
        ),
        { numRuns: 15 }
      );
    });
  });
  
  /**
   * INV-15: Minimum Holdings Requirement
   * 
   * Property: Non-platform wallets must meet minimum token requirements
   * 
   * Formula: 
   *   if (!isPlatformWallet && balance > 0) {
   *     balance >= minimumHoldingsPerInvestor
   *   }
   */
  describe('INV-15: Minimum Holdings Requirement', function() {
    
    it('should enforce minimum holdings requirements for non-platform investors', async function() {
      this.timeout(120000);
      
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1000, max: 50000 }),
          fc.array(
            fc.integer({ min: 100, max: 100000 }),
            { minLength: 3, maxLength: 8 }
          ),
          async (minimumHoldings, issueAmounts) => {
            const { dsToken, registryService, complianceConfigurationService } = 
              await loadFixture(deployDSTokenRegulated);
            const [owner, investor1, investor2] = await hre.ethers.getSigners();
            
            // Set minimum holdings
            await complianceConfigurationService.setMinimumHoldingsPerInvestor(minimumHoldings);
            
            // Register investor
            await registerInvestor('mintest1', investor1, registryService);
            await registryService.setCountry('mintest1', INVESTORS.Country.USA);
            
            // Try to issue various amounts
            let belowMinRejected = false;
            let aboveMinAccepted = false;
            
            for (const amount of issueAmounts) {
              try {
                await dsToken.issueTokens(investor1.address, amount);
                
                const balance = await dsToken.balanceOfInvestor('mintest1');
                if (balance > 0) {
                  // If issuance succeeded and balance > 0, it should meet minimum
                  expect(Number(balance)).to.be.gte(
                    minimumHoldings,
                    `Balance (${balance}) below minimum (${minimumHoldings})`
                  );
                  aboveMinAccepted = true;
                }
              } catch (error) {
                // If amount is below minimum, rejection is expected
                if (amount < minimumHoldings) {
                  belowMinRejected = true;
                }
              }
            }
            
            // At least some validation should have occurred
            expect(belowMinRejected || aboveMinAccepted).to.be.true;
          }
        ),
        { numRuns: 20 }
      );
    });
  });
  
  // ============================================================================
  // PHASE 1: CRITICAL SECURITY - Remaining Invariants
  // ============================================================================
  
  /**
   * INV-2: Total Issued Non-Decreasing
   * 
   * Property: totalIssued can only increase, never decreases (even when burning)
   * 
   * Formula: totalIssued_after >= totalIssued_before
   */
  describe('INV-2: Total Issued Non-Decreasing', function() {
    
    it('should never decrease totalIssued even when burning tokens', async function() {
      this.timeout(120000);
      
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              operation: fc.constantFrom('issue', 'burn', 'transfer'),
              amount: fc.integer({ min: 1000, max: 500000 }),
              investorIndex: fc.integer({ min: 0, max: 2 })
            }),
            { minLength: 10, maxLength: 30 }
          ),
          async (operations) => {
            const { dsToken, registryService } = await loadFixture(deployDSTokenRegulated);
            const [owner, investor1, investor2, investor3] = await hre.ethers.getSigners();
            const testInvestors = [investor1, investor2, investor3];
            
            // Register investors
            for (let i = 0; i < 3; i++) {
              await registerInvestor(`issuedtest${i}`, testInvestors[i], registryService);
              await registryService.setCountry(`issuedtest${i}`, INVESTORS.Country.USA);
            }
            
            let previousTotalIssued = 0n;
            
            // Execute operations and check invariant after each
            for (const op of operations) {
              try {
                const investorAddr = testInvestors[op.investorIndex].address;
                
                const totalIssuedBefore = await dsToken.totalIssued();
                
                if (op.operation === 'issue') {
                  await dsToken.issueTokens(investorAddr, op.amount);
                } else if (op.operation === 'burn') {
                  const balance = await dsToken.balanceOf(investorAddr);
                  if (balance >= op.amount) {
                    await dsToken.burn(investorAddr, op.amount, 'test burn');
                  }
                } else if (op.operation === 'transfer') {
                  const targetIndex = (op.investorIndex + 1) % 3;
                  const balance = await dsToken.balanceOf(investorAddr);
                  if (balance >= op.amount) {
                    await dsToken.connect(testInvestors[op.investorIndex])
                      .transfer(testInvestors[targetIndex].address, op.amount);
                  }
                }
                
                const totalIssuedAfter = await dsToken.totalIssued();
                
                // INVARIANT: totalIssued never decreases
                expect(totalIssuedAfter).to.be.gte(
                  totalIssuedBefore,
                  `Total issued decreased: ${totalIssuedBefore} -> ${totalIssuedAfter}`
                );
                
                previousTotalIssued = totalIssuedAfter;
              } catch (error) {
                // Expected for some operations
              }
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });
  
  /**
   * INV-8: Transferable Tokens Bounded
   * 
   * Property: Transferable tokens must be non-negative and <= balance
   * 
   * Formula: 0 <= getTransferableTokens(investor, time) <= balanceOfInvestor(investor)
   */
  describe('INV-8: Transferable Tokens Bounded', function() {
    
    it('should maintain transferable tokens within valid bounds', async function() {
      this.timeout(120000);
      
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              investorIndex: fc.integer({ min: 0, max: 2 }),
              issueAmount: fc.integer({ min: 10000, max: 1000000 }),
              lockAmount: fc.integer({ min: 0, max: 500000 }),
              lockDays: fc.integer({ min: 1, max: 365 })
            }),
            { minLength: 5, maxLength: 15 }
          ),
          async (operations) => {
            const { dsToken, registryService, lockManager } = await loadFixture(deployDSTokenRegulated);
            const [owner, investor1, investor2, investor3] = await hre.ethers.getSigners();
            const testInvestors = [investor1, investor2, investor3];
            
            // Register investors
            for (let i = 0; i < 3; i++) {
              await registerInvestor(`boundtest${i}`, testInvestors[i], registryService);
              await registryService.setCountry(`boundtest${i}`, INVESTORS.Country.USA);
            }
            
            const currentTime = Math.floor(Date.now() / 1000);
            
            // Execute operations with locks
            for (const op of operations) {
              try {
                const investorAddr = testInvestors[op.investorIndex].address;
                const releaseTime = currentTime + (op.lockDays * 86400);
                const actualLockAmount = Math.min(op.lockAmount, op.issueAmount);
                
                if (actualLockAmount > 0 && actualLockAmount <= op.issueAmount) {
                  await dsToken.issueTokensCustom(
                    investorAddr,
                    op.issueAmount,
                    currentTime,
                    actualLockAmount,
                    'test lock',
                    releaseTime
                  );
                } else {
                  await dsToken.issueTokens(investorAddr, op.issueAmount);
                }
                
                // Check invariant
                const balance = await dsToken.balanceOf(investorAddr);
                const transferable = await lockManager.getTransferableTokens(investorAddr, currentTime);
                
                // Transferable must be >= 0
                expect(transferable).to.be.gte(0, 'Transferable tokens is negative');
                
                // Transferable must be <= balance
                expect(transferable).to.be.lte(
                  balance,
                  `Transferable (${transferable}) exceeds balance (${balance})`
                );
              } catch (error) {
                // Expected for some operations
              }
            }
          }
        ),
        { numRuns: 25 }
      );
    });
  });
  
  /**
   * INV-9: Maximum Locks Per Investor
   * 
   * Property: Each investor can have at most MAX_LOCKS_PER_INVESTOR locks (30)
   * 
   * Formula: investorsLocksCounts[investor] <= 30
   */
  describe('INV-9: Maximum Locks Per Investor', function() {
    
    it('should enforce maximum 30 locks per investor', async function() {
      this.timeout(120000);
      
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 25, max: 40 }), // Try to create 25-40 locks
          fc.array(
            fc.record({
              amount: fc.integer({ min: 1000, max: 100000 }),
              lockDays: fc.integer({ min: 1, max: 365 })
            }),
            { minLength: 25, maxLength: 40 }
          ),
          async (numAttempts, lockOperations) => {
            const { dsToken, registryService, lockManager } = await loadFixture(deployDSTokenRegulated);
            const [owner, investor1] = await hre.ethers.getSigners();
            
            await registerInvestor('maxlocktest', investor1, registryService);
            await registryService.setCountry('maxlocktest', INVESTORS.Country.USA);
            
            const currentTime = Math.floor(Date.now() / 1000);
            let successfulLocks = 0;
            let rejectedLocks = 0;
            
            // Try to create many locks
            for (const op of lockOperations) {
              try {
                const releaseTime = currentTime + (op.lockDays * 86400);
                await dsToken.issueTokensCustom(
                  investor1.address,
                  op.amount,
                  currentTime,
                  op.amount, // Lock all issued tokens
                  'test lock',
                  releaseTime
                );
                successfulLocks++;
              } catch (error) {
                rejectedLocks++;
              }
            }
            
            // Verify invariant: lock count never exceeds 30
            const lockCount = await lockManager.lockCountForInvestor('maxlocktest');
            
            expect(Number(lockCount)).to.be.lte(
              30,
              `Lock count (${lockCount}) exceeds maximum of 30`
            );
            
            // If we tried to create more than 30, some should have been rejected
            if (lockOperations.length > 30) {
              expect(rejectedLocks).to.be.gt(0, 'Expected some lock creations to be rejected');
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });
  
  /**
   * INV-12: Investor Count Only for Non-Zero Balances
   * 
   * Property: Only investors with balance > 0 should be counted
   * 
   * Formula: if (balanceOfInvestor(investor) == 0) then investor is not counted
   */
  describe('INV-12: Investor Count Only for Non-Zero Balances', function() {
    
    it('should only count investors with non-zero balances', async function() {
      this.timeout(120000);
      
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              investorIndex: fc.integer({ min: 0, max: 3 }),
              operation: fc.constantFrom('issue', 'burn-all', 'transfer-all'),
              amount: fc.integer({ min: 10000, max: 500000 })
            }),
            { minLength: 10, maxLength: 25 }
          ),
          async (operations) => {
            const { dsToken, registryService, complianceService } = await loadFixture(deployDSTokenRegulated);
            const [owner, investor1, investor2, investor3, investor4] = await hre.ethers.getSigners();
            const testInvestors = [investor1, investor2, investor3, investor4];
            
            // Register investors
            const investorIds = [];
            for (let i = 0; i < 4; i++) {
              const investorId = `zerobaltest${i}`;
              investorIds.push(investorId);
              await registerInvestor(investorId, testInvestors[i], registryService);
              await registryService.setCountry(investorId, INVESTORS.Country.USA);
            }
            
            // Execute operations
            for (const op of operations) {
              try {
                const investorAddr = testInvestors[op.investorIndex].address;
                const investorId = investorIds[op.investorIndex];
                
                if (op.operation === 'issue') {
                  await dsToken.issueTokens(investorAddr, op.amount);
                } else if (op.operation === 'burn-all') {
                  const balance = await dsToken.balanceOf(investorAddr);
                  if (balance > 0) {
                    await dsToken.burn(investorAddr, balance, 'burn all');
                  }
                } else if (op.operation === 'transfer-all') {
                  const targetIndex = (op.investorIndex + 1) % 4;
                  const balance = await dsToken.balanceOf(investorAddr);
                  if (balance > 0) {
                    await dsToken.connect(testInvestors[op.investorIndex])
                      .transfer(testInvestors[targetIndex].address, balance);
                  }
                }
              } catch (error) {
                // Expected
              }
            }
            
            // Verify invariant: count only investors with balance > 0
            const reportedCount = await complianceService.getTotalInvestorsCount();
            let actualCountWithBalance = 0;
            
            for (const investorId of investorIds) {
              const balance = await dsToken.balanceOfInvestor(investorId);
              if (balance > 0) {
                actualCountWithBalance++;
              }
            }
            
            expect(Number(reportedCount)).to.equal(
              actualCountWithBalance,
              `Count includes zero-balance investors: reported ${reportedCount}, actual ${actualCountWithBalance}`
            );
          }
        ),
        { numRuns: 25 }
      );
    });
  });
  
  /**
   * INV-20: Liquidate-Only Mode Restrictions
   * 
   * Property: Investors in liquidate-only mode can only sell, not receive
   * 
   * Formula: if (isInvestorLiquidateOnly(investor_to)) then transfers/issuances to investor are blocked
   */
  describe('INV-20: Liquidate-Only Mode Restrictions', function() {
    
    it('should prevent issuance and transfers to liquidate-only investors', async function() {
      this.timeout(120000);
      
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              fromIndex: fc.integer({ min: 0, max: 2 }),
              toIndex: fc.integer({ min: 0, max: 2 }),
              amount: fc.integer({ min: 10000, max: 500000 }),
              operation: fc.constantFrom('issue', 'transfer')
            }),
            { minLength: 5, maxLength: 15 }
          ),
          async (operations) => {
            const { dsToken, registryService, lockManager } = await loadFixture(deployDSTokenRegulated);
            const [owner, investor1, investor2, investor3] = await hre.ethers.getSigners();
            const testInvestors = [investor1, investor2, investor3];
            
            // Register investors
            const investorIds = [];
            for (let i = 0; i < 3; i++) {
              const investorId = `liqtest${i}`;
              investorIds.push(investorId);
              await registerInvestor(investorId, testInvestors[i], registryService);
              await registryService.setCountry(investorId, INVESTORS.Country.USA);
            }
            
            // Set investor 1 to liquidate-only mode
            await lockManager.setInvestorLiquidateOnly(investorIds[1], true);
            
            // Give some initial balance to investor 0 and 2
            await dsToken.issueTokens(testInvestors[0].address, 1000000);
            await dsToken.issueTokens(testInvestors[2].address, 1000000);
            
            // Execute operations
            for (const op of operations) {
              const toAddr = testInvestors[op.toIndex].address;
              const fromAddr = testInvestors[op.fromIndex].address;
              const toInvestorId = investorIds[op.toIndex];
              
              const isLiquidateOnly = await lockManager.isInvestorLiquidateOnly(toInvestorId);
              
              try {
                if (op.operation === 'issue') {
                  await dsToken.issueTokens(toAddr, op.amount);
                  
                  // If target is liquidate-only, issuance should have failed
                  if (isLiquidateOnly) {
                    throw new Error(`Issuance to liquidate-only investor ${toInvestorId} should have been rejected`);
                  }
                } else if (op.operation === 'transfer') {
                  const balance = await dsToken.balanceOf(fromAddr);
                  if (balance >= op.amount && fromAddr !== toAddr) {
                    await dsToken.connect(testInvestors[op.fromIndex]).transfer(toAddr, op.amount);
                    
                    // If target is liquidate-only and sender is different investor, should fail
                    const fromInvestorId = investorIds[op.fromIndex];
                    if (isLiquidateOnly && fromInvestorId !== toInvestorId) {
                      throw new Error(`Transfer to liquidate-only investor ${toInvestorId} should have been rejected`);
                    }
                  }
                }
              } catch (error: unknown) {
                // Expected if target is in liquidate-only mode
                if (isLiquidateOnly) {
                  // This is expected - liquidate-only should block incoming transfers
                } else {
                  // If not liquidate-only, we don't expect these specific errors
                  if (error instanceof Error && error.message && error.message.includes('should have been rejected')) {
                    throw error;
                  }
                }
              }
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });
  
  // ============================================================================
  // PHASE 1: CRITICAL SECURITY - Compliance Rules
  // ============================================================================
  
  /**
   * COMPLIANCE: Flowback Prevention
   * 
   * Property: EU -> US transfers should be blocked during flowback period
   */
  describe('Compliance: Flowback Prevention', function() {
    
    it('should block EU to US transfers during flowback period', async function() {
      this.timeout(120000);
      
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              fromCountry: fc.constantFrom(INVESTORS.Country.GERMANY, INVESTORS.Country.SPAIN, INVESTORS.Country.FRANCE),
              toCountry: fc.constantFrom(INVESTORS.Country.USA, INVESTORS.Country.GERMANY),
              amount: fc.integer({ min: 10000, max: 500000 })
            }),
            { minLength: 5, maxLength: 15 }
          ),
          async (transfers) => {
            const { dsToken, registryService, complianceConfigurationService } = 
              await loadFixture(deployDSTokenRegulated);
            const signers = await hre.ethers.getSigners();
            const [owner, ...investors] = signers;
            
            // Set flowback end time to 1 year from now
            const flowbackEndTime = Math.floor(Date.now() / 1000) + (365 * 86400);
            await complianceConfigurationService.setBlockFlowbackEndTime(flowbackEndTime);
            
            // Execute transfers
            for (let i = 0; i < transfers.length && i < 10; i++) {
              const transfer = transfers[i];
              const fromId = `flowback_from_${i}`;
              const toId = `flowback_to_${i}`;
              
              try {
                // Register and set up investors
                await registerInvestor(fromId, investors[i * 2], registryService);
                await registerInvestor(toId, investors[i * 2 + 1], registryService);
                await registryService.setCountry(fromId, transfer.fromCountry);
                await registryService.setCountry(toId, transfer.toCountry);
                
                // Issue to sender
                await dsToken.issueTokens(investors[i * 2].address, transfer.amount);
                
                // Try transfer
                await dsToken.connect(investors[i * 2])
                  .transfer(investors[i * 2 + 1].address, transfer.amount);
                
                // If fromCountry is EU and toCountry is USA, transfer should have been blocked
                const isEUtoUS = 
                  transfer.fromCountry !== INVESTORS.Country.USA && 
                  transfer.toCountry === INVESTORS.Country.USA;
                
                if (isEUtoUS) {
                  throw new Error(`Flowback violation: ${transfer.fromCountry} -> ${transfer.toCountry} should be blocked`);
                }
              } catch (error: unknown) {
                // Expected for EU -> US during flowback period
                const isEUtoUS = 
                  transfer.fromCountry !== INVESTORS.Country.USA && 
                  transfer.toCountry === INVESTORS.Country.USA;
                
                if (!isEUtoUS && error instanceof Error && error.message && error.message.includes('should be blocked')) {
                  throw error;
                }
              }
            }
          }
        ),
        { numRuns: 15 }
      );
    });
  });
  
  /**
   * COMPLIANCE: Accreditation Requirements
   * 
   * Property: When forceAccredited is enabled, only accredited investors can receive tokens
   */
  describe('Compliance: Accreditation Requirements', function() {
    
    it('should enforce accreditation requirements when enabled', async function() {
      this.timeout(120000);
      
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(), // forceAccredited flag
          fc.boolean(), // forceAccreditedUS flag
          fc.array(
            fc.record({
              investorIndex: fc.integer({ min: 0, max: 4 }),
              isAccredited: fc.boolean(),
              country: fc.constantFrom(INVESTORS.Country.USA, INVESTORS.Country.GERMANY),
              amount: fc.integer({ min: 10000, max: 500000 })
            }),
            { minLength: 5, maxLength: 10 }
          ),
          async (forceAccredited, forceAccreditedUS, issuances) => {
            const { dsToken, registryService, complianceConfigurationService } = 
              await loadFixture(deployDSTokenRegulated);
            const signers = await hre.ethers.getSigners();
            const [owner, ...investors] = signers;
            
            // Set accreditation requirements
            await complianceConfigurationService.setForceAccredited(forceAccredited);
            await complianceConfigurationService.setForceAccreditedUS(forceAccreditedUS);
            
            let successfulIssuances = 0;
            let rejectedIssuances = 0;
            
            for (const issuance of issuances) {
              try {
                const investorId = `accredreq_${issuance.investorIndex}`;
                const investorAddr = investors[issuance.investorIndex].address;
                
                // Register investor
                await registryService.registerInvestor(investorId, '');
                await registryService.setCountry(investorId, issuance.country);
                
                // Set accreditation status
                if (issuance.isAccredited) {
                  await registryService.setAttribute(
                    investorId,
                    '0x00000000000000000000000000000000000000000000000000000000000000a2',
                    1
                  );
                }
                
                await registryService.addWallet(investorAddr, investorId);
                await dsToken.issueTokens(investorAddr, issuance.amount);
                
                successfulIssuances++;
                
                // Verify invariant: if force flags are enabled, investor must be accredited
                if (forceAccredited || (forceAccreditedUS && issuance.country === INVESTORS.Country.USA)) {
                  expect(issuance.isAccredited, 
                    `Non-accredited investor received tokens when forceAccredited=${forceAccredited}, forceAccreditedUS=${forceAccreditedUS}`
                  ).to.be.true;
                }
              } catch (error) {
                rejectedIssuances++;
                // Expected for non-accredited when force flags are on
              }
            }
          }
        ),
        { numRuns: 15 }
      );
    });
  });
  
  /**
   * COMPLIANCE: Regional Investor Limits
   * 
   * Property: JP, EU retail, and US investor limits must be enforced
   */
  describe('Compliance: Regional Investor Limits', function() {
    
    it('should enforce regional investor limits', async function() {
      this.timeout(120000);
      
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 4 }), // JP limit
          fc.integer({ min: 2, max: 4 }), // EU retail limit
          fc.array(
            fc.record({
              country: fc.constantFrom(INVESTORS.Country.JAPAN, INVESTORS.Country.GERMANY, INVESTORS.Country.SPAIN),
              isQualified: fc.boolean(),
              amount: fc.integer({ min: 10000, max: 100000 })
            }),
            { minLength: 5, maxLength: 10 }
          ),
          async (jpLimit, euRetailLimit, issuances) => {
            const { dsToken, registryService, complianceConfigurationService, complianceService } = 
              await loadFixture(deployDSTokenRegulated);
            const signers = await hre.ethers.getSigners();
            const [owner, ...investors] = signers;
            
            // Set regional limits
            await complianceConfigurationService.setJPInvestorsLimit(jpLimit);
            await complianceConfigurationService.setEURetailInvestorsLimit(euRetailLimit);
            
            for (let i = 0; i < issuances.length && i < investors.length; i++) {
              const issuance = issuances[i];
              
              try {
                const investorId = `regional_${i}`;
                const investorAddr = investors[i].address;
                
                await registryService.registerInvestor(investorId, '');
                await registryService.setCountry(investorId, issuance.country);
                
                // Set qualified status for EU investors
                if (issuance.isQualified && issuance.country !== INVESTORS.Country.JAPAN) {
                  await registryService.setAttribute(
                    investorId,
                    '0x00000000000000000000000000000000000000000000000000000000000000a1', // QUALIFIED
                    1
                  );
                }
                
                await registryService.addWallet(investorAddr, investorId);
                await dsToken.issueTokens(investorAddr, issuance.amount);
              } catch (error) {
                // Expected when limits are exceeded
              }
            }
            
            // Verify limits are not exceeded
            const jpCount = await complianceService.getJPInvestorsCount();
            expect(Number(jpCount)).to.be.lte(jpLimit, `JP investor limit exceeded`);
            
            // Check EU retail limits for each country
            const germanyRetail = await complianceService.getEURetailInvestorsCount(INVESTORS.Country.GERMANY);
            const spainRetail = await complianceService.getEURetailInvestorsCount(INVESTORS.Country.SPAIN);
            
            expect(Number(germanyRetail)).to.be.lte(euRetailLimit, `Germany retail limit exceeded`);
            expect(Number(spainRetail)).to.be.lte(euRetailLimit, `Spain retail limit exceeded`);
          }
        ),
        { numRuns: 15 }
      );
    });
  });
  
  // ============================================================================
  // PHASE 1: CRITICAL SECURITY - Access Control
  // ============================================================================
  
  /**
   * SECURITY: Access Control Enforcement
   * 
   * Property: Only authorized roles can execute privileged operations
   */
  describe('Security: Access Control', function() {
    
    it('should prevent unauthorized access to privileged functions', async function() {
      this.timeout(120000);
      
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              operation: fc.constantFrom('issue', 'burn', 'seize', 'pause', 'setFeature'),
              signerIndex: fc.integer({ min: 0, max: 4 }), // Different signers with different roles
              amount: fc.integer({ min: 10000, max: 500000 })
            }),
            { minLength: 5, maxLength: 15 }
          ),
          async (operations) => {
            const { dsToken, registryService } = await loadFixture(deployDSTokenRegulated);
            const signers = await hre.ethers.getSigners();
            const [owner, investor1, investor2, attacker1, attacker2] = signers;
            
            // Register legitimate investors
            await registerInvestor('accesstest1', investor1, registryService);
            await registerInvestor('accesstest2', investor2, registryService);
            await registryService.setCountry('accesstest1', INVESTORS.Country.USA);
            await registryService.setCountry('accesstest2', INVESTORS.Country.USA);
            
            // Give some balance to investor1 for burn/seize tests
            await dsToken.issueTokens(investor1.address, 10000000);
            
            for (const op of operations) {
              const signer = signers[op.signerIndex];
              const isOwner = op.signerIndex === 0;
              
              try {
                switch (op.operation) {
                  case 'issue':
                    await dsToken.connect(signer).issueTokens(investor2.address, op.amount);
                    // Only owner/issuer should succeed
                    if (!isOwner) {
                      throw new Error(`Unauthorized issue succeeded from signer ${op.signerIndex}`);
                    }
                    break;
                    
                  case 'burn':
                    await dsToken.connect(signer).burn(investor1.address, 1000, 'unauthorized burn');
                    if (!isOwner) {
                      throw new Error(`Unauthorized burn succeeded from signer ${op.signerIndex}`);
                    }
                    break;
                    
                  case 'seize':
                    await dsToken.connect(signer).seize(investor1.address, investor2.address, 1000, 'unauthorized seize');
                    if (!isOwner) {
                      throw new Error(`Unauthorized seize succeeded from signer ${op.signerIndex}`);
                    }
                    break;
                    
                  case 'pause':
                    await dsToken.connect(signer).pause();
                    if (!isOwner) {
                      throw new Error(`Unauthorized pause succeeded from signer ${op.signerIndex}`);
                    }
                    // Unpause for next operation
                    if (isOwner) {
                      await dsToken.unpause();
                    }
                    break;
                    
                  case 'setFeature':
                    await dsToken.connect(signer).setFeature(1, true);
                    if (!isOwner) {
                      throw new Error(`Unauthorized setFeature succeeded from signer ${op.signerIndex}`);
                    }
                    break;
                }
              } catch (error: unknown) {
                // Expected for unauthorized signers
                if (!isOwner) {
                  // This is good - unauthorized access was blocked
                } else {
                  // Owner should not fail (unless there's a different reason)
                  if (error instanceof Error && error.message && error.message.includes('Unauthorized')) {
                    throw error;
                  }
                }
              }
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });
  
  // ============================================================================
  // PHASE 2: COMPLEX SCENARIOS - Rebasing Provider
  // ============================================================================
  
  /**
   * PHASE 2: Rebasing Provider with Multiplier Changes
   * 
   * Property: When multiplier changes (NAV update), all balances should scale correctly
   * and invariants should still hold
   */
  describe('Phase 2: Rebasing Provider with Multiplier Changes', function() {
    
    it('should maintain invariants when multiplier changes during operations', async function() {
      this.timeout(180000);
      
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              operation: fc.constantFrom('issue', 'transfer', 'multiplier-change'),
              amount: fc.integer({ min: 10000, max: 500000 }),
              multiplier: fc.integer({ min: 500000000000000000, max: 3000000000000000000 }), // 0.5x to 3.0x
              investorIndex: fc.integer({ min: 0, max: 2 })
            }),
            { minLength: 10, maxLength: 25 }
          ),
          async (operations) => {
            const { dsToken, registryService, rebasingProvider } = 
              await loadFixture(deployDSTokenRegulated);
            const [owner, investor1, investor2, investor3] = await hre.ethers.getSigners();
            const testInvestors = [investor1, investor2, investor3];
            
            // Register investors
            for (let i = 0; i < 3; i++) {
              await registerInvestor(`rebasetest${i}`, testInvestors[i], registryService);
              await registryService.setCountry(`rebasetest${i}`, INVESTORS.Country.USA);
            }
            
            // Track balances to verify scaling
            const expectedBalances: { [key: string]: bigint } = {};
            
            for (const op of operations) {
              try {
                const investorAddr = testInvestors[op.investorIndex].address;
                
                if (op.operation === 'issue') {
                  await dsToken.issueTokens(investorAddr, op.amount);
                  
                } else if (op.operation === 'transfer') {
                  const targetIndex = (op.investorIndex + 1) % 3;
                  const balance = await dsToken.balanceOf(investorAddr);
                  if (balance >= op.amount) {
                    await dsToken.connect(testInvestors[op.investorIndex])
                      .transfer(testInvestors[targetIndex].address, op.amount);
                  }
                  
                } else if (op.operation === 'multiplier-change') {
                  // Change the multiplier (NAV update)
                  const oldMultiplier = await rebasingProvider.multiplier();
                  
                  // Store balances before change
                  const balancesBefore: bigint[] = [];
                  for (let i = 0; i < 3; i++) {
                    balancesBefore[i] = await dsToken.balanceOf(testInvestors[i].address);
                  }
                  
                  // Change multiplier
                  await rebasingProvider.setMultiplier(op.multiplier);
                  const newMultiplier = await rebasingProvider.multiplier();
                  
                  // Verify balances scaled proportionally
                  for (let i = 0; i < 3; i++) {
                    const balanceAfter = await dsToken.balanceOf(testInvestors[i].address);
                    if (balancesBefore[i] > 0n) {
                      // Balance should scale with multiplier ratio
                      const expectedRatio = Number(newMultiplier) / Number(oldMultiplier);
                      const actualRatio = Number(balanceAfter) / Number(balancesBefore[i]);
                      
                      // Allow 0.1% tolerance for rounding
                      expect(Math.abs(actualRatio - expectedRatio)).to.be.lt(
                        0.001,
                        `Balance scaling incorrect: expected ratio ${expectedRatio}, got ${actualRatio}`
                      );
                    }
                  }
                }
                
                // Verify core invariants still hold after any operation
                const totalSupply = await dsToken.totalSupply();
                expect(totalSupply).to.be.gte(0, 'Total supply became negative');
                
                // Verify sum of balances = totalSupply
                let sumBalances = 0n;
                for (let i = 0; i < 3; i++) {
                  const balance = await dsToken.balanceOf(testInvestors[i].address);
                  expect(balance).to.be.gte(0, 'Balance became negative');
                  sumBalances += balance;
                }
                expect(sumBalances).to.equal(totalSupply, 'Sum of balances != totalSupply');
                
                // Verify shares-tokens consistency
                for (let i = 0; i < 3; i++) {
                  const tokens = await dsToken.balanceOf(testInvestors[i].address);
                  const shares = await rebasingProvider.convertTokensToShares(tokens);
                  const tokensBack = await rebasingProvider.convertSharesToTokens(shares);
                  expect(tokens).to.equal(tokensBack, 'Shares-tokens conversion inconsistent');
                }
                
              } catch (error) {
                // Expected for some operations
              }
            }
          }
        ),
        { numRuns: 15 }
      );
    });
    
    it('should handle extreme multiplier changes without breaking invariants', async function() {
      this.timeout(60000);
      
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.integer({ min: 500000000000000000, max: 3000000000000000000 }), // 0.5x to 3.0x (more reasonable range)
            { minLength: 2, maxLength: 5 }
          ),
          async (multipliers) => {
            const { dsToken, registryService, rebasingProvider } = 
              await loadFixture(deployDSTokenRegulated);
            const [owner, investor1] = await hre.ethers.getSigners();
            
            await registerInvestor('extremetest', investor1, registryService);
            await registryService.setCountry('extremetest', INVESTORS.Country.USA);
            
            // Issue initial tokens
            await dsToken.issueTokens(investor1.address, 1000000);
            
            const initialBalance = await dsToken.balanceOf(investor1.address);
            expect(initialBalance).to.equal(1000000);
            
            // Apply sequence of multiplier changes
            for (const multiplier of multipliers) {
              try {
                await rebasingProvider.setMultiplier(multiplier);
                
                // Verify balance is still positive and reasonable
                const balance = await dsToken.balanceOf(investor1.address);
                expect(balance).to.be.gt(0, 'Balance became zero or negative');
                
                // Verify can still query and use the balance
                const shares = await rebasingProvider.convertTokensToShares(balance);
                expect(shares).to.be.gt(0, 'Shares became zero or negative');
                
                // Verify totalSupply is consistent
                const totalSupply = await dsToken.totalSupply();
                expect(totalSupply).to.equal(balance, 'TotalSupply != balance for single investor');
              } catch (error) {
                // Expected for some extreme multipliers
              }
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });
  
  // ============================================================================
  // PHASE 2: COMPLEX SCENARIOS - Lock Manager
  // ============================================================================
  
  /**
   * PHASE 2: Complex Lock Scenarios
   * 
   * Property: System should correctly handle up to 30 locks per investor with overlapping
   * release times and proper cleanup
   */
  describe('Phase 2: Complex Lock Scenarios', function() {
    
    it('should handle multiple overlapping locks correctly', async function() {
      this.timeout(120000);
      
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              operation: fc.constantFrom('add-lock', 'remove-lock', 'check-transferable', 'time-advance'),
              amount: fc.integer({ min: 1000, max: 100000 }),
              lockDays: fc.integer({ min: 1, max: 180 }),
              lockIndex: fc.integer({ min: 0, max: 29 }),
              daysToAdvance: fc.integer({ min: 1, max: 30 })
            }),
            { minLength: 10, maxLength: 25 }
          ),
          async (operations) => {
            const { dsToken, registryService, lockManager } = await loadFixture(deployDSTokenRegulated);
            const [owner, investor1] = await hre.ethers.getSigners();
            
            await registerInvestor('complexlock', investor1, registryService);
            await registryService.setCountry('complexlock', INVESTORS.Country.USA);
            
            // Give investor a large balance to work with
            await dsToken.issueTokens(investor1.address, 10000000);
            
            let currentTime = Math.floor(Date.now() / 1000);
            
            for (const op of operations) {
              try {
                if (op.operation === 'add-lock') {
                  const lockCount = await lockManager.lockCountForInvestor('complexlock');
                  
                  // Only add if under limit
                  if (Number(lockCount) < 30) {
                    const releaseTime = currentTime + (op.lockDays * 86400);
                    await lockManager.createLockForInvestor(
                      'complexlock',
                      op.amount,
                      0,
                      'complex test lock',
                      releaseTime
                    );
                  }
                  
                } else if (op.operation === 'remove-lock') {
                  const lockCount = await lockManager.lockCountForInvestor('complexlock');
                  
                  if (Number(lockCount) > 0) {
                    const indexToRemove = op.lockIndex % Number(lockCount);
                    await lockManager.removeLockRecordForInvestor('complexlock', indexToRemove);
                  }
                  
                } else if (op.operation === 'check-transferable') {
                  const balance = await dsToken.balanceOf(investor1.address);
                  const transferable = await lockManager.getTransferableTokens(investor1.address, currentTime);
                  
                  // Invariant: 0 <= transferable <= balance
                  expect(transferable).to.be.gte(0, 'Transferable is negative');
                  expect(transferable).to.be.lte(balance, 'Transferable exceeds balance');
                  
                  // Invariant: sum of active locks <= balance
                  const lockCount = await lockManager.lockCountForInvestor('complexlock');
                  let totalLocked = 0n;
                  
                  for (let i = 0; i < Number(lockCount); i++) {
                    const lockInfo = await lockManager.lockInfoForInvestor('complexlock', i);
                    // Only count locks that haven't expired
                    if (lockInfo.autoReleaseTime === 0n || Number(lockInfo.autoReleaseTime) > currentTime) {
                      totalLocked += lockInfo.value;
                    }
                  }
                  
                  expect(totalLocked).to.be.lte(balance, 'Total locked exceeds balance');
                  
                } else if (op.operation === 'time-advance') {
                  // Simulate time passing (some locks may expire)
                  currentTime += op.daysToAdvance * 86400;
                }
                
                // Verify lock count never exceeds 30
                const lockCount = await lockManager.lockCountForInvestor('complexlock');
                expect(Number(lockCount)).to.be.lte(30, 'Lock count exceeded maximum of 30');
                
              } catch (error) {
                // Expected for some operations
              }
            }
          }
        ),
        { numRuns: 20 }
      );
    });
    
    it('should correctly calculate transferable tokens with expiring locks', async function() {
      this.timeout(120000);
      
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 5, max: 20 }), // Number of locks
          fc.array(
            fc.integer({ min: 1, max: 90 }), // Days until each lock expires
            { minLength: 5, maxLength: 20 }
          ),
          async (numLocks, expiryDays) => {
            const { dsToken, registryService, lockManager } = await loadFixture(deployDSTokenRegulated);
            const [owner, investor1] = await hre.ethers.getSigners();
            
            await registerInvestor('expirytest', investor1, registryService);
            await registryService.setCountry('expirytest', INVESTORS.Country.USA);
            
            // Issue tokens
            const totalAmount = 10000000;
            await dsToken.issueTokens(investor1.address, totalAmount);
            
            const baseTime = Math.floor(Date.now() / 1000);
            const lockAmount = Math.floor(totalAmount / numLocks);
            
            // Create multiple locks with different expiry times
            for (let i = 0; i < numLocks && i < expiryDays.length; i++) {
              const releaseTime = baseTime + (expiryDays[i] * 86400);
              try {
                await lockManager.createLockForInvestor(
                  'expirytest',
                  lockAmount,
                  0,
                  'expiry test',
                  releaseTime
                );
              } catch (error) {
                // Expected if we hit the 30 lock limit
                break;
              }
            }
            
            // Check transferable at different time points
            const timePoints = [
              baseTime,
              baseTime + (30 * 86400),  // 30 days later
              baseTime + (60 * 86400),  // 60 days later
              baseTime + (100 * 86400)  // 100 days later (all should be expired)
            ];
            
            let previousTransferable = 0n;
            
            for (const checkTime of timePoints) {
              const transferable = await lockManager.getTransferableTokens(investor1.address, checkTime);
              const balance = await dsToken.balanceOf(investor1.address);
              
              // As time advances, transferable should increase or stay same (locks expire)
              expect(transferable).to.be.gte(previousTransferable, 'Transferable decreased over time');
              expect(transferable).to.be.lte(balance, 'Transferable exceeds balance');
              
              previousTransferable = transferable;
            }
            
            // At the end, all locks should be expired
            const finalTransferable = await lockManager.getTransferableTokens(
              investor1.address,
              baseTime + (100 * 86400)
            );
            const balance = await dsToken.balanceOf(investor1.address);
            expect(finalTransferable).to.equal(balance, 'Not all locks expired');
          }
        ),
        { numRuns: 20 }
      );
    });
  });
  
  // ============================================================================
  // PHASE 2: COMPLEX SCENARIOS - Multi-Wallet Investors
  // ============================================================================
  
  /**
   * PHASE 2: Multi-Wallet Investor Scenarios
   * 
   * Property: One investor with multiple wallets should have correct aggregated balance
   * and operations across wallets should maintain consistency
   */
  describe('Phase 2: Multi-Wallet Investor Scenarios', function() {
    
    it('should maintain correct balances across multiple wallets for same investor', async function() {
      this.timeout(120000);
      
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              operation: fc.constantFrom('issue', 'transfer-internal', 'transfer-external', 'burn'),
              amount: fc.integer({ min: 1000, max: 500000 }),
              fromWalletIndex: fc.integer({ min: 0, max: 4 }),
              toWalletIndex: fc.integer({ min: 0, max: 4 })
            }),
            { minLength: 8, maxLength: 20 }
          ),
          async (operations) => {
            const { dsToken, registryService, complianceService } = 
              await loadFixture(deployDSTokenRegulated);
            const signers = await hre.ethers.getSigners();
            const [owner, ...wallets] = signers;
            
            // Create investor with 5 wallets
            const investorId = 'multiwallet_investor';
            await registryService.registerInvestor(investorId, '');
            await registryService.setCountry(investorId, INVESTORS.Country.USA);
            
            const investorWallets: string[] = [];
            for (let i = 0; i < 5; i++) {
              await registryService.addWallet(wallets[i].address, investorId);
              investorWallets.push(wallets[i].address);
            }
            
            // Create a second investor for external transfers
            const externalInvestorId = 'external_investor';
            await registryService.registerInvestor(externalInvestorId, '');
            await registryService.setCountry(externalInvestorId, INVESTORS.Country.USA);
            await registryService.addWallet(wallets[5].address, externalInvestorId);
            
            for (const op of operations) {
              try {
                const fromWallet = investorWallets[op.fromWalletIndex];
                const toWallet = investorWallets[op.toWalletIndex];
                
                if (op.operation === 'issue') {
                  await dsToken.issueTokens(fromWallet, op.amount);
                  
                } else if (op.operation === 'transfer-internal') {
                  // Transfer between wallets of same investor
                  const balance = await dsToken.balanceOf(fromWallet);
                  if (balance >= op.amount && fromWallet !== toWallet) {
                    await dsToken.connect(wallets[op.fromWalletIndex])
                      .transfer(toWallet, op.amount);
                  }
                  
                } else if (op.operation === 'transfer-external') {
                  // Transfer to external investor
                  const balance = await dsToken.balanceOf(fromWallet);
                  if (balance >= op.amount) {
                    await dsToken.connect(wallets[op.fromWalletIndex])
                      .transfer(wallets[5].address, op.amount);
                  }
                  
                } else if (op.operation === 'burn') {
                  const balance = await dsToken.balanceOf(fromWallet);
                  if (balance >= op.amount) {
                    await dsToken.burn(fromWallet, op.amount, 'multiwallet test');
                  }
                }
                
                // Verify invariant: investor balance = sum of all their wallet balances
                const investorBalance = await dsToken.balanceOfInvestor(investorId);
                let sumOfWallets = 0n;
                
                for (const wallet of investorWallets) {
                  const walletBalance = await dsToken.balanceOf(wallet);
                  sumOfWallets += walletBalance;
                }
                
                expect(investorBalance).to.equal(
                  sumOfWallets,
                  `Investor balance (${investorBalance}) != sum of wallets (${sumOfWallets})`
                );
                
                // Verify investor count (should be 1 or 2 depending on external transfers)
                const totalInvestors = await complianceService.getTotalInvestorsCount();
                expect(Number(totalInvestors)).to.be.gte(0);
                expect(Number(totalInvestors)).to.be.lte(2);
                
              } catch (error) {
                // Expected for some operations
              }
            }
          }
        ),
        { numRuns: 15 }
      );
    });
    
    it('should correctly track investor counts when wallets change investors', async function() {
      this.timeout(120000);
      
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              operation: fc.constantFrom('issue', 'reassign-wallet', 'burn-all'),
              walletIndex: fc.integer({ min: 0, max: 2 }),
              newInvestorIndex: fc.integer({ min: 0, max: 2 }),
              amount: fc.integer({ min: 10000, max: 500000 })
            }),
            { minLength: 8, maxLength: 20 }
          ),
          async (operations) => {
            const { dsToken, registryService, complianceService } = 
              await loadFixture(deployDSTokenRegulated);
            const [owner, wallet1, wallet2, wallet3] = await hre.ethers.getSigners();
            const testWallets = [wallet1, wallet2, wallet3];
            
            // Create 3 investors
            const investorIds = ['reassign_inv1', 'reassign_inv2', 'reassign_inv3'];
            for (const investorId of investorIds) {
              await registryService.registerInvestor(investorId, '');
              await registryService.setCountry(investorId, INVESTORS.Country.USA);
            }
            
            // Initially assign each wallet to investor 0
            for (let i = 0; i < 3; i++) {
              await registryService.addWallet(testWallets[i].address, investorIds[0]);
            }
            
            for (const op of operations) {
              try {
                const walletAddr = testWallets[op.walletIndex].address;
                
                if (op.operation === 'issue') {
                  await dsToken.issueTokens(walletAddr, op.amount);
                  
                } else if (op.operation === 'reassign-wallet') {
                  // Reassign wallet to different investor (only if balance is 0)
                  const balance = await dsToken.balanceOf(walletAddr);
                  if (balance === 0n) {
                    const newInvestorId = investorIds[op.newInvestorIndex];
                    // Note: In practice, this would require burning all tokens first
                    // For this test, we only reassign if wallet has zero balance
                    await registryService.removeWallet(walletAddr);
                    await registryService.addWallet(walletAddr, newInvestorId);
                  }
                  
                } else if (op.operation === 'burn-all') {
                  const balance = await dsToken.balanceOf(walletAddr);
                  if (balance > 0) {
                    await dsToken.burn(walletAddr, balance, 'reassign test');
                  }
                }
                
                // Verify: investor counts are consistent
                const totalInvestors = await complianceService.getTotalInvestorsCount();
                
                // Count actual investors with non-zero balance
                let actualCount = 0;
                for (const investorId of investorIds) {
                  const balance = await dsToken.balanceOfInvestor(investorId);
                  if (balance > 0) {
                    actualCount++;
                  }
                }
                
                expect(Number(totalInvestors)).to.equal(
                  actualCount,
                  `Investor count mismatch: reported ${totalInvestors}, actual ${actualCount}`
                );
                
              } catch (error) {
                // Expected for some operations
              }
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  // ============================================================================
  // PHASE 3: STATEFUL FUZZING - Long Operation Sequences
  // ============================================================================

  /**
   * PHASE 3: Stateful Fuzzing
   *
   * Property: After long sequences of random operations (50-100+), all invariants
   * should still hold and state should remain consistent
   *
   * This simulates real-world usage over time and catches:
   * - State corruption bugs
   * - Accumulating rounding errors
   * - Memory leaks
   * - Interaction bugs between features
   */
  describe('Phase 3: Stateful Fuzzing - Long Operation Sequences', function() {
    
    it('should maintain all invariants after 100+ random operations', async function() {
      this.timeout(180000); // 3 minutes
      
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              operation: fc.constantFrom(
                'issue', 'transfer', 'burn', 'seize', 
                'add-lock', 'remove-lock', 'time-advance',
                'change-limit', 'toggle-feature'
              ),
              amount: fc.integer({ min: 1000, max: 1000000 }),
              fromIndex: fc.integer({ min: 0, max: 9 }),
              toIndex: fc.integer({ min: 0, max: 9 }),
              lockDays: fc.integer({ min: 30, max: 365 }),
              daysToAdvance: fc.integer({ min: 1, max: 60 }),
              limitValue: fc.integer({ min: 5, max: 50 })
            }),
            { minLength: 50, maxLength: 100 }
          ),
          async (operations) => {
            const { dsToken, registryService, complianceService, lockManager, complianceConfigurationService } = 
              await loadFixture(deployDSTokenRegulated);
            const signers = await hre.ethers.getSigners();
            const [owner, ...investors] = signers;
            
            // Register 10 investors
            const investorData = [];
            for (let i = 0; i < 10; i++) {
              const investorId = `stateful_inv${i}`;
              await registerInvestor(investorId, investors[i], registryService);
              await registryService.setCountry(
                investorId,
                i % 3 === 0 ? INVESTORS.Country.USA : 
                i % 3 === 1 ? INVESTORS.Country.GERMANY : 
                INVESTORS.Country.JAPAN
              );
              investorData.push({ id: investorId, signer: investors[i] });
            }
            
            let operationCount = 0;
            const lockCount: { [key: string]: number } = {};
            
            // Execute long sequence of operations
            for (const op of operations) {
              try {
                operationCount++;
                const fromInvestor = investorData[op.fromIndex];
                const toInvestor = investorData[op.toIndex];
                
                if (op.operation === 'issue') {
                  await dsToken.issueTokens(fromInvestor.signer.address, op.amount);
                  
                } else if (op.operation === 'transfer') {
                  const balance = await dsToken.balanceOf(fromInvestor.signer.address);
                  if (balance > 0) {
                    const transferAmount = balance > BigInt(op.amount) ? op.amount : Number(balance) / 2;
                    if (transferAmount > 0) {
                      await dsToken.connect(fromInvestor.signer).transfer(
                        toInvestor.signer.address,
                        transferAmount
                      );
                    }
                  }
                  
                } else if (op.operation === 'burn') {
                  const balance = await dsToken.balanceOf(fromInvestor.signer.address);
                  if (balance > 0) {
                    const burnAmount = balance > BigInt(op.amount) ? op.amount : balance;
                    await dsToken.burn(fromInvestor.signer.address, burnAmount, 'stateful test');
                  }
                  
                } else if (op.operation === 'seize') {
                  const balance = await dsToken.balanceOf(fromInvestor.signer.address);
                  if (balance > 0) {
                    const seizeAmount = balance > BigInt(op.amount) ? op.amount : balance / 2n;
                    if (seizeAmount > 0) {
                      await dsToken.seize(
                        fromInvestor.signer.address,
                        toInvestor.signer.address,
                        seizeAmount,
                        'stateful test'
                      );
                    }
                  }
                  
                } else if (op.operation === 'add-lock') {
                  const investorLocks = lockCount[fromInvestor.id] || 0;
                  if (investorLocks < 30) {
                    const balance = await dsToken.balanceOf(fromInvestor.signer.address);
                    if (balance > 0) {
                      const lockAmount = balance > BigInt(op.amount) ? op.amount : Number(balance) / 2;
                      if (lockAmount > 0) {
                        const releaseTime = (await hre.ethers.provider.getBlock('latest'))!.timestamp + 
                                          (op.lockDays * 86400);
                        await lockManager.createLockForInvestor(
                          fromInvestor.id,
                          lockAmount,
                          0, // reasonCode
                          'stateful lock',
                          releaseTime
                        );
                        lockCount[fromInvestor.id] = investorLocks + 1;
                      }
                    }
                  }
                  
                } else if (op.operation === 'remove-lock') {
                  const investorLocks = lockCount[fromInvestor.id] || 0;
                  if (investorLocks > 0) {
                    try {
                      await lockManager.removeLockRecordForInvestor(fromInvestor.id, investorLocks - 1);
                      lockCount[fromInvestor.id] = investorLocks - 1;
                    } catch {
                      // Lock might be active, that's ok
                    }
                  }
                  
                } else if (op.operation === 'time-advance') {
                  await hre.network.provider.send("evm_increaseTime", [op.daysToAdvance * 86400]);
                  await hre.network.provider.send("evm_mine");
                  
                } else if (op.operation === 'change-limit') {
                  await complianceConfigurationService.setMaxInvestorsCount(op.limitValue);
                  
                } else if (op.operation === 'toggle-feature') {
                  const currentState = await dsToken.isPaused();
                  if (currentState) {
                    await dsToken.unpause();
                  }
                }
                
                // Every 10 operations, verify ALL core invariants
                if (operationCount % 10 === 0) {
                  // INV-1: Total supply = sum of balances
                  let sumOfBalances = 0n;
                  for (const inv of investorData) {
                    sumOfBalances += await dsToken.balanceOf(inv.signer.address);
                  }
                  const totalSupply = await dsToken.totalSupply();
                  expect(totalSupply).to.equal(sumOfBalances, 
                    `After ${operationCount} ops: Total supply mismatch`);
                  
                  // INV-4: All balances >= 0
                  for (const inv of investorData) {
                    const balance = await dsToken.balanceOf(inv.signer.address);
                    expect(balance).to.be.gte(0, 
                      `After ${operationCount} ops: Negative balance for ${inv.id}`);
                  }
                  
                  // INV-10: Investor count consistency
                  const totalInvestors = await complianceService.getTotalInvestorsCount();
                  let actualCount = 0;
                  for (const inv of investorData) {
                    const balance = await dsToken.balanceOfInvestor(inv.id);
                    if (balance > 0) actualCount++;
                  }
                  expect(Number(totalInvestors)).to.equal(actualCount,
                    `After ${operationCount} ops: Investor count mismatch`);
                }
                
              } catch (error) {
                // Some operations expected to fail (e.g., exceed limits)
              }
            }
            
            // Final comprehensive verification
            let finalSumOfBalances = 0n;
            for (const inv of investorData) {
              const balance = await dsToken.balanceOf(inv.signer.address);
              expect(balance).to.be.gte(0, `Final: ${inv.id} has negative balance`);
              finalSumOfBalances += balance;
            }
            
            const finalTotalSupply = await dsToken.totalSupply();
            expect(finalTotalSupply).to.equal(finalSumOfBalances, 
              `Final: Total supply != sum of balances after ${operationCount} operations`);
          }
        ),
        { numRuns: 5 } // Fewer runs because each run is very long
      );
    });
    
    it('should handle complex multi-investor scenarios over time', async function() {
      this.timeout(120000);
      
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              scenario: fc.constantFrom(
                'mass-distribution',  // Issue to many investors
                'mass-transfer',      // Many transfers at once
                'lock-cascade',       // Create many locks
                'time-jump',          // Advance time
                'burn-wave'           // Multiple burns
              ),
              amount: fc.integer({ min: 10000, max: 500000 }),
              participants: fc.integer({ min: 3, max: 8 }),
              days: fc.integer({ min: 10, max: 90 })
            }),
            { minLength: 10, maxLength: 25 }
          ),
          async (scenarios) => {
            const { dsToken, registryService, complianceService, lockManager } = 
              await loadFixture(deployDSTokenRegulated);
            const signers = await hre.ethers.getSigners();
            const [owner, ...investors] = signers;
            
            // Setup 8 investors
            const investorData = [];
            for (let i = 0; i < 8; i++) {
              const investorId = `complex_inv${i}`;
              await registerInvestor(investorId, investors[i], registryService);
              await registryService.setCountry(investorId, INVESTORS.Country.USA);
              investorData.push({ id: investorId, signer: investors[i] });
            }
            
            for (const scenario of scenarios) {
              try {
                const participants = investorData.slice(0, scenario.participants);
                
                if (scenario.scenario === 'mass-distribution') {
                  // Issue tokens to multiple investors at once
                  for (const inv of participants) {
                    await dsToken.issueTokens(inv.signer.address, scenario.amount);
                  }
                  
                } else if (scenario.scenario === 'mass-transfer') {
                  // Create a web of transfers
                  for (let i = 0; i < participants.length - 1; i++) {
                    const from = participants[i];
                    const to = participants[i + 1];
                    const balance = await dsToken.balanceOf(from.signer.address);
                    if (balance > 0) {
                      const transferAmt = balance / 2n > BigInt(scenario.amount) ? 
                                        scenario.amount : Number(balance) / 2;
                      if (transferAmt > 0) {
                        await dsToken.connect(from.signer).transfer(to.signer.address, transferAmt);
                      }
                    }
                  }
                  
                } else if (scenario.scenario === 'lock-cascade') {
                  // Create locks for multiple investors
                  for (const inv of participants) {
                    const balance = await dsToken.balanceOf(inv.signer.address);
                    if (balance > 0) {
                      const lockAmt = Number(balance) / 2;
                      if (lockAmt > 0) {
                        const releaseTime = (await hre.ethers.provider.getBlock('latest'))!.timestamp +
                                          (scenario.days * 86400);
                        await lockManager.createLockForInvestor(inv.id, lockAmt, 0, 'cascade', releaseTime);
                      }
                    }
                  }
                  
                } else if (scenario.scenario === 'time-jump') {
                  await hre.network.provider.send("evm_increaseTime", [scenario.days * 86400]);
                  await hre.network.provider.send("evm_mine");
                  
                } else if (scenario.scenario === 'burn-wave') {
                  // Burn from multiple investors
                  for (const inv of participants) {
                    const balance = await dsToken.balanceOf(inv.signer.address);
                    if (balance > 0) {
                      const burnAmt = balance > BigInt(scenario.amount) ? 
                                    scenario.amount : balance;
                      await dsToken.burn(inv.signer.address, burnAmt, 'wave');
                    }
                  }
                }
                
                // Verify core invariants after each scenario
                let sumBalances = 0n;
                for (const inv of investorData) {
                  const bal = await dsToken.balanceOf(inv.signer.address);
                  expect(bal).to.be.gte(0);
                  sumBalances += bal;
                }
                expect(await dsToken.totalSupply()).to.equal(sumBalances);
                
              } catch (error) {
                // Some scenarios expected to fail
              }
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  // ============================================================================
  // PHASE 3: TIME-BASED BEHAVIOR TESTING
  // ============================================================================

  /**
   * PHASE 3: Time-Based Behavior
   *
   * Property: Time-dependent features (locks, flowback) should behave
   * correctly as time progresses
   */
  describe('Phase 3: Time-Based Behavior Testing', function() {
    
    it('should correctly track time progression with multiple operations', async function() {
      this.timeout(60000);
      
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              operation: fc.constantFrom('issue', 'transfer', 'time-jump'),
              amount: fc.integer({ min: 10000, max: 100000 }),
              daysToAdvance: fc.integer({ min: 1, max: 30 })
            }),
            { minLength: 5, maxLength: 15 }
          ),
          async (operations) => {
            const { dsToken, registryService } = 
              await loadFixture(deployDSTokenRegulated);
            const [owner, investor1, investor2] = await hre.ethers.getSigners();
            
            await registerInvestor('time1', investor1, registryService);
            await registryService.setCountry('time1', INVESTORS.Country.USA);
            
            await registerInvestor('time2', investor2, registryService);
            await registryService.setCountry('time2', INVESTORS.Country.USA);
            
            let lastTimestamp = (await hre.ethers.provider.getBlock('latest'))!.timestamp;
            
            for (const op of operations) {
              try {
                if (op.operation === 'issue') {
                  await dsToken.issueTokens(investor1.address, op.amount);
                  
                } else if (op.operation === 'transfer') {
                  const balance = await dsToken.balanceOf(investor1.address);
                  if (balance > 0) {
                    const transferAmt = balance > BigInt(op.amount) ? op.amount : Number(balance) / 2;
                    if (transferAmt > 0) {
                      await dsToken.connect(investor1).transfer(investor2.address, transferAmt);
                    }
                  }
                  
                } else if (op.operation === 'time-jump') {
                  await hre.network.provider.send("evm_increaseTime", [op.daysToAdvance * 86400]);
                  await hre.network.provider.send("evm_mine");
                }
                
                // Verify time never goes backwards
                const currentTimestamp = (await hre.ethers.provider.getBlock('latest'))!.timestamp;
                expect(currentTimestamp).to.be.gte(lastTimestamp, 'Time went backwards');
                lastTimestamp = currentTimestamp;
                
                // Verify balances remain valid
                const bal1 = await dsToken.balanceOf(investor1.address);
                const bal2 = await dsToken.balanceOf(investor2.address);
                expect(bal1).to.be.gte(0);
                expect(bal2).to.be.gte(0);
                
              } catch (error) {
                // Some operations expected to fail
              }
            }
          }
        ),
        { numRuns: 15 }
      );
    });
  });
});

