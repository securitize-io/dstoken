// scripts/update-tasks.js
// Parses deployment-output.txt and creates/updates task files with deployed contract addresses

const fs = require('fs');
const path = require('path');

// Reuse the same mapping from update-init.js
const ADDRESS_MAPPING = {
  'DSToken Proxy address': 'dsToken',
  'Registry Service Proxy address': 'regService', 
  'Wallet Manager Proxy address': 'walletManager',
  'Compliance Service Proxy address': 'compService',
  'Compliance Configuration Service Proxy address': 'compConfigService',
  'Trust Service Proxy address': 'trustService',
  'Lock Manager Proxy address': 'lockManager',
  'Token Issuer Proxy address': 'tokenIssuer',
  'Wallet Registrar Proxy address': 'walletRegistrar',
  'Transaction Relayer Proxy address': 'transactionRelayer',
  'Bulk Operator Proxy address': 'bulkOperator',
  'Rebasing provider Proxy address': 'rebasingProvider',
  'Mock Token deployed to': 'mockToken'
};

function parseDeploymentOutput(text) {
  const addresses = {};
  const lines = text.split('\n');
  
  for (const line of lines) {
    // Skip comments and empty lines
    if (line.trim().startsWith('#') || line.trim() === '') continue;
    
    for (const [pattern, key] of Object.entries(ADDRESS_MAPPING)) {
      if (line.includes(pattern)) {
        // Extract address using regex
        const addressMatch = line.match(/0x[a-fA-F0-9]{40}/);
        if (addressMatch) {
          addresses[key] = addressMatch[0];
        }
      }
    }
  }
  
  return addresses;
}

