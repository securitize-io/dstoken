// scripts/update/update-tests.js
// Parses deployment-output.txt and updates contract addresses in test files

const fs = require('fs');
const path = require('path');

// Contract address mapping
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

function updateContractAddressesInTestFile(filePath, addresses) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return false;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let updated = false;
  
  // Update hardcoded contract addresses in test files
  // Pattern 1: Direct contract instantiation with hardcoded address (handles multiline)
  const directContractRegex = /await\s+ethers\.getContractAt\(\s*["']([^"']+)["'],\s*["'](0x[a-fA-F0-9]{40})["']/gs;
  
  content = content.replace(directContractRegex, (match, contractName, oldAddress) => {
    // Find the appropriate address based on contract name
    let address = null;
    
    switch (contractName) {
      case 'ComplianceServiceRegulated':
        address = addresses.compService;
        break;
      case 'IDSComplianceConfigurationService':
        address = addresses.compConfigService;
        break;
      case 'IDSRegistryService':
        address = addresses.regService;
        break;
      case 'IDSTrustService':
        address = addresses.trustService;
        break;
      case 'IDSWalletManager':
        address = addresses.walletManager;
        break;
      case 'IDSLockManager':
        address = addresses.lockManager;
        break;
      case 'IDSTokenIssuer':
        address = addresses.tokenIssuer;
        break;
      case 'DSToken':
        address = addresses.dsToken;
        break;
      case 'BulkOperator':
        address = addresses.bulkOperator;
        break;
      case 'SecuritizeRebasingProvider':
        address = addresses.rebasingProvider;
        break;
      default:
        console.log(`⚠️  Unknown contract type: ${contractName}`);
        return match; // Return original if no mapping found
    }
    
    if (address) {
      if (oldAddress !== address) {
        console.log(`   📝 ${contractName}: ${oldAddress} → ${address}`);
        updated = true;
      }
      return `await ethers.getContractAt("${contractName}", "${address}"`;
    }
    
    return match;
  });
  
  // Pattern 2: Update CONTRACT_ADDRESSES objects in test files
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
    if (addresses.dsToken) newAddresses += `  dsToken: "${addresses.dsToken}",\n`;
    if (addresses.bulkOperator) newAddresses += `  bulkOperator: "${addresses.bulkOperator}",\n`;
    if (addresses.rebasingProvider) newAddresses += `  rebasingProvider: "${addresses.rebasingProvider}"\n`;
    
    newAddresses += '};';
    
    content = content.replace(contractAddressesRegex, newAddresses);
    updated = true;
  }
  
  if (updated) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated contract addresses in ${path.basename(filePath)}`);
    return true;
  } else {
    // Check if we found any addresses at all
    const hasAddresses = /await\s+ethers\.getContractAt\(\s*["']([^"']+)["'],\s*["'](0x[a-fA-F0-9]{40})["']/gs.test(content);
    if (hasAddresses) {
      console.log(`ℹ️  Contract addresses in ${path.basename(filePath)} are already up to date`);
    } else {
      console.log(`ℹ️  No contract addresses found to update in ${path.basename(filePath)}`);
    }
    return false;
  }
}

function updateTestFiles(addresses) {
  const testDir = path.join(__dirname, '..', '..', 'test');
  
  if (!fs.existsSync(testDir)) {
    console.log('❌ Test directory not found!');
    return;
  }
  
  console.log('🧪 Updating contract addresses in test files...');
  
  // List of test files to update
  // Add test files here that contain hardcoded contract addresses
  // Format: 'path/to/test-file.ts' (relative to test/ directory)
  const testFiles = [
    'compliance-rules/min-tokens.test.ts'
    // Add more test files here as needed:
    // 'compliance-service-regulated.test.ts',
    // 'dstoken-regulated.test.ts',
    // 'registry-service.test.ts',
    // 'wallet-manager.test.ts',
    // 'trust-service.test.ts',
    // 'transaction-relayer.test.ts',
    // 'token-issuer.test.ts',
    // 'lock-manager.test.ts',
    // 'investor-lock-manager.test.ts',
    // 'compliance-configuration-service.test.ts',
    // 'bulk-operator.test.ts',
    // 'rebasing-provider.test.ts'
  ];
  
  let updatedCount = 0;
  
  for (const testFile of testFiles) {
    const filePath = path.join(testDir, testFile);
    console.log(`\n📄 Processing: ${testFile}`);
    if (updateContractAddressesInTestFile(filePath, addresses)) {
      updatedCount++;
    }
  }
  
  console.log(`\n✅ Updated ${updatedCount} test file(s)`);
}

function main() {
  const deploymentFilePath = path.join(__dirname, 'deployment-output.txt');
  
  if (!fs.existsSync(deploymentFilePath)) {
    console.error('❌ deployment-output.txt not found!');
    console.log('Please paste your deployment output in scripts/update/deployment-output.txt first.');
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
  
  console.log('');
  updateTestFiles(addresses);
  
  console.log('\n🎉 Test files updated successfully!');
  console.log('\n💡 Your test files now use the deployed contract addresses.');
  console.log('\n📖 Usage:');
  console.log('   # Run the minimum tokens compliance test');
  console.log('   npx hardhat test test/compliance-rules/min-tokens.test.ts --network arbitrum');
}

if (require.main === module) {
  main();
}

module.exports = { parseDeploymentOutput, updateTestFiles };

