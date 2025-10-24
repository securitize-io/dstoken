import { task, types } from "hardhat/config";
import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";

// Contract addresses (auto-updated from deployment)
const CONTRACT_ADDRESSES = {
  regService: "0x472c1AbE5e54e56480f78C96bF05436B3ACF4606",
  trustService: "0xDC06cdD538F4E5A08F6009011EBa941d1d16e869",
  compConfigService: "0xAB6257058319aeF98E19680DDFfc748F7a387313",
  compService: "0x389629Fd1f3BDDC051d9458E0B043606928D24D1",
  walletManager: "0xb1916a151Ad7ecEA8c62b8aF5a2505b0EFC9A6C3",
  lockManager: "0x9B79cf4F3D56e87837B9434b09EdF5972e82eB4b",
  tokenIssuer: "0x263b1B606C40bdA91966F5723CB8D9DdF26eA6C6",
  walletRegistrar: "0x36dfD20EAD02ed688a6Bf9e8F73F21932D1C321b",
  transactionRelayer: "0xa05474C1Bfd5006dAC55384b6E1dFFB9413FfdCB",
  bulkOperator: "0xe3F0B5a7c70B006D41c06f3F3f8735B8Fc15e73f",
  rebasingProvider: "0x15eaaC206Dfe731664Ef1dE25bCD139b7C01D52d",
  mockToken: "0x42b2c2bc9d97de30bCe0f06327655C5988D9c982",
  dsToken: "0xbA5a5EFDf79F63B5cD413AC88daf7251B29cA5EB"
};;;;;;;;;;;;;;

// Interface for investor object
interface InvestorData {
  investorId: string;
  address: string;
  privateKey: string;
  mnemonic: string;
  "fund-wallet": boolean;
  tokens: number;
}