function createCreateInvestorTask(addresses) {
  const taskContent = `import { task, types } from "hardhat/config";
import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";

// Contract addresses (auto-updated from deployment)
const CONTRACT_ADDRESSES = {
  regService: "${addresses.regService}",
  trustService: "${addresses.trustService}",
  compConfigService: "${addresses.compConfigService}",
  dsToken: "${addresses.dsToken}"
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
  const filename = \`private-keys-\${timestamp}.json\`;
  const filepath = path.join(outputDir, filename);
  
  const keyData = {
    generatedAt: new Date().toISOString(),
    network: "arbitrum",
    warning: "KEEP THIS FILE SECURE - Contains private keys!",
    keys: privateKeys
  };
  
  fs.writeFileSync(filepath, JSON.stringify(keyData, null, 2));
  console.log(\`🔐 Private keys saved to: \${filepath}\`);
  return filepath;
}

task('create-investor', 'Create investors from JSON file with auto wallet generation')
  .addPositionalParam('file', 'Path to investors JSON file', undefined, types.string)
  .addFlag('dryrun', 'Show what would be created without executing')
  .addFlag('generateWallets', 'Generate new wallets for empty wallet arrays')
  .addOptionalParam('keysDir', 'Directory to save private keys', './scripts', types.string)
  .setAction(async (args, hre) => {
    const { file, dryrun, generateWallets, keysDir } = args;
    
    // Validate file exists
    if (!fs.existsSync(file)) {
      console.error(\`❌ File not found: \${file}\`);
      process.exit(1);
    }
    
    // Load investor data
    const investorData = JSON.parse(fs.readFileSync(file, 'utf8'));
    
    if (!investorData.investors || !Array.isArray(investorData.investors)) {
      console.error('❌ Invalid JSON format. Expected: { "investors": [...] }');
      process.exit(1);
    }
    
    console.log(\`📋 Found \${investorData.investors.length} investors to create\`);
    console.log(\`🌐 Network: \${hre.network.name}\`);
    console.log(\`🔗 Chain ID: \${hre.network.config.chainId}\`);
    
    if (dryrun) {
      console.log('\\n🔍 DRY RUN - No transactions will be executed\\n');
    }
    
    if (generateWallets) {
      console.log('\\n🔑 WALLET GENERATION ENABLED - Will create wallets for empty arrays\\n');
    }
    
    const [signer] = await hre.ethers.getSigners();
    console.log(\`👤 Using signer: \${await signer.getAddress()}\`);
    
    // Load contracts with deployed addresses
    const regService = await hre.ethers.getContractAt("IDSRegistryService", CONTRACT_ADDRESSES.regService, signer);
    const trustService = await hre.ethers.getContractAt("IDSTrustService", CONTRACT_ADDRESSES.trustService, signer);
    const compConfigService = await hre.ethers.getContractAt("IDSComplianceConfigurationService", CONTRACT_ADDRESSES.compConfigService, signer);
    
    console.log('\\n📝 Contract addresses:');
    console.log(\`   Registry Service: \${CONTRACT_ADDRESSES.regService}\`);
    console.log(\`   Trust Service: \${CONTRACT_ADDRESSES.trustService}\`);
    console.log(\`   Compliance Config: \${CONTRACT_ADDRESSES.compConfigService}\`);
    
    let successCount = 0;
    let failCount = 0;
    let generatedWallets: any[] = [];
    
    console.log('\\n🚀 Creating investors...');
    console.log('='.repeat(60));
    
    for (const investor of investorData.investors) {
      try {
        console.log(\`\\n📋 Processing investor: \${investor.id}\`);
        
        // Check if wallets array is empty and generate wallets if needed
        let wallets = investor.wallets || [];
        if (wallets.length === 0 && generateWallets) {
          console.log(\`   🔑 No wallets provided - generating new wallet...\`);
          const newWallet = generateWallet();
          wallets = [newWallet.address];
          
          // Store wallet info for private key file
          generatedWallets.push({
            investorId: investor.id,
            address: newWallet.address,
            privateKey: newWallet.privateKey,
            mnemonic: newWallet.mnemonic
          });
          
          console.log(\`   ✅ Generated wallet: \${newWallet.address}\`);
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
        
        console.log(\`   📍 Country: \${investor.country}\`);
        console.log(\`   💼 Wallets: \${wallets.length}\`);
        console.log(\`   🏷️  Attributes: \${investor.attributeIds?.length || 0}\`);
        
        if (dryrun) {
          console.log(\`   ✅ [DRY RUN] Would create investor \${investor.id}\`);
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
          
          console.log(\`   ⏳ Transaction submitted: \${tx.hash}\`);
          await tx.wait();
          console.log(\`   ✅ Investor \${investor.id} created successfully!\`);
          successCount++;
        }
        
      } catch (error) {
        console.error(\`   ❌ Error creating investor \${investor.id}:\`, error.message);
        failCount++;
      }
    }
    
    // Save private keys if any were generated
    if (generatedWallets.length > 0) {
      console.log('\\n🔐 Saving private keys...');
      const keysFile = savePrivateKeys(generatedWallets, keysDir);
      console.log(\`   📁 Keys saved to: \${keysFile}\`);
      console.log('   ⚠️  IMPORTANT: Keep this file secure and never commit it to version control!');
    }
    
    console.log('\\n' + '='.repeat(60));
    console.log(\`📊 Summary: \${successCount} successful, \${failCount} failed\`);
    
    if (generatedWallets.length > 0) {
      console.log(\`🔑 Generated \${generatedWallets.length} new wallets\`);
    }
    
    if (dryrun) {
      console.log('\\n💡 To execute for real, run without --dryrun flag');
    }
  });

// Export for use in other tasks
export { CONTRACT_ADDRESSES, ATTRIBUTE_TYPES, ATTRIBUTE_STATUS };
`;

  return taskContent;
}

