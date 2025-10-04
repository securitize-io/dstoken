import { task, types } from "hardhat/config";
import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import { randomBytes } from "crypto";

// Contract addresses (auto-updated from deployment)
const CONTRACT_ADDRESSES = {
  regService: "0xa1efAf2BF27881f5F6e9005B46A53ca979C7bC37",
  trustService: "0x46f96fb48baE945Ee95Feb5F4dc4B2fB9dd7079A",
  compConfigService: "0x5EFae3f89f57c28Ccbf19366d161D44630D91873",
  dsToken: "0x983C179e1ABA7cE0f974b7165Caa05967577DF5A"
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

// Helper function to generate random strings
function generateRandomString(length: number = 6): string {
  return randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

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

task('create-investor', 'Create investors from JSON file with auto-generated random IDs and collision hashes')
  .addPositionalParam('file', 'Path to investors JSON file', undefined, types.string)
  .addFlag('dryrun', 'Show what would be created without executing')
  .addFlag('generateWallets', 'Generate new wallets for empty wallet arrays')
  .addOptionalParam('keysDir', 'Directory to save private keys', './scripts', types.string)
  .addOptionalParam('randomLength', 'Length of random string to append to IDs and collision hashes', 6, types.int)
  .setAction(async (args, hre) => {
    const { file, dryrun, generateWallets, keysDir, randomLength } = args;
    
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
    
    // Process investors and add random strings to both ID and collisionHash
    const processedInvestors = investorData.investors.map((investor: any, index: number) => {
      const originalId = investor.id;
      const originalHash = investor.collisionHash;
      const randomSuffix = generateRandomString(randomLength);
      
      const newId = `${originalId}_${randomSuffix}`;
      const newHash = `${originalHash}_${randomSuffix}`;
      
      console.log(`   🎲 ID: ${originalId} → ${newId}`);
      console.log(`   🔗 Hash: ${originalHash} → ${newHash}`);
      
      return {
        ...investor,
        id: newId,
        collisionHash: newHash
      };
    });
    
    console.log(`📋 Found ${processedInvestors.length} investors to create`);
    console.log(`🎲 Random string length: ${randomLength} characters`);
    console.log(`🌐 Network: ${hre.network.name}`);
    console.log(`🔗 Chain ID: ${hre.network.config.chainId}`);
    
    if (dryrun) {
      console.log('\n🔍 DRY RUN - No transactions will be executed\n');
    }
    
    if (generateWallets) {
      console.log('\n🔑 WALLET GENERATION ENABLED - Will create wallets for empty arrays\n');
    }
    
    const [signer] = await hre.ethers.getSigners();
    console.log(`👤 Using signer: ${await signer.getAddress()}`);
    
    // Load contracts with deployed addresses
    const regService = await hre.ethers.getContractAt("IDSRegistryService", CONTRACT_ADDRESSES.regService, signer);
    const trustService = await hre.ethers.getContractAt("IDSTrustService", CONTRACT_ADDRESSES.trustService, signer);
    const compConfigService = await hre.ethers.getContractAt("IDSComplianceConfigurationService", CONTRACT_ADDRESSES.compConfigService, signer);
    const dsToken = await hre.ethers.getContractAt("IDSToken", CONTRACT_ADDRESSES.dsToken, signer);
    
    console.log('\n📝 Contract addresses:');
    console.log(`   Registry Service: ${CONTRACT_ADDRESSES.regService}`);
    console.log(`   Trust Service: ${CONTRACT_ADDRESSES.trustService}`);
    console.log(`   Compliance Config: ${CONTRACT_ADDRESSES.compConfigService}`);
    console.log(`   DSToken: ${CONTRACT_ADDRESSES.dsToken}`);
    
    let successCount = 0;
    let failCount = 0;
    let generatedWallets: any[] = [];
    
    console.log('\n🚀 Creating investors...');
    console.log('='.repeat(60));
    
    for (const investor of processedInvestors) {
      try {
        console.log(`\n📋 Processing investor: ${investor.id}`);
        
        // Check if wallets array is empty and generate wallets if needed
        let wallets = investor.wallets || [];
        if (wallets.length === 0 && generateWallets) {
          console.log(`   🔑 No wallets provided - generating new wallet...`);
          const newWallet = generateWallet();
          wallets = [newWallet.address];
          
          // Store wallet info for private key file
          generatedWallets.push({
            investorId: investor.id,
            address: newWallet.address,
            privateKey: newWallet.privateKey,
            mnemonic: newWallet.mnemonic
          });
          
          console.log(`   ✅ Generated wallet: ${newWallet.address}`);
        }
        
        // Validate required fields
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
        console.log(`   🪙  Tokens: ${investor.tokens || 0}`);
        
        if (dryrun) {
          console.log(`   ✅ [DRY RUN] Would create investor ${investor.id}`);
          if (investor.tokens && investor.tokens > 0) {
            console.log(`   🪙 [DRY RUN] Would issue ${investor.tokens} tokens to ${wallets[0]}`);
          }
          successCount++;
        } else {
          // Execute the updateInvestor function
          const tx = await regService.updateInvestor(
            investor.id,
            investor.collisionHash,
            investor.country,
            wallets,
            investor.attributeIds || [],
            investor.attributeValues || [],
            investor.attributeExpirations || []
          );
          
          console.log(`   ⏳ Transaction submitted: ${tx.hash}`);
          await tx.wait();
          console.log(`   ✅ Investor ${investor.id} created successfully!`);
          
          // Issue tokens if specified
          if (investor.tokens && investor.tokens > 0) {
            console.log(`   🪙 Issuing ${investor.tokens} tokens to ${wallets[0]}...`);
            
            // Verify the wallet exists and is associated with the investor
            const isWalletRegistered = await regService.isWallet(wallets[0]);
            if (!isWalletRegistered) {
              throw new Error(`Wallet ${wallets[0]} is not registered`);
            }
            
            const walletInvestorId = await regService.getInvestor(wallets[0]);
            if (walletInvestorId !== investor.id) {
              throw new Error(`Wallet ${wallets[0]} is associated with investor ${walletInvestorId}, expected ${investor.id}`);
            }
            
            // Issue tokens to the wallet
            const issuanceTx = await dsToken.issueTokens(wallets[0], investor.tokens);
            console.log(`   ⏳ Issuance transaction submitted: ${issuanceTx.hash}`);
            await issuanceTx.wait();
            
            // Verify the issuance
            const balance = await dsToken.balanceOf(wallets[0]);
            console.log(`   ✅ Tokens issued successfully! Balance: ${balance.toString()}`);
          }
          
          successCount++;
        }
        
      } catch (error: any) {
        console.error(`   ❌ Error creating investor ${investor.id}:`, error.message);
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
    
    console.log('\n' + '='.repeat(60));
    console.log(`📊 Summary: ${successCount} successful, ${failCount} failed`);
    
    if (generatedWallets.length > 0) {
      console.log(`🔑 Generated ${generatedWallets.length} new wallets`);
    }
    
    if (dryrun) {
      console.log('\n💡 To execute for real, run without --dryrun flag');
    }
  });

// Export for use in other tasks
export { CONTRACT_ADDRESSES, ATTRIBUTE_TYPES, ATTRIBUTE_STATUS };
