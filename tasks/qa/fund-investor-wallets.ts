import { task, types } from "hardhat/config";
import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";

// Interface for wallet funding data
interface WalletData {
  address: string;
  amount?: string;  // Optional custom amount per wallet
  description?: string;
}

interface FundingFile {
  wallets: WalletData[];
  defaultAmount?: string;  // Default amount if not specified per wallet
  network?: string;
}

// Interface for transfer file (to extract addresses)
interface TransferData {
  from: string;
  fromPrivateKey?: string;
  to: string;
  amount: string;
  description?: string;
}

interface TransferFile {
  transfers: TransferData[];
}

// Interface for create-investor output
interface CreateInvestorOutput {
  metadata: any;
  generatedWallets: Array<{
    investorId: string;
    address: string;
    privateKey: string;
    'fund-wallet': boolean;
    tokens: number;
  }>;
}

task('fund-investor-wallets', 'Send ETH to investor wallets for gas')
  .addOptionalParam('file', 'Path to wallets JSON file (default: scripts/config/fund-investor-wallets.json)', 'scripts/config/fund-investor-wallets.json', types.string)
  .addOptionalParam('transfersfile', 'Path to transfers JSON file to extract addresses from', undefined, types.string)
  .addOptionalParam('createinvestorfile', 'Path to create-investor output file to extract addresses from', undefined, types.string)
  .addOptionalParam('addresses', 'Comma-separated wallet addresses to fund', undefined, types.string)
  .addOptionalParam('amount', 'Amount of ETH to send to each wallet (default: 0.001)', '0.001', types.string)
  .addOptionalParam('gaslimit', 'Gas limit for funding transactions', '21000', types.string)
  .addOptionalParam('gasprice', 'Gas price in gwei', undefined, types.string)
  .addOptionalParam('minbalance', 'Minimum balance threshold - skip funding if wallet has more ETH (default: 0.0005)', '0.0005', types.string)
  .addFlag('dryrun', 'Show what would be executed without sending transactions')
  .addFlag('force', 'Fund wallets even if they have sufficient balance')
  .addOptionalParam('outputDir', 'Directory to save output files', './scripts', types.string)
  .setAction(async (args, hre) => {
    const { file, transfersfile, createinvestorfile, addresses, amount, gaslimit, gasprice, minbalance, dryrun, force, outputDir } = args;
    
    console.log(`🌐 Network: ${hre.network.name}`);
    console.log(`🔗 Chain ID: ${hre.network.config.chainId}`);
    console.log(`💰 Fund amount: ${amount} ETH per wallet`);
    console.log(`⚖️  Minimum balance threshold: ${minbalance} ETH`);
    
    if (dryrun) {
      console.log('\n🔍 DRY RUN - No transactions will be executed\n');
    }
    
    if (force) {
      console.log('\n🔨 FORCE MODE - Will fund wallets regardless of current balance\n');
    }
    
    // Get signer (who will pay for the funding)
    const signers = await hre.ethers.getSigners();
    if (signers.length === 0) {
      console.error('❌ No signers available');
      process.exit(1);
    }
    
    const funderSigner = signers[0];
    const funderAddress = await funderSigner.getAddress();
    console.log(`👤 Funding from: ${funderAddress}`);
    
    // Check funder balance
    const funderBalance = await hre.ethers.provider.getBalance(funderAddress);
    console.log(`💳 Funder balance: ${ethers.formatEther(funderBalance)} ETH`);
    
    // Determine wallets to fund
    let walletsToFund: WalletData[] = [];
    
    if (addresses) {
      // From command line addresses
      const addressList = addresses.split(',').map(addr => addr.trim());
      walletsToFund = addressList.map(address => ({ address, amount }));
      console.log(`📋 Funding ${walletsToFund.length} addresses from command line`);
      
    } else if (createinvestorfile) {
      // From create-investor output file
      if (!fs.existsSync(createinvestorfile)) {
        console.error(`❌ Create-investor file not found: ${createinvestorfile}`);
        process.exit(1);
      }
      
      console.log(`📋 Loading addresses from create-investor output: ${createinvestorfile}`);
      const createInvestorData: CreateInvestorOutput = JSON.parse(fs.readFileSync(createinvestorfile, 'utf8'));
      
      if (!createInvestorData.generatedWallets || !Array.isArray(createInvestorData.generatedWallets)) {
        console.error('❌ Invalid create-investor file format. Expected: { "generatedWallets": [...] }');
        process.exit(1);
      }
      
      // Fund only wallets where fund-wallet is true
      walletsToFund = createInvestorData.generatedWallets
        .filter(wallet => wallet['fund-wallet'] === true)
        .map(wallet => ({
          address: wallet.address,
          amount,
          description: `Fund wallet for investor ${wallet.investorId} (${wallet.tokens} tokens)`
        }));
      
      console.log(`📋 Found ${walletsToFund.length} wallets marked for funding (fund-wallet: true)`);
      console.log(`📊 Total wallets in file: ${createInvestorData.generatedWallets.length}`);
      
    } else if (transfersfile) {
      // From transfers file
      if (!fs.existsSync(transfersfile)) {
        console.error(`❌ Transfers file not found: ${transfersfile}`);
        process.exit(1);
      }
      
      console.log(`📋 Loading addresses from transfers file: ${transfersfile}`);
      const transferData: TransferFile = JSON.parse(fs.readFileSync(transfersfile, 'utf8'));
      
      if (!transferData.transfers || !Array.isArray(transferData.transfers)) {
        console.error('❌ Invalid transfers file format. Expected: { "transfers": [...] }');
        process.exit(1);
      }
      
      // Fund all addresses (both from and to)
      const allAddresses = [
        ...transferData.transfers.map(t => ({ address: t.from, amount })),
        ...transferData.transfers.map(t => ({ address: t.to, amount }))
      ];
      walletsToFund = [...new Map(allAddresses.map(w => [w.address, w])).values()]; // Deduplicate
      console.log(`📋 Found ${walletsToFund.length} unique addresses from transfers`);
      
    } else if (fs.existsSync(file)) {
      // From dedicated wallets file
      console.log(`📋 Loading from wallets file: ${file}`);
      const fundingData: FundingFile = JSON.parse(fs.readFileSync(file, 'utf8'));
      
      if (!fundingData.wallets || !Array.isArray(fundingData.wallets)) {
        console.error('❌ Invalid wallets file format. Expected: { "wallets": [...] }');
        process.exit(1);
      }
      
      walletsToFund = fundingData.wallets.map(wallet => ({
        ...wallet,
        amount: wallet.amount || fundingData.defaultAmount || amount
      }));
      console.log(`💼 Found ${walletsToFund.length} wallets to fund`);
      
    } else {
      console.error(`❌ Default wallets file not found: ${file}`);
      console.log('Create the file or use one of these options:');
      console.log('  --addresses "0x123...,0x456..."   (fund specific addresses)');
      console.log('  --transfersfile scripts/config/transfer-from-investors.json   (extract from transfers file)');
      console.log('  --createinvestorfile scripts/output/create-investor+timestamp.json   (extract from create-investor output)');
      console.log('\nExample wallet file format:');
      console.log(JSON.stringify({
        "defaultAmount": "0.001",
        "wallets": [
          {
            "address": "0x232A04B625c8AEbbe39df8887DB113e426B1e621",
            "amount": "0.002",
            "description": "Accredited investor - needs more gas"
          }
        ]
      }, null, 2));
      process.exit(1);
    }
    
    if (walletsToFund.length === 0) {
      console.log('ℹ️  No wallets to fund');
      return;
    }
    
    // Validate addresses
    for (const wallet of walletsToFund) {
      if (!ethers.isAddress(wallet.address)) {
        console.error(`❌ Invalid address: ${wallet.address}`);
        process.exit(1);
      }
    }
    
    const fundAmount = ethers.parseEther(amount);
    const minBalanceThreshold = ethers.parseEther(minbalance);
    
    // Estimate total cost
    const totalFundingCost = BigInt(walletsToFund.length) * fundAmount;
    const estimatedGasCost = BigInt(walletsToFund.length) * BigInt(gaslimit) * (gasprice ? ethers.parseUnits(gasprice, 'gwei') : ethers.parseUnits('2', 'gwei'));
    const totalEstimatedCost = totalFundingCost + estimatedGasCost;
    
    console.log(`\n💸 Estimated costs:`);
    console.log(`   Funding: ${ethers.formatEther(totalFundingCost)} ETH`);
    console.log(`   Gas: ~${ethers.formatEther(estimatedGasCost)} ETH`);
    console.log(`   Total: ~${ethers.formatEther(totalEstimatedCost)} ETH`);
    
    if (funderBalance < totalEstimatedCost) {
      console.error(`❌ Insufficient balance. Need ~${ethers.formatEther(totalEstimatedCost)} ETH, have ${ethers.formatEther(funderBalance)} ETH`);
      process.exit(1);
    }
    
    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;
    let totalFunded = BigInt(0);
    
    // Generate timestamp for consistent file naming
    const executionTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Track execution metadata
    const executionMetadata = {
      executedAt: new Date().toISOString(),
      network: hre.network.name,
      chainId: hre.network.config.chainId,
      funder: funderAddress,
      funderBalance: ethers.formatEther(funderBalance),
      flags: {
        dryrun,
        force
      },
      inputSources: {
        file: addresses ? null : (createinvestorfile || transfersfile || file),
        addresses: addresses ? addresses.split(',').map(addr => addr.trim()) : null,
        transfersfile: transfersfile || null,
        createinvestorfile: createinvestorfile || null
      },
      fundingSettings: {
        amount,
        minbalance,
        gaslimit,
        gasprice
      }
    };
    
    console.log('\n💰 Funding wallets...');
    console.log('='.repeat(80));
    
    for (let i = 0; i < walletsToFund.length; i++) {
      const wallet = walletsToFund[i];
      
      try {
        console.log(`\n💳 Wallet ${i + 1}/${walletsToFund.length}: ${wallet.address}`);
        if (wallet.description) {
          console.log(`   📝 Description: ${wallet.description}`);
        }
        
        const walletFundAmount = ethers.parseEther(wallet.amount || amount);
        console.log(`   💰 Fund amount: ${wallet.amount || amount} ETH`);
        
        // Check current balance
        const currentBalance = await hre.ethers.provider.getBalance(wallet.address);
        console.log(`   💳 Current balance: ${ethers.formatEther(currentBalance)} ETH`);
        
        // Skip if balance is sufficient (unless force flag is used)
        if (!force && currentBalance >= minBalanceThreshold) {
          console.log(`   ⏭️  Skipping - balance (${ethers.formatEther(currentBalance)} ETH) >= threshold (${minbalance} ETH)`);
          skipCount++;
          continue;
        }
        
        if (dryrun) {
          console.log(`   ✅ [DRY RUN] Would send ${wallet.amount || amount} ETH`);
          successCount++;
          totalFunded += walletFundAmount;
        } else {
          // Send ETH
          console.log(`   🚀 Sending ${wallet.amount || amount} ETH...`);
          
          const fundTx = await funderSigner.sendTransaction({
            to: wallet.address,
            value: walletFundAmount,
            gasLimit: parseInt(gaslimit),
            ...(gasprice && { gasPrice: ethers.parseUnits(gasprice, 'gwei') })
          });
          
          console.log(`   ⏳ Transaction submitted: ${fundTx.hash}`);
          const receipt = await fundTx.wait();
          console.log(`   ✅ Funding confirmed in block ${receipt.blockNumber}`);
          console.log(`   ⛽ Gas used: ${receipt.gasUsed.toString()}`);
          
          // Show new balance
          const newBalance = await hre.ethers.provider.getBalance(wallet.address);
          console.log(`   💰 New balance: ${ethers.formatEther(newBalance)} ETH`);
          
          successCount++;
          totalFunded += walletFundAmount;
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`   ❌ Error funding ${wallet.address}:`, errorMessage);
        failCount++;
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`📊 Summary: ${successCount} funded, ${skipCount} skipped, ${failCount} failed`);
    console.log(`💰 Total funded: ${ethers.formatEther(totalFunded)} ETH`);
    
    if (dryrun) {
      console.log('\n💡 To execute for real, run without --dryrun flag');
    }
    
    if (skipCount > 0) {
      console.log(`ℹ️  ${skipCount} wallets skipped (sufficient balance). Use --force to fund anyway.`);
    }
    
    if (failCount > 0) {
      console.log('\n⚠️  Some funding operations failed. Check the error messages above.');
    }
    
    // Prepare comprehensive output data
    const outputData = {
      metadata: executionMetadata,
      summary: {
        totalProcessed: walletsToFund.length,
        successCount,
        skipCount,
        failCount,
        totalFunded: ethers.formatEther(totalFunded)
      },
      fundingDetails: walletsToFund.map((wallet, index) => ({
        walletNumber: index + 1,
        address: wallet.address,
        fundAmount: wallet.amount || amount,
        description: wallet.description || null
      }))
    };
    
    // Save comprehensive execution output
    console.log('\n📊 Saving execution output...');
    const outputFile = saveExecutionOutput(outputData, outputDir, executionTimestamp);
    console.log(`   📁 Output saved to: ${outputFile}`);
    
    console.log('\n📖 For more information, see the task help: npx hardhat help fund-investor-wallets');
  });

// Function to save comprehensive execution output
function saveExecutionOutput(
  outputData: any,
  outputDir: string,
  timestamp: string
) {
  const filename = `fund-investor-wallets+${timestamp}.json`;
  const filepath = path.join(outputDir, 'output', filename);
  
  fs.writeFileSync(filepath, JSON.stringify(outputData, null, 2));
  console.log(`📊 Execution output saved to: ${filepath}`);
  return filepath;
}