function createSetComplianceRulesTask(addresses) {
  const taskContent = `import { task, types } from "hardhat/config";
import * as fs from "fs";
import * as path from "path";

// Contract addresses (auto-updated from deployment)
const CONTRACT_ADDRESSES = {
  compConfigService: "${addresses.compConfigService}",
};

// Parameter mapping for better readability
const PARAMETER_NAMES = {
  uintValues: [
    'totalInvestorsLimit',
    'minUSTokens', 
    'minEUTokens',
    'usInvestorsLimit',
    'usAccreditedInvestorsLimit',
    'nonAccreditedInvestorsLimit',
    'maxUSInvestorsPercentage',
    'blockFlowbackEndTime',
    'nonUSLockPeriod',
    'minimumTotalInvestors',
    'minimumHoldingsPerInvestor',
    'maximumHoldingsPerInvestor',
    'euRetailInvestorsLimit',
    'usLockPeriod',
    'jpInvestorsLimit',
    'authorizedSecurities'
  ],
  boolValues: [
    'forceFullTransfer',
    'forceAccredited',
    'forceAccreditedUS',
    'worldWideForceFullTransfer',
    'disallowBackDating'
  ]
};

// Function to save compliance rules output
function saveComplianceOutput(outputData: any, outputDir: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = \`compliance-rules-\${timestamp}.json\`;
  const filepath = path.join(outputDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(outputData, null, 2));
  console.log(\`📁 Compliance rules output saved to: \${filepath}\`);
  return filepath;
}

task('set-compliance-rules', 'Set all compliance rules from JSON file using setAll()')
  .addPositionalParam('file', 'Path to compliance rules JSON file', undefined, types.string)
  .addFlag('dryrun', 'Show what would be set without executing')
  .addOptionalParam('outputDir', 'Directory to save output JSON', './scripts', types.string)
  .setAction(async (args, hre) => {
    const { file, dryrun, outputDir } = args;
    
    // Validate file exists
    if (!fs.existsSync(file)) {
      console.error(\`❌ File not found: \${file}\`);
      process.exit(1);
    }
    
    // Load compliance rules from JSON
    const complianceData = JSON.parse(fs.readFileSync(file, 'utf8'));
    
    // Validate JSON structure
    if (!complianceData.complianceRules) {
      throw new Error('Invalid JSON format. Expected: { "complianceRules": {...} }');
    }
    
    const { uintValues, boolValues } = complianceData.complianceRules;
    
    // Validate array lengths
    if (uintValues.length !== 16) {
      throw new Error(\`uintValues must have exactly 16 values, got \${uintValues.length}\`);
    }
    if (boolValues.length !== 5) {
      throw new Error(\`boolValues must have exactly 5 values, got \${boolValues.length}\`);
    }
    
    const [signer] = await hre.ethers.getSigners();
    const compConfigService = await hre.ethers.getContractAt(
      "IDSComplianceConfigurationService", 
      CONTRACT_ADDRESSES.compConfigService, 
      signer
    );
    
    console.log('🚀 Setting compliance rules using setAll()...');
    console.log(\`🌐 Network: \${hre.network.name}\`);
    console.log(\`🔗 Chain ID: \${hre.network.config.chainId}\`);
    console.log(\`👤 Using signer: \${await signer.getAddress()}\`);
    console.log(\`📝 Contract: \${CONTRACT_ADDRESSES.compConfigService}\`);
    
    // Get current values before setting new ones
    console.log('\\n📊 Getting current compliance rules...');
    const [currentUintValues, currentBoolValues] = await compConfigService.getAll();
    
    // Display what will be set
    console.log('\\n📊 UInt Values:');
    uintValues.forEach((value, index) => {
      const currentValue = currentUintValues[index];
      const changed = currentValue.toString() !== value.toString();
      console.log(\`   [\${index}] \${PARAMETER_NAMES.uintValues[index]}: \${currentValue} → \${value} \${changed ? '🔄' : '✅'}\`);
    });
    
    console.log('\\n🔘 Bool Values:');
    boolValues.forEach((value, index) => {
      const currentValue = currentBoolValues[index];
      const changed = currentValue !== value;
      console.log(\`   [\${index}] \${PARAMETER_NAMES.boolValues[index]}: \${currentValue} → \${value} \${changed ? '🔄' : '✅'}\`);
    });
    
    // Prepare output data
    const outputData = {
      metadata: {
        generatedAt: new Date().toISOString(),
        network: hre.network.name,
        chainId: hre.network.config.chainId,
        signer: await signer.getAddress(),
        contractAddress: CONTRACT_ADDRESSES.compConfigService,
        inputFile: file,
        dryRun: dryrun
      },
      transaction: {
        hash: null,
        blockNumber: null,
        gasUsed: null,
        gasPrice: null,
        timestamp: null
      },
      complianceRules: {
        uintValues: {
          values: uintValues,
          names: PARAMETER_NAMES.uintValues,
          mapped: {}
        },
        boolValues: {
          values: boolValues,
          names: PARAMETER_NAMES.boolValues,
          mapped: {}
        }
      },
      changes: {
        uintChanges: [],
        boolChanges: []
      }
    };
    
    // Map values to names for easier reading
    uintValues.forEach((value, index) => {
      outputData.complianceRules.uintValues.mapped[PARAMETER_NAMES.uintValues[index]] = value;
    });
    
    boolValues.forEach((value, index) => {
      outputData.complianceRules.boolValues.mapped[PARAMETER_NAMES.boolValues[index]] = value;
    });
    
    // Track changes
    uintValues.forEach((value, index) => {
      const currentValue = currentUintValues[index];
      if (currentValue.toString() !== value.toString()) {
        outputData.changes.uintChanges.push({
          parameter: PARAMETER_NAMES.uintValues[index],
          index: index,
          from: currentValue.toString(),
          to: value.toString()
        });
      }
    });
    
    boolValues.forEach((value, index) => {
      const currentValue = currentBoolValues[index];
      if (currentValue !== value) {
        outputData.changes.boolChanges.push({
          parameter: PARAMETER_NAMES.boolValues[index],
          index: index,
          from: currentValue,
          to: value
        });
      }
    });
    
    if (dryrun) {
      console.log('\\n🔍 DRY RUN - No transactions will be executed');
      console.log(\`📊 Summary: \${outputData.changes.uintChanges.length} uint changes, \${outputData.changes.boolChanges.length} bool changes\`);
      console.log('✅ All compliance rules validated successfully!');
    } else {
      console.log('\\n⏳ Executing setAll() transaction...');
      const tx = await compConfigService.setAll(uintValues, boolValues);
      console.log(\`📝 Transaction submitted: \${tx.hash}\`);
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      // Update output data with transaction info
      outputData.transaction = {
        hash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        gasPrice: tx.gasPrice?.toString() || '0',
        timestamp: new Date().toISOString()
      };
      
      console.log(\`✅ Transaction mined in block: \${receipt.blockNumber}\`);
      console.log(\`⛽ Gas used: \${receipt.gasUsed.toString()}\`);
      
      // Verify the changes by getting the new values
      console.log('\\n🔍 Verifying changes...');
      const [newUintValues, newBoolValues] = await compConfigService.getAll();
      
      // Add verification to output
      outputData.verification = {
        uintValues: {
          expected: uintValues,
          actual: newUintValues.map(v => v.toString()),
          verified: uintValues.every((v, i) => v.toString() === newUintValues[i].toString())
        },
        boolValues: {
          expected: boolValues,
          actual: newBoolValues,
          verified: boolValues.every((v, i) => v === newBoolValues[i])
        }
      };
      
      console.log(\`✅ UInt values verified: \${outputData.verification.uintValues.verified}\`);
      console.log(\`✅ Bool values verified: \${outputData.verification.boolValues.verified}\`);
      console.log('✅ All compliance rules set successfully!');
    }
    
    // Save output file
    const outputFile = saveComplianceOutput(outputData, outputDir);
    console.log(\`\\n📁 Full compliance rules output saved to: \${outputFile}\`);
    
    return outputData;
  });

// Export for use in other tasks
export { CONTRACT_ADDRESSES, PARAMETER_NAMES };
`;

  return taskContent;
}

