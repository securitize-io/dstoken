// scripts/update-tasks.js
// Parses deploy-all-and-update.json and updates ONLY contract addresses in existing task files

const fs = require('fs');
const path = require('path');


function parseDeploymentJSON(jsonFilePath) {
  try {
    const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
    
    // Handle both legacy and new JSON structure
    if (jsonData.addresses) {
      // New structure with metadata
      return jsonData.addresses;
    } else if (jsonData.dsToken || jsonData.regService) {
      // Direct address mapping (legacy support)
      return jsonData;
    } else {
      console.log('❌ Invalid JSON structure in deploy-all-and-update.json');
      return {};
    }
  } catch (error) {
    console.log(`❌ Error reading JSON file: ${error.message}`);
    return {};
  }
}

function updateContractAddressesInFile(filePath, addresses) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return false;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let updated = false;
  
  // Update CONTRACT_ADDRESSES object
  const contractAddressesRegex = /const CONTRACT_ADDRESSES = \{([^}]+)\}/;
  const match = content.match(contractAddressesRegex);
  
  if (match) {
    let newAddresses = 'const CONTRACT_ADDRESSES = {\n';
    
    // Add all available addresses
    if (addresses.regService) newAddresses += `  regService: "${addresses.regService}",\n`;
    if (addresses.trustService) newAddresses += `  trustService: "${addresses.trustService}",\n`;
    if (addresses.compConfigService) newAddresses += `  compConfigService: "${addresses.compConfigService}",\n`;
    if (addresses.compService) newAddresses += `  compService: "${addresses.compService}",\n`;
    if (addresses.walletManager) newAddresses += `  walletManager: "${addresses.walletManager}",\n`;
    if (addresses.lockManager) newAddresses += `  lockManager: "${addresses.lockManager}",\n`;
    if (addresses.tokenIssuer) newAddresses += `  tokenIssuer: "${addresses.tokenIssuer}",\n`;
    if (addresses.walletRegistrar) newAddresses += `  walletRegistrar: "${addresses.walletRegistrar}",\n`;
    if (addresses.transactionRelayer) newAddresses += `  transactionRelayer: "${addresses.transactionRelayer}",\n`;
    if (addresses.bulkOperator) newAddresses += `  bulkOperator: "${addresses.bulkOperator}",\n`;
    if (addresses.rebasingProvider) newAddresses += `  rebasingProvider: "${addresses.rebasingProvider}",\n`;
    if (addresses.mockToken) newAddresses += `  mockToken: "${addresses.mockToken}",\n`;
    if (addresses.dsToken) newAddresses += `  dsToken: "${addresses.dsToken}"\n`;
    
    newAddresses += '};';
    
    content = content.replace(contractAddressesRegex, newAddresses);
    updated = true;
  }
  
  if (updated) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated contract addresses in ${filePath}`);
    return true;
  } else {
    console.log(`⚠️  No CONTRACT_ADDRESSES found in ${filePath}`);
    return false;
  }
}

function updateTaskFiles(addresses) {
  const tasksDir = path.join(__dirname, '..', '..', 'tasks');
  
  if (!fs.existsSync(tasksDir)) {
    console.log('❌ Tasks directory not found!');
    return;
  }
  
  console.log('🔧 Updating contract addresses in existing task files...');
  
  // List of task files to update (in qa folder)
  const taskFiles = [
    'qa/create-investor.ts',
    'qa/transfer-from-investors.ts',
    'qa/set-compliance-rules.ts',
    'qa/get-compliance-rules.ts',
    'qa/fund-investor-wallets.ts',
    'qa/issue-tokens.ts'
  ];
  
  let updatedCount = 0;
  
  for (const taskFile of taskFiles) {
    const filePath = path.join(tasksDir, taskFile);
    if (updateContractAddressesInFile(filePath, addresses)) {
      updatedCount++;
    }
  }
  
  console.log(`\n✅ Updated ${updatedCount} task files`);
}

function main() {
  const jsonFilePath = path.join(__dirname, '..', 'output', 'deploy-all-and-update.json');
  
  if (!fs.existsSync(jsonFilePath)) {
    console.error('❌ deploy-all-and-update.json not found!');
    console.log('Please run: npx hardhat deploy-all-and-update --network <your-network>');
    process.exit(1);
  }
  
  console.log('📋 Reading deployment addresses from deploy-all-and-update.json...');
  const addresses = parseDeploymentJSON(jsonFilePath);
  
  if (Object.keys(addresses).length === 0) {
    console.log('❌ No valid addresses found in deploy-all-and-update.json');
    console.log('Please run: npx hardhat deploy-all-and-update --network <your-network>');
    process.exit(1);
  }
  
  console.log('✅ Found addresses:');
  Object.entries(addresses).forEach(([key, value]) => {
    console.log(`   ${key}: ${value}`);
  });
  
  updateTaskFiles(addresses);
  
  console.log('\n🎉 Contract addresses updated successfully!');
  console.log('\n💡 Your enhanced task files are preserved with updated contract addresses.');
  console.log('\n📖 Usage:');
  console.log('   # Create investors with auto wallet generation and unique IDs');
  console.log('   npx hardhat create-investor scripts/config/create-investor.json --network arbitrum --generatewallets --generateuniqueids');
  console.log('');
  console.log('   # Transfer tokens with auto-approval');
  console.log('   npx hardhat transfer-from-investors scripts/config/transfer-from-investors.json --network arbitrum --autoapprove');
  console.log('');
  console.log('   # Set compliance rules');
  console.log('   npx hardhat set-compliance-rules scripts/config/set-compliance-rules.json --network arbitrum');
}

if (require.main === module) {
  main();
}

module.exports = { parseDeploymentJSON, updateTaskFiles };