task('transfer-from-investors', 'Execute transferFrom between two investor wallets')
  .addParam('file', 'Path to JSON file with 2 investor objects')
  .addOptionalParam('tokenaddress', 'Token contract address (overrides default)', undefined, types.string)
  .addOptionalParam('spender', 'Spender address (if not specified, uses first signer)', undefined, types.string)
  .addOptionalParam('amount', 'Amount to transfer (if not specified, transfers 1 token)', '1', types.string)
  .addFlag('dryrun', 'Show what would be executed without sending transactions')
  .addFlag('noapproval', 'Skip approval checking entirely (for testing - transfers will fail if insufficient allowance)')
  .addFlag('forceonchain', 'Force transfer transactions on-chain even if expected to fail (for QA evidence)')
  .addOptionalParam('gaslimit', 'Gas limit for transactions', '1000000', types.string)
  .addOptionalParam('gasprice', 'Gas price in gwei', undefined, types.string)
  .addOptionalParam('outputDir', 'Directory to save output files', './qa/tasks', types.string)
  .setAction(async (args, hre) => {
    const { file, tokenaddress, spender, amount, dryrun, noapproval, forceonchain, gaslimit, gasprice, outputDir } = args;
    
    if (!fs.existsSync(file)) {
      console.error(`❌ Investor file not found: ${file}`);
      console.log('💡 Create the file with 2 investor objects: [fromInvestor, toInvestor]');
      console.log('Example usage:');
      console.log('  npx hardhat transfer-from-investors --file qa/tasks/config/transfer-from-investors.json --network sepolia');
      console.log('  npx hardhat transfer-from-investors --file qa/output/create-investor+timestamp.json --network sepolia');
      process.exit(1);
    }
    
    console.log(`📋 Loading investors from: ${file}`);
    
    // Load investor data
    let investorData: InvestorData[];
    try {
      investorData = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (error) {
      console.error(`❌ Error parsing JSON file: ${error}`);
      process.exit(1);
    }
    
    // Validate structure
    if (!Array.isArray(investorData) || investorData.length !== 2) {
      console.error('❌ Invalid config file format. Expected array with exactly 2 investor objects.');
      console.log('💡 Structure: [fromInvestor, toInvestor]');
      process.exit(1);
    }
    
    const [fromInvestor, toInvestor] = investorData;
    
    // Validate investor objects
    const requiredFields = ['investorId', 'address', 'privateKey', 'mnemonic', 'fund-wallet', 'tokens'];
    for (const investor of [fromInvestor, toInvestor]) {
      for (const field of requiredFields) {
        if (!(field in investor)) {
          console.error(`❌ Missing field '${field}' in investor object`);
          process.exit(1);
        }
      }
      
      if (!ethers.isAddress(investor.address)) {
        console.error(`❌ Invalid address: ${investor.address}`);
        process.exit(1);
      }
    }
    
    console.log(`🌐 Network: ${hre.network.name}`);
    console.log(`🔗 Chain ID: ${hre.network.config.chainId}`);
    console.log(`📤 From: ${fromInvestor.investorId} (${fromInvestor.address})`);
    console.log(`📥 To: ${toInvestor.investorId} (${toInvestor.address})`);
    console.log(`💰 Amount: ${amount} tokens`);
    
    // Auto-approval is always enabled since we have the private key
    const shouldAutoApprove = !noapproval;
    
    if (dryrun) {
      console.log('\n🔍 DRY RUN - No transactions will be executed\n');
    }
    
    if (noapproval) {
      console.log('\n⚠️  NO APPROVAL CHECKING - Transfer will fail if insufficient allowance!\n');
    } else {
      console.log('\n🔐 AUTO-APPROVAL ENABLED - Will approve transfer using from investor private key\n');
    }
    
    if (forceonchain) {
      console.log('\n🔗 FORCE ON-CHAIN ENABLED - Will capture transaction hash even for failed transfer\n');
    }
    
    // Get signers
    const signers = await hre.ethers.getSigners();
    if (signers.length === 0) {
      console.error('❌ No signers available');
      process.exit(1);
    }
    
    // Determine spender address
    let spenderAddress: string;
    let spenderSigner: ethers.Signer;
    
    if (spender) {
      spenderAddress = spender;
      const foundSigner = signers.find(s => s.address.toLowerCase() === spender.toLowerCase());
      if (!foundSigner) {
        console.error(`❌ Spender address ${spender} is not available as a signer`);
        process.exit(1);
      }
      spenderSigner = foundSigner;
    } else {
      spenderSigner = signers[0];
      spenderAddress = await spenderSigner.getAddress();
    }
    
    console.log(`👤 Using spender: ${spenderAddress}`);
    
    // Determine token contract address
    const finalTokenAddress = tokenaddress || CONTRACT_ADDRESSES.dsToken;
    
    if (tokenaddress) {
      console.log(`🪙 Token contract: ${finalTokenAddress} (from --tokenaddress parameter)`);
    } else {
      console.log(`🪙 Token contract: ${finalTokenAddress} (from task file - auto-updated)`);
    }
    
    // Load token contract
    const tokenContract = await hre.ethers.getContractAt("DSToken", finalTokenAddress, spenderSigner);
    
    // Get token info
    try {
      const [name, symbol, decimals] = await Promise.all([
        tokenContract.name(),
        tokenContract.symbol(),
        tokenContract.decimals()
      ]);
      console.log(`📝 Token: ${name} (${symbol}) - ${decimals} decimals`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`⚠️  Could not fetch token info: ${errorMessage}`);
    }
    
    // Track execution metadata
    const executionMetadata = {
      executedAt: new Date().toISOString(),
      network: hre.network.name,
      chainId: hre.network.config.chainId,
      spender: spenderAddress,
      tokenContract: finalTokenAddress,
      fromInvestor: {
        investorId: fromInvestor.investorId,
        address: fromInvestor.address
      },
      toInvestor: {
        investorId: toInvestor.investorId,
        address: toInvestor.address
      },
      transferAmount: amount,
      flags: {
        dryrun,
        noapproval,
        forceonchain
      },
      inputFile: file,
      gasSettings: {
        gasLimit: gaslimit,
        gasPrice: gasprice
      }
    };
    
    let success = false;
    let evidenceTransactions: any[] = [];
    
    // Generate timestamp for file naming
    const executionTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    console.log('\n🚀 Executing transfer between investors...');
    console.log('='.repeat(80));
    
    try {
      // Convert amount to wei (token has 6 decimals)
      const amountWei = ethers.parseUnits(amount, 6);
      console.log(`🔢 Amount (wei): ${amountWei.toString()}`);
      
      // Get balances and allowances
      const [fromBalance, allowance, toBalance] = await Promise.all([
        tokenContract.balanceOf(fromInvestor.address),
        tokenContract.allowance(fromInvestor.address, spenderAddress),
        tokenContract.balanceOf(toInvestor.address)
      ]);
      
      console.log(`💳 From balance: ${ethers.formatUnits(fromBalance, 6)} tokens`);
      console.log(`🔐 Allowance: ${ethers.formatUnits(allowance, 6)} tokens`);
      console.log(`💳 To balance: ${ethers.formatUnits(toBalance, 6)} tokens`);
      
      // Validate sufficient balance
      if (fromBalance < amountWei) {
        throw new Error(`Insufficient balance. Required: ${ethers.formatUnits(amountWei, 6)}, Available: ${ethers.formatUnits(fromBalance, 6)}`);
      }
      
      // Handle approval logic
      if (!noapproval) {
        if (allowance < amountWei) {
          if (shouldAutoApprove) {
            console.log(`🔐 Insufficient allowance. Auto-approving ${ethers.formatUnits(amountWei, 6)} tokens...`);
            
            if (dryrun) {
              console.log(`✅ [DRY RUN] Would approve ${ethers.formatUnits(amountWei, 6)} tokens using from investor private key`);
            } else {
              // Create signer from private key
              const fromSigner = new ethers.Wallet(fromInvestor.privateKey, hre.ethers.provider);
              
              // Verify the private key matches the from address
              if (fromSigner.address.toLowerCase() !== fromInvestor.address.toLowerCase()) {
                throw new Error(`Private key does not match from investor address. Expected: ${fromInvestor.address}, Got: ${fromSigner.address}`);
              }
              
              // Execute approval using the contract with the fromSigner
              const tokenContractWithFromSigner = await hre.ethers.getContractAt("DSToken", finalTokenAddress, fromSigner);
              const approveTx = await tokenContractWithFromSigner.approve(spenderAddress, amountWei, {
                gasLimit: parseInt(gaslimit),
                ...(gasprice && { gasPrice: ethers.parseUnits(gasprice, 'gwei') })
              });
              
              console.log(`⏳ Approval transaction submitted: ${approveTx.hash}`);
              const approveReceipt = await approveTx.wait();
              console.log(`✅ Approval confirmed in block ${approveReceipt.blockNumber}`);
              console.log(`⛽ Approval gas used: ${approveReceipt.gasUsed.toString()}`);
            }
          } else {
            throw new Error(`Insufficient allowance. Required: ${ethers.formatUnits(amountWei, 6)}, Available: ${ethers.formatUnits(allowance, 6)}. Remove --noapproval flag to enable auto-approval.`);
          }
        }
      } else {
        // No approval checking - show warning but continue
        if (allowance < amountWei) {
          console.log(`⚠️  WARNING: Insufficient allowance! Required: ${ethers.formatUnits(amountWei, 6)}, Available: ${ethers.formatUnits(allowance, 6)}`);
          console.log(`💥 This transfer will FAIL with "Not enough allowance" error!`);
        }
      }
      
      if (dryrun) {
        console.log(`✅ [DRY RUN] Would execute transferFrom`);
        success = true;
      } else {
        // Execute transferFrom
        await handleTransferExecution(
          tokenContract,
          fromInvestor.address,
          toInvestor.address,
          amountWei,
          spenderAddress,
          gaslimit,
          gasprice,
          forceonchain,
          noapproval,
          evidenceTransactions
        );
        
        success = true;
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error executing transfer:`, errorMessage);
      
      // Show specific error details
      if (errorMessage.includes("Not enough allowance")) {
        console.error(`💡 This is expected - the spender doesn't have allowance from the from investor`);
      } else if (errorMessage.includes("Insufficient balance")) {
        console.error(`💡 This is expected - the from investor doesn't have enough tokens`);
      } else if (errorMessage.includes("revert")) {
        console.error(`💡 Transaction reverted - check compliance rules or other restrictions`);
      } else if (errorMessage.includes("Private key does not match")) {
        console.error(`💡 Check that the private key matches the from investor address`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`📊 Summary: ${success ? 'SUCCESS' : 'FAILED'}`);
    
    if (dryrun) {
      console.log('\n💡 To execute for real, run without --dryrun flag');
    }
    
    if (!success) {
      console.log('\n⚠️  Transfer failed. Check the error message above.');
      if (noapproval) {
        console.log('💡 Use --noapproval flag to test what happens without approvals');
      }
    }
    
    // Show evidence transactions if any were captured
    if (evidenceTransactions.length > 0) {
      console.log('\n🧾 QA EVIDENCE TRANSACTIONS:');
      console.log('='.repeat(60));
      evidenceTransactions.forEach((tx, index) => {
        console.log(`${index + 1}. Transfer: ${tx.hash} (${tx.status})`);
        if (tx.error) {
          console.log(`   Error: ${tx.error}`);
        }
        if (tx.additionalInfo) {
          console.log(`   Info: ${tx.additionalInfo}`);
        }
      });
    }
    
    // Prepare comprehensive output data
    const outputData = {
      metadata: executionMetadata,
      summary: {
        success,
        transferAmount: amount
      },
      evidenceTransactions,
      transferDetails: {
        from: fromInvestor.investorId,
        fromAddress: fromInvestor.address,
        to: toInvestor.investorId,
        toAddress: toInvestor.address,
        amount: amount
      }
    };
    
    // Save comprehensive execution output
    console.log('\n📊 Saving execution output...');
    const outputFile = saveExecutionOutput(outputData, outputDir, executionTimestamp);
    console.log(`📁 Output saved to: ${outputFile}`);
    
    console.log('\n📖 For more information, see: qa/tasks/config/transfer-from-investors.md');
    console.log('📌 Note: --file parameter is required to specify which investor pair to use');
  });

// Function to handle transfer execution with force on-chain behavior
async function handleTransferExecution(
  tokenContract: any,
  fromAddress: string,
  toAddress: string,
  amountWei: bigint,
  spenderAddress: string,
  gaslimit: string,
  gasprice: string | undefined,
  forceOnChain: boolean,
  noapproval: boolean,
  evidenceTransactions: any[]
) {
  console.log(`🚀 Executing transferFrom...`);
  
  if (forceOnChain) {
    // FORCE ON-CHAIN MODE: Bypass gas estimation and force blockchain submission
    console.log(`🔗 Forcing on-chain execution (bypassing simulation)...`);
    
    try {
      let transferTx;
      
      try {
        // Try with manual gas settings to force submission
        const provider = tokenContract.runner.provider;
        const gasPrice = await provider.getFeeData();
        transferTx = await tokenContract.transferFrom(fromAddress, toAddress, amountWei, {
          gasLimit: parseInt(gaslimit),
          gasPrice: gasPrice.gasPrice,
        });
      } catch (estimationError: any) {
        // If gas estimation still fails, try with populateTransaction
        console.log(`🔄 Gas estimation failed, trying raw transaction...`);
        
        const populatedTx = await tokenContract.transferFrom.populateTransaction(fromAddress, toAddress, amountWei);
        const provider = tokenContract.runner.provider;
        const gasPrice = await provider.getFeeData();
        populatedTx.gasLimit = parseInt(gaslimit);
        populatedTx.gasPrice = gasPrice.gasPrice;
        
        // Send the raw transaction
        transferTx = await tokenContract.runner.sendTransaction(populatedTx);
      }
      
      console.log(`⏳ Transfer transaction submitted: ${transferTx.hash}`);
      
      // Store transaction info for QA evidence before waiting
      evidenceTransactions.push({
        hash: transferTx.hash,
        status: 'SUBMITTED',
        from: fromAddress,
        to: toAddress,
        amount: ethers.formatUnits(amountWei, 6)
      });
      console.log(`📝 Evidence captured: ${transferTx.hash}`);
      
      // Wait for transaction - this might fail if it reverts on-chain
      try {
        const receipt = await transferTx.wait();
        console.log(`✅ Transfer confirmed in block ${receipt.blockNumber}`);
        console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);
        
        // Update status if successful
        const txRecord = evidenceTransactions.find(tx => tx.hash === transferTx.hash);
        if (txRecord) txRecord.status = 'SUCCESS';
        
      } catch (waitError: any) {
        // Transaction was submitted but reverted on-chain
        const txRecord = evidenceTransactions.find(tx => tx.hash === transferTx.hash);
        if (txRecord) {
          txRecord.status = 'REVERTED_ON_CHAIN';
          txRecord.error = waitError.message;
        }
        console.log(`📝 Transfer reverted on-chain: ${transferTx.hash}`);
        console.error(`❌ Transfer reverted: ${waitError.message}`);
      }
      
    } catch (error: any) {
      console.error(`❌ Error executing transfer: ${error.message}`);
      
      // Try to capture transaction hash from different error properties
      let txHash = 'N/A';
      let additionalInfo = '';
      
      if (error.transaction?.hash) {
        txHash = error.transaction.hash;
      } else if (error.transactionHash) {
        txHash = error.transactionHash;
      } else if (error.receipt?.transactionHash) {
        txHash = error.receipt.transactionHash;
      } else if (error.code) {
        additionalInfo = `Code: ${error.code}`;
      }
      
      // For reverted transactions, try to get the transaction data
      if (txHash === 'N/A' && error.data) {
        additionalInfo += additionalInfo ? `, Data: ${error.data}` : `Data: ${error.data}`;
      }
      
      // Capture failed transaction hash for QA evidence
      evidenceTransactions.push({
        hash: txHash,
        status: 'FAILED_BEFORE_SUBMISSION',
        from: fromAddress,
        to: toAddress,
        amount: ethers.formatUnits(amountWei, 6),
        error: error.message,
        additionalInfo: additionalInfo || undefined
      });
      console.log(`📝 Evidence captured for failed transfer: ${txHash}${additionalInfo ? ` (${additionalInfo})` : ''}`);
    }
  } else {
    // NORMAL MODE: Standard behavior with gas estimation
    try {
      const tx = await tokenContract.transferFrom(fromAddress, toAddress, amountWei, {
        gasLimit: parseInt(gaslimit),
        ...(gasprice && { gasPrice: ethers.parseUnits(gasprice, 'gwei') })
      });
      
      console.log(`⏳ Transaction submitted: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`✅ Transfer confirmed in block ${receipt.blockNumber}`);
      console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);
      
    } catch (error: any) {
      // Handle transaction failures (especially for --noapproval testing)
      let txHash = null;
      
      // Try to extract transaction hash from different error formats
      if (error.transaction && error.transaction.hash) {
        txHash = error.transaction.hash;
      } else if (error.transactionHash) {
        txHash = error.transactionHash;
      } else if (error.receipt && error.receipt.transactionHash) {
        txHash = error.receipt.transactionHash;
      }
      
      if (txHash) {
        console.log(`⏳ Transaction submitted: ${txHash}`);
        console.log(`❌ Transaction FAILED (reverted) - this provides evidence of the failure`);
        console.log(`🔍 Revert reason: ${error.reason || error.message}`);
        
        // For --noapproval, this is expected behavior
        if (noapproval && (error.message.includes('allowance') || error.message.includes('Not enough allowance'))) {
          console.log(`💡 This failure is EXPECTED when using --noapproval flag`);
          console.log(`📋 Use this transaction hash as evidence: ${txHash}`);
        } else {
          throw error; // Re-throw unexpected errors
        }
      } else {
        console.log(`❌ Transaction failed to submit: ${error.message}`);
        
        // For --noapproval, this might still be expected
        if (noapproval && (error.message.includes('allowance') || error.message.includes('Not enough allowance'))) {
          console.log(`💡 This failure is EXPECTED when using --noapproval flag`);
        } else {
          throw error; // Re-throw unexpected errors
        }
      }
    }
  }
}

// Function to save comprehensive execution output
function saveExecutionOutput(
  outputData: any,
  outputDir: string,
  timestamp: string
) {
  const filename = `transfer-from-investors+${timestamp}.json`;
  const filepath = path.join(outputDir, 'output', filename);
  
  fs.writeFileSync(filepath, JSON.stringify(outputData, null, 2));
  console.log(`📊 Execution output saved to: ${filepath}`);
  return filepath;
}

// CONTRACT_ADDRESSES is internal only - not exported to avoid conflicts