function updateTaskFiles(addresses) {
  const tasksDir = path.join(__dirname, '..', 'tasks');
  
  // Ensure tasks directory exists
  if (!fs.existsSync(tasksDir)) {
    fs.mkdirSync(tasksDir, { recursive: true });
  }
  
  // Create the enhanced create-investor task
  const createInvestorTask = createCreateInvestorTask(addresses);
  const taskFilePath = path.join(tasksDir, 'create-investor.ts');
  
  fs.writeFileSync(taskFilePath, createInvestorTask);
  console.log(`✅ Created ${taskFilePath}`);
  
  // Create the set-compliance-rules task
  const setComplianceRulesTask = createSetComplianceRulesTask(addresses);
  const complianceTaskFilePath = path.join(tasksDir, 'set-compliance-rules.ts');
  
  fs.writeFileSync(complianceTaskFilePath, setComplianceRulesTask);
  console.log(`✅ Created ${complianceTaskFilePath}`);
  
  // Update tasks.index.ts to export the new tasks
  const indexPath = path.join(tasksDir, 'tasks.index.ts');
  let indexContent = '';
  
  if (fs.existsSync(indexPath)) {
    indexContent = fs.readFileSync(indexPath, 'utf8');
  }
  
  // Add exports if not already present
  if (!indexContent.includes("export * from './create-investor';")) {
    indexContent += "\nexport * from './create-investor';\n";
  }
  
  if (!indexContent.includes("export * from './set-compliance-rules';")) {
    indexContent += "export * from './set-compliance-rules';\n";
  }
  
  fs.writeFileSync(indexPath, indexContent);
  console.log(`✅ Updated ${indexPath}`);
}

