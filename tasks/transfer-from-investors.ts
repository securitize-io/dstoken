import { task, types } from "hardhat/config";
import { ethers } from "ethers";
import * as fs from "fs";

// Contract addresses (auto-updated from deployment)
const CONTRACT_ADDRESSES = {
  regService: "0x7B78eEaF5560E885ab6633D170505610c0cd477e",
  trustService: "0x8cc022Cdd08ba8B5835E6DFf2a9fDC8F0338dE0d",
  compConfigService: "0x17a3a58a849Da2996191758e43C9adaa0b7405E9",
  dsToken: "0x9Bb0af14a1Ad355EB77efefd52b312B97edbaB75"
};

// Interface for transfer data
interface TransferData {
  from: string;        // Wallet address
  to: string;          // Wallet address
  amount: string;      // Amount in tokens
  description?: string;
}

interface TransferFile {
  transfers: TransferData[];
  network?: string;
  tokenAddress?: string;
}

task('transfer-from-investors', 'Execute transferFrom between wallet addresses')
  .addPositionalParam('file', 'Path to transfers JSON file', undefined, types.string)
  .addOptionalParam('tokenAddress', 'Token contract address (overrides file setting)', undefined, types.string)
  .addOptionalParam('spender', 'Spender address (if not specified, uses first signer)', undefined, types.string)
  .addFlag('dryrun', 'Show what would be executed without sending transactions')
  .addFlag('approve', 'Auto-approve transfers before executing (requires private keys)')
  .addFlag('noapproval', 'Execute transfers without checking approvals (will fail if insufficient allowance)')
  .addOptionalParam('gaslimit', 'Gas limit for transactions', '500000', types.string)
  .addOptionalParam('gasprice', 'Gas price in gwei', undefined, types.string)
  .setAction(async (args, hre) => {
    const { file, tokenAddress, spender, dryrun, approve, noapproval, gaslimit, gasprice } = args;
    
    // Validate transfer file exists
    if (!fs.existsSync(file)) {
      console.error(`❌ Transfer file not found: ${file}`);
      process.exit(1);
    }
    
    // Load transfer data
    const transferData: TransferFile = JSON.parse(fs.readFileSync(file, 'utf8'));
    
    if (!transferData.transfers || !Array.isArray(transferData.transfers)) {
      console.error('❌ Invalid transfer file format. Expected: { "transfers": [...] }');
      process.exit(1);
    }
    
    console.log(`📋 Found ${transferData.transfers.length} transfers to execute`);
    console.log(`🌐 Network: ${hre.network.name}`);
    console.log(`🔗 Chain ID: ${hre.network.config.chainId}`);
    console.log(`💡 Note: Using wallet addresses directly (not investor IDs)`);
    
    if (dryrun) {
      console.log('\n🔍 DRY RUN - No transactions will be executed\n');
    }
    
    if (noapproval) {
      console.log('\n⚠️  NO APPROVAL CHECKING - Transfers will fail if insufficient allowance!\n');
    }
    
    if (approve) {
      console.log('\n🔐 AUTO-APPROVAL ENABLED - Will attempt to approve transfers\n');
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
    const finalTokenAddress = tokenAddress || transferData.tokenAddress || CONTRACT_ADDRESSES.dsToken;
    console.log(`🪙 Token contract: ${finalTokenAddress}`);
    
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
    
    let successCount = 0;
    let failCount = 0;
    let totalTransferred = BigInt(0);
    
    console.log('\n🚀 Executing transfers between wallets...');
    console.log('='.repeat(80));
    
    for (let i = 0; i < transferData.transfers.length; i++) {
      const transfer = transferData.transfers[i];
      
      try {
        console.log(`\n📋 Transfer ${i + 1}/${transferData.transfers.length}`);
        if (transfer.description) {
          console.log(`   📝 Description: ${transfer.description}`);
        }
        
        // Validate wallet addresses
        if (!ethers.isAddress(transfer.from)) {
          throw new Error(`Invalid 'from' wallet address: ${transfer.from}`);
        }
        
        if (!ethers.isAddress(transfer.to)) {
          throw new Error(`Invalid 'to' wallet address: ${transfer.to}`);
        }
        
        console.log(`   📤 From Wallet: ${transfer.from}`);
        console.log(`   📥 To Wallet: ${transfer.to}`);
        console.log(`   💰 Amount: ${transfer.amount} tokens`);
        
        // Convert amount to wei
        const amountWei = ethers.parseUnits(transfer.amount, 18);
        console.log(`   🔢 Amount (wei): ${amountWei.toString()}`);
        
        // Get balances and allowances
        const [fromBalance, allowance, toBalance] = await Promise.all([
          tokenContract.balanceOf(transfer.from),
          tokenContract.allowance(transfer.from, spenderAddress),
          tokenContract.balanceOf(transfer.to)
        ]);
        
        console.log(`   💳 From balance: ${ethers.formatUnits(fromBalance, 18)} tokens`);
        console.log(`   🔐 Allowance: ${ethers.formatUnits(allowance, 18)} tokens`);
        console.log(`   💳 To balance: ${ethers.formatUnits(toBalance, 18)} tokens`);
        
        // Validate sufficient balance
        if (fromBalance < amountWei) {
          throw new Error(`Insufficient balance. Required: ${ethers.formatUnits(amountWei, 18)}, Available: ${ethers.formatUnits(fromBalance, 18)}`);
        }
        
        // Handle approval checking based on flags
        if (!noapproval) {
          if (allowance < amountWei) {
            if (approve && !dryrun) {
              console.log(`   🔐 Insufficient allowance. Attempting to approve ${ethers.formatUnits(amountWei, 18)} tokens...`);
              
              // Note: This would require the fromWallet to sign the approval
              // In a real scenario, you'd need the private key for fromWallet
              throw new Error(`Cannot auto-approve: Need private key for wallet ${transfer.from} to sign approval transaction`);
            } else if (approve && dryrun) {
              console.log(`   🔐 [DRY RUN] Would approve ${ethers.formatUnits(amountWei, 18)} tokens`);
            } else {
              throw new Error(`Insufficient allowance. Required: ${ethers.formatUnits(amountWei, 18)}, Available: ${ethers.formatUnits(allowance, 18)}. Use --approve flag to auto-approve (requires private keys).`);
            }
          }
        } else {
          // No approval checking - show warning but continue
          if (allowance < amountWei) {
            console.log(`   ⚠️  WARNING: Insufficient allowance! Required: ${ethers.formatUnits(amountWei, 18)}, Available: ${ethers.formatUnits(allowance, 18)}`);
            console.log(`   💥 This transfer will FAIL with "Not enough allowance" error!`);
          }
        }
        
        if (dryrun) {
          console.log(`   ✅ [DRY RUN] Would execute transferFrom`);
          successCount++;
          totalTransferred += amountWei;
        } else {
          // Execute transferFrom
          console.log(`   🚀 Executing transferFrom...`);
          
          const tx = await tokenContract.transferFrom(transfer.from, transfer.to, amountWei, {
            gasLimit: parseInt(gaslimit),
            ...(gasprice && { gasPrice: ethers.parseUnits(gasprice, 'gwei') })
          });
          
          console.log(`   ⏳ Transaction submitted: ${tx.hash}`);
          const receipt = await tx.wait();
          console.log(`   ✅ Transfer confirmed in block ${receipt.blockNumber}`);
          console.log(`   ⛽ Gas used: ${receipt.gasUsed.toString()}`);
          
          successCount++;
          totalTransferred += amountWei;
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`   ❌ Error executing transfer ${i + 1}:`, errorMessage);
        
        // Show specific error details
        if (errorMessage.includes("Not enough allowance")) {
          console.error(`   💡 This is expected - the spender doesn't have allowance from the 'from' address`);
        } else if (errorMessage.includes("Insufficient balance")) {
          console.error(`   💡 This is expected - the 'from' address doesn't have enough tokens`);
        } else if (errorMessage.includes("revert")) {
          console.error(`   💡 Transaction reverted - check compliance rules or other restrictions`);
        }
        
        failCount++;
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`📊 Summary: ${successCount} successful, ${failCount} failed`);
    console.log(`💰 Total transferred: ${ethers.formatUnits(totalTransferred, 18)} tokens`);
    
    if (dryrun) {
      console.log('\n💡 To execute for real, run without --dryrun flag');
    }
    
    if (failCount > 0) {
      console.log('\n⚠️  Some transfers failed. Check the error messages above.');
      if (noapproval) {
        console.log('💡 Use this task to test what happens without approvals');
      }
    }
    
    console.log('\n📖 For more information, see: scripts/transfers-guide.md');
  });

// Export for use in other tasks
export { CONTRACT_ADDRESSES };