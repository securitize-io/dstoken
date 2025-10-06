import { task, types } from "hardhat/config";
import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";

// Contract addresses (auto-updated from deployment)
const CONTRACT_ADDRESSES = {
  regService: "0x7B78eEaF5560E885ab6633D170505610c0cd477e",
  trustService: "0x8cc022Cdd08ba8B5835E6DFf2a9fDC8F0338dE0d",
  compConfigService: "0x17a3a58a849Da2996191758e43C9adaa0b7405E9",
  dsToken: "0x9Bb0af14a1Ad355EB77efefd52b312B97edbaB75"
};

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

// Function to save private keys to a secure file
function savePrivateKeys(privateKeys: any[], outputDir: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `private-keys-${timestamp}.json`;
  const filepath = path.join(outputDir, filename);
  
  const keyData = {
    generatedAt: new Date().toISOString(),
    network: "arbitrum",
    warning: "KEEP THIS FILE SECURE - Contains private keys!",
    keys: privateKeys
  };
  
  fs.writeFileSync(filepath, JSON.stringify(keyData, null, 2));
  console.log(`🔐 Private keys saved to: ${filepath}`);
  return filepath;
}

// Add these functions to generate shorter unique IDs
function generateUniqueId(baseId: string): string {
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0'); // 6-digit random number
  return `${baseId}_${random}`;
}

function generateUniqueCollisionHash(baseHash: string): string {
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0'); // 6-digit random number
  return `${baseHash}_${random}`;
}

task('create-investor', 'Create investors from JSON file with auto wallet generation')
  .addPositionalParam('file', 'Path to investors JSON file', undefined, types.string)
  .addFlag('dryrun', 'Show what would be created without executing')
  .addFlag('generatewallets', 'Generate new wallets for empty wallet arrays')
  .addFlag('generateuniqueids', 'Generate unique IDs for investors with duplicate IDs')
  .addOptionalParam('keysDir', 'Directory to save private keys', './scripts', types.string)
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
    
    console.log('\n📝 Contract addresses:');
    console.log(`   Registry Service: ${CONTRACT_ADDRESSES.regService}`);
    console.log(`   Trust Service: ${CONTRACT_ADDRESSES.trustService}`);
    console.log(`   Compliance Config: ${CONTRACT_ADDRESSES.compConfigService}`);
    
    let successCount = 0;
    let failCount = 0;
    let generatedWallets: any[] = [];
    
    // Track used IDs to detect duplicates
    const usedIds = new Set<string>();
    const idMapping = new Map<string, string>(); // original -> unique mapping
    
    console.log('\n🚀 Creating investors...');
    console.log('='.repeat(60));
    
    for (const investor of investorData.investors) {
      try {
        // Generate unique ID if needed
        let finalId = investor.id;
        let finalCollisionHash = investor.collisionHash;
        
        if (generateuniqueids) {
          // Always generate unique ID when flag is enabled
          finalId = generateUniqueId(investor.id);
          finalCollisionHash = generateUniqueCollisionHash(investor.collisionHash);
          idMapping.set(investor.id, finalId);
          console.log(`\n📋 Processing investor: ${finalId} (original: ${investor.id})`);
          console.log(`   🔄 Generated unique ID (flag enabled)`);
        } else if (usedIds.has(investor.id)) {
          // Only generate if duplicate detected and flag not enabled
          finalId = generateUniqueId(investor.id);
          finalCollisionHash = generateUniqueCollisionHash(investor.collisionHash);
          idMapping.set(investor.id, finalId);
          console.log(`\n📋 Processing investor: ${finalId} (original: ${investor.id})`);
          console.log(`   🔄 Generated unique ID due to duplicate`);
        } else {
          console.log(`\n📋 Processing investor: ${finalId}`);
        }
        
        // Track this ID
        usedIds.add(finalId);
        
        // Check if wallets array is empty and generate wallets if needed
        let wallets = investor.wallets || [];
        if (wallets.length === 0 && generatewallets) {
          console.log(`   🔑 No wallets provided - generating new wallet...`);
          const newWallet = generateWallet();
          wallets = [newWallet.address];
          
          // Store wallet info for private key file (use final ID)
          generatedWallets.push({
            investorId: finalId,
            address: newWallet.address,
            privateKey: newWallet.privateKey,
            mnemonic: newWallet.mnemonic
          });
          
          console.log(`   ✅ Generated wallet: ${newWallet.address}`);
        }
        
        // Validate required fields (use original fields for validation)
        if (!investor.id || !investor.collisionHash || !investor.country) {
          throw new Error("Missing required fields: id, collisionHash, country");
        }
        
        if (wallets.length === 0) {
          throw new Error("No wallet addresses provided and wallet generation is disabled");
        }
        
        // Validate array lengths match
        const { attributeIds, attributeValues, attributeExpirations } = investor;
        if (attributeIds && attributeValues && attributeExpirations) {
          if (attributeIds.length !== attributeValues.length || 
              attributeValues.length !== attributeExpirations.length) {
            throw new Error("attributeIds, attributeValues, and attributeExpirations arrays must have the same length");
          }
        }
        
        console.log(`   📍 Country: ${investor.country}`);
        console.log(`   💼 Wallets: ${wallets.length}`);
        console.log(`   🏷️  Attributes: ${investor.attributeIds?.length || 0}`);
        
        if (dryrun) {
          console.log(`   ✅ [DRY RUN] Would create investor ${finalId}`);
          successCount++;
        } else {
          // Execute the updateInvestor function with final IDs
          const tx = await regService.updateInvestor(
            finalId,                    // Use the final (possibly unique) ID
            finalCollisionHash,         // Use the final (possibly unique) collision hash
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
        console.error(`   ❌ Error creating investor ${finalId}:`, error.message);
        failCount++;
      }
    }
    
    // Save private keys if any were generated
    if (generatedWallets.length > 0) {
      console.log('\n🔐 Saving private keys...');
      const keysFile = savePrivateKeys(generatedWallets, keysDir);
      console.log(`   📁 Keys saved to: ${keysFile}`);
      console.log('   ⚠️  IMPORTANT: Keep this file secure and never commit it to version control!');
    }
    
    // Show ID mapping if unique IDs were generated
    if (idMapping.size > 0) {
      console.log('\n🆔 ID MAPPING (Original -> Unique):');
      console.log('='.repeat(50));
      for (const [original, unique] of idMapping) {
        console.log(`   ${original} -> ${unique}`);
      }
      console.log('\n💡 Use the unique IDs in your transfer tasks!');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`📊 Summary: ${successCount} successful, ${failCount} failed`);
    
    if (generatedWallets.length > 0) {
      console.log(`🔑 Generated ${generatedWallets.length} new wallets`);
    }
    
    if (idMapping.size > 0) {
      console.log(`🆔 Generated ${idMapping.size} unique IDs`);
    }
    
    if (dryrun) {
      console.log('\n💡 To execute for real, run without --dryrun flag');
    }
  });

// Export for use in other tasks
export { CONTRACT_ADDRESSES, ATTRIBUTE_TYPES, ATTRIBUTE_STATUS };