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

// Attribute type constants
const ATTRIBUTE_TYPES = {
  KYC_APPROVED: 1,
  ACCREDITED: 2, 
  QUALIFIED: 4,
  PROFESSIONAL: 8
};

const ATTRIBUTE_STATUS = {
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2
};

// Function to generate a new wallet
function generateWallet() {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    mnemonic: wallet.mnemonic?.phrase
  };
}

// Function to generate unique ID with 6-digit random suffix
function generateUniqueId(originalId: string): string {
  const randomSuffix = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `${originalId}${randomSuffix}`;
}

// Function to generate unique collision hash with 6-digit random suffix
function generateUniqueCollisionHash(originalHash: string): string {
  const randomSuffix = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `${originalHash}${randomSuffix}`;
}

// Function to save comprehensive execution output (including private keys)
function saveExecutionOutput(
  outputData: any,
  outputDir: string,
  timestamp: string
) {
  const filename = `create-investor+${timestamp}.json`;
  const filepath = path.join(outputDir, 'output', filename);
  
  fs.writeFileSync(filepath, JSON.stringify(outputData, null, 2));
  console.log(`📊 Execution output saved to: ${filepath}`);
  return filepath;
}

task('create-investor', 'Create investors from JSON file with auto wallet generation')
  .addPositionalParam('file', 'Path to investors JSON file', undefined, types.string)
  .addFlag('dryrun', 'Show what would be created without executing')
  .addFlag('generatewallets', 'Generate new wallets for empty wallet arrays')
  .addFlag('generateuniqueids', 'Generate unique IDs for all investors (not just duplicates)')
  .addOptionalParam('keysDir', 'Directory to save output files', './qa/tasks', types.string)
  .setAction(async (args, hre) => {
    const { file, dryrun, generatewallets, generateuniqueids, keysDir } = args;
    
    // Validate file exists
    if (!fs.existsSync(file)) {
      console.error(`❌ File not found: ${file}`);
      process.exit(1);
    }
    
    // Load investor data
    const investorData = JSON.parse(fs.readFileSync(file, 'utf8'));
    
    if (!investorData.investors || !Array.isArray(investorData.investors)) {
      console.error('❌ Invalid JSON format. Expected: { "investors": [...] }');
      process.exit(1);
    }
    
    console.log(`📋 Found ${investorData.investors.length} investors to create`);
    console.log(`🌐 Network: ${hre.network.name}`);
    console.log(`🔗 Chain ID: ${hre.network.config.chainId}`);
    
    if (dryrun) {
      console.log('\n🔍 DRY RUN - No transactions will be executed\n');
    }
    
    if (generatewallets) {
      console.log('\n🔑 WALLET GENERATION ENABLED - Will create wallets for empty arrays\n');
    }
    
    if (generateuniqueids) {
      console.log('\n🆔 UNIQUE ID GENERATION ENABLED - Will generate unique IDs for ALL investors\n');
    }
    
    const [signer] = await hre.ethers.getSigners();
    console.log(`👤 Using signer: ${await signer.getAddress()}`);
    
    // Load contracts with deployed addresses
    const regService = await hre.ethers.getContractAt("IDSRegistryService", CONTRACT_ADDRESSES.regService, signer);
    const trustService = await hre.ethers.getContractAt("IDSTrustService", CONTRACT_ADDRESSES.trustService, signer);
    const compConfigService = await hre.ethers.getContractAt("IDSComplianceConfigurationService", CONTRACT_ADDRESSES.compConfigService, signer);
    const dsToken = await hre.ethers.getContractAt("DSToken", CONTRACT_ADDRESSES.dsToken, signer);
    
    console.log('\n📝 Contract addresses:');
    console.log(`   Registry Service: ${CONTRACT_ADDRESSES.regService}`);
    console.log(`   Trust Service: ${CONTRACT_ADDRESSES.trustService}`);
    console.log(`   Compliance Config: ${CONTRACT_ADDRESSES.compConfigService}`);
    console.log(`   DS Token: ${CONTRACT_ADDRESSES.dsToken}`);
    
    let successCount = 0;
    let failCount = 0;
    let generatedWallets: any[] = [];
    
    // Track used IDs and ID mappings for unique ID generation
    const usedIds = new Set<string>();
    const idMappings: Array<{original: string, generated: string}> = [];
    
    // Generate timestamp for consistent file naming
    const executionTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Track execution metadata
    const executionMetadata = {
      executedAt: new Date().toISOString(),
      network: hre.network.name,
      chainId: hre.network.config.chainId,
      signer: await signer.getAddress(),
      contractAddresses: CONTRACT_ADDRESSES,
      flags: {
        dryrun,
        generatewallets,
        generateuniqueids
      },
      inputFile: file
    };
    
    console.log('\n🚀 Creating investors...');
    console.log('='.repeat(60));
    
    for (const investor of investorData.investors) {
      // Handle unique ID generation (declare outside try-catch for error handling)
      let finalId = investor.id;
      let finalCollisionHash = investor.collisionHash;
      
      try {
        
        if (generateuniqueids) {
          // Always generate unique ID when flag is enabled
          finalId = generateUniqueId(investor.id);
          finalCollisionHash = generateUniqueCollisionHash(investor.collisionHash);
          idMappings.push({original: investor.id, generated: finalId});
          console.log(`\n📋 Processing investor: ${finalId} (original: ${investor.id})`);
          console.log(`   🔄 Generated unique ID (flag enabled)`);
        } else if (usedIds.has(investor.id)) {
          // Only generate if duplicate detected and flag not enabled
          finalId = generateUniqueId(investor.id);
          finalCollisionHash = generateUniqueCollisionHash(investor.collisionHash);
          idMappings.push({original: investor.id, generated: finalId});
          console.log(`\n📋 Processing investor: ${finalId} (original: ${investor.id})`);
          console.log(`   🔄 Generated unique ID due to duplicate`);
        } else {
          console.log(`\n📋 Processing investor: ${finalId}`);
        }
        usedIds.add(finalId);
        
        // Check if wallets array is empty and generate wallets if needed
        let wallets = investor.wallets || [];
        if (wallets.length === 0 && generatewallets) {
          console.log(`   🔑 No wallets provided - generating new wallet...`);
          const newWallet = generateWallet();
          wallets = [newWallet.address];
          
          // Store wallet info for private key file
          generatedWallets.push({
            investorId: finalId,
            address: newWallet.address,
            privateKey: newWallet.privateKey,
            mnemonic: newWallet.mnemonic,
            tokens: 0
          });
          
          console.log(`   ✅ Generated wallet: ${newWallet.address}`);
        }
        
        // Validate required fields
        if (!investor.id || !investor.collisionHash || !investor.country) {
          throw new Error("Missing required fields: id, collisionHash, country");
        }
        
        // Allow investors without wallets when generatewallets is disabled
        // This enables creating investor records first, then adding wallets/tokens later
        
        // Validate array lengths match
        const { attributeIds, attributeValues, attributeExpirations } = investor;
        if (attributeIds && attributeValues && attributeExpirations) {
          if (attributeIds.length !== attributeValues.length || 
              attributeValues.length !== attributeExpirations.length) {
            throw new Error("attributeIds, attributeValues, and attributeExpirations arrays must have the same length");
          }
        }
        
        console.log(`   📍 Country: ${investor.country}`);
        console.log(`   💼 Wallets: ${wallets.length}${wallets.length === 0 ? ' (no wallets - can be added later)' : ''}`);
        console.log(`   🏷️  Attributes: ${investor.attributeIds?.length || 0}`);
        
        if (dryrun) {
          console.log(`   ✅ [DRY RUN] Would create investor ${finalId}`);
          successCount++;
        } else {
          // Execute the updateInvestor function
          const tx = await regService.updateInvestor(
            finalId,
            finalCollisionHash,
            investor.country,
            wallets,
            investor.attributeIds || [],
            investor.attributeValues || [],
            investor.attributeExpirations || []
          );
          
          console.log(`   ⏳ Transaction submitted: ${tx.hash}`);
          await tx.wait();
          console.log(`   ✅ Investor ${finalId} created successfully!`);
          
          successCount++;
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`   ❌ Error creating investor ${finalId}:`, errorMessage);
        failCount++;
      }
    }
    
    // Prepare comprehensive output data
    const outputData = {
      metadata: executionMetadata,
      summary: {
        totalProcessed: investorData.investors.length,
        successCount,
        failCount,
        generatedWalletsCount: generatedWallets.length
      },
      idMappings: idMappings,
      generatedWallets: generatedWallets.length > 0 ? generatedWallets : []
    };
    
    // Save comprehensive execution output
    console.log('\n📊 Saving execution output...');
    const outputFile = saveExecutionOutput(outputData, keysDir, executionTimestamp);
    console.log(`   📁 Output saved to: ${outputFile}`);
    
    if (generatedWallets.length > 0) {
      console.log('   ⚠️  IMPORTANT: This file contains private keys - keep it secure and never commit it to version control!');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`📊 Summary: ${successCount} successful, ${failCount} failed`);
    
    if (generatedWallets.length > 0) {
      console.log(`🔑 Generated ${generatedWallets.length} new wallets`);
    }
    
    if (dryrun) {
      console.log('\n💡 To execute for real, run without --dryrun flag');
    }
    
    if (generatedWallets.length > 0) {
      console.log('\n💡 Next steps:');
      console.log('   1. Edit the output file to set tokens: X as needed for each investor');
      console.log('   2. Use issue-tokens task to issue tokens:');
      console.log(`      npx hardhat issue-tokens ${outputFile.replace(process.cwd() + '/', '')}`);
    }
  });


// Export for use in other tasks (CONTRACT_ADDRESSES is internal only)
export { ATTRIBUTE_TYPES, ATTRIBUTE_STATUS };