function main() {
  const deploymentFilePath = path.join(__dirname, 'deployment-output.txt');
  
  if (!fs.existsSync(deploymentFilePath)) {
    console.error('❌ deployment-output.txt not found!');
    console.log('Please paste your deployment output in scripts/deployment-output.txt first.');
    process.exit(1);
  }
  
  console.log('📋 Reading deployment output from deployment-output.txt...');
  
  const deploymentText = fs.readFileSync(deploymentFilePath, 'utf8');
  
  // Check if there's actual deployment output (contains addresses)
  const hasAddresses = /0x[a-fA-F0-9]{40}/.test(deploymentText);
  
  if (!hasAddresses) {
    console.log('❌ No deployment output found in deployment-output.txt');
    console.log('Please paste your deployment output in the file and run this script again.');
    process.exit(1);
  }
  
  console.log('🔍 Parsing deployment output...');
  
  const addresses = parseDeploymentOutput(deploymentText);
  
  if (Object.keys(addresses).length === 0) {
    console.log('❌ No addresses found in the deployment output.');
    console.log('Make sure you copied the complete deployment output.');
    process.exit(1);
  }
  
  console.log('✅ Found addresses:');
  Object.entries(addresses).forEach(([key, value]) => {
    console.log(`   ${key}: ${value}`);
  });
  
  console.log('\n🔧 Creating/updating task files...');
  
  updateTaskFiles(addresses);
  
  console.log('\n✅ Enhanced task files created successfully!');
  console.log('\n📖 Usage:');
  console.log('   # Create investors with auto wallet generation');
  console.log('   npx hardhat create-investor scripts/investors.json --network arbitrum --generate-wallets');
  console.log('   npx hardhat create-investor scripts/investors.json --network arbitrum --generate-wallets --dryrun');
  console.log('');
  console.log('   # Create investors without wallet generation');
  console.log('   npx hardhat create-investor scripts/investors.json --network arbitrum');
  console.log('');
  console.log('   # Save private keys to custom directory');
  console.log('   npx hardhat create-investor scripts/investors.json --network arbitrum --generate-wallets --keys-dir ./secure-keys');
}

if (require.main === module) {
  main();
}

module.exports = { parseDeploymentOutput, updateTaskFiles };
