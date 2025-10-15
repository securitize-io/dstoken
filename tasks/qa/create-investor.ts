import { task, types } from "hardhat/config";
import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";

// Contract addresses (auto-updated from deployment)
const CONTRACT_ADDRESSES = {
  regService: "0x193f890709A2005355460964fa31a3DF0c507802",
  trustService: "0x21c2A2D08bF7ad46137950bb5BfFd077DB7b8dC4",
  compConfigService: "0x61393fdA654F00D771822436e64091eCA64e4042",
  compService: "0xe0625E49720bC93Efe9927F9cC50B658d6708156",
  walletManager: "0x619Fec23873cc6850671EE405cB7f3480C1D6775",
  lockManager: "0x191B40369C87F2F664F945ce6dCe7fB4d28f2BC6",
  tokenIssuer: "0x7e9f4a2f4FF3C8438aD90b99cEC7d21E35a8ff0C",
  walletRegistrar: "0x456357A72DD81D7AA04AdA9cC5fff36E8fF36875",
  transactionRelayer: "0x906B6070d1C1070Cb5d8a12e51974CD38b885C31",
  bulkOperator: "0x5Bc0e6225d87Ea16A47B7Ae1d9EFF201C1003F2A",
  rebasingProvider: "0x7D17B28db440Dc6193b9a4a37C90289bD311588E",
  mockToken: "0x1928ee97f02Ac0197cD8901c4e61afb2101cE1dC",
  dsToken: "0xc1A5333f5668280506802fd7be291a9A60960B60"
};;

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
  .addOptionalParam('keysDir', 'Directory to save output files', './scripts', types.string)
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
            'fund-wallet': investor['fund-wallet'] || false,
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
      console.log('   1. Edit the output file to set fund-wallet: true and tokens: X as needed');
      console.log('   2. Use issue-tokens task to fund wallets and issue tokens:');
      console.log(`      npx hardhat issue-tokens ${outputFile.replace(process.cwd() + '/', '')}`);
    }
  });


// Export for use in other tasks (CONTRACT_ADDRESSES is internal only)
export { ATTRIBUTE_TYPES, ATTRIBUTE_STATUS };
