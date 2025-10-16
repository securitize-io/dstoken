// scripts/update-init.js
// Parses deployment-output.txt and updates init.js with all contract addresses

const fs = require('fs');
const path = require('path');

// Mapping from deployment output patterns to our ADDR object keys
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

// Contract interface mapping for getContractAt calls
const CONTRACT_INTERFACES = {
  dsToken: 'IDSToken',
  regService: 'IDSRegistryService',
  walletManager: 'IDSWalletManager',
  compService: 'ComplianceServiceRegulated',
  compConfigService: 'IDSComplianceConfigurationService',
  trustService: 'IDSTrustService',
  lockManager: 'IDSLockManager',
  tokenIssuer: 'IDSTokenIssuer',
  walletRegistrar: 'IDSWalletRegistrar',
  transactionRelayer: 'TransactionRelayer',
  bulkOperator: 'IBulkOperator',
  rebasingProvider: 'ISecuritizeRebasingProvider',
  mockToken: 'StandardTokenMock'
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
      console.log('❌ Invalid JSON structure in deployment-addresses.json');
      return {};
    }
  } catch (error) {
    console.log(`❌ Error reading JSON file: ${error.message}`);
    return {};
  }
}

function updateInitFile(addresses) {
  const initFilePath = path.join(__dirname, '..', 'console-init.js');
  let content = fs.readFileSync(initFilePath, 'utf8');
  
  // Find the ADDR object and replace it
  const addrObjectStart = content.indexOf('const ADDR = {');
  const addrObjectEnd = content.indexOf('};', addrObjectStart) + 2;
  
  if (addrObjectStart === -1 || addrObjectEnd === -1) {
    console.error('Could not find ADDR object in init.js');
    return false;
  }
  
  // Build new ADDR object
  const newAddrObject = 'const ADDR = {\n' +
    Object.entries(addresses)
      .map(([key, value]) => `    ${key}: "${value}"`)
      .join(',\n') +
    '\n  };';
  
  // Replace the old ADDR object
  let newContent = content.substring(0, addrObjectStart) + 
                  newAddrObject + 
                  content.substring(addrObjectEnd);
  
  // Now update the contract attachment section
  const contractStart = newContent.indexOf('// Attach contracts and expose as globals');
  const contractEnd = newContent.indexOf('// Handy helpers (optional)');
  
  if (contractStart !== -1 && contractEnd !== -1) {
    // Build new contract attachment section
    let contractSection = '    // Attach contracts and expose as globals\n';
    
    for (const [key, address] of Object.entries(addresses)) {
      const interfaceName = CONTRACT_INTERFACES[key];
      if (interfaceName) {
        contractSection += `    global.${key} = await ethers.getContractAt("${interfaceName}", ADDR.${key}, signer);\n`;
      }
    }
    
    // Replace the contract section
    newContent = newContent.substring(0, contractStart) + 
                contractSection + 
                newContent.substring(contractEnd);
  }
  
  // Update the console.log message
  const contractNames = Object.keys(addresses).join(', ');
  newContent = newContent.replace(
    /console\.log\("- dsToken, .*"\);/,
    `console.log("- ${contractNames}");`
  );
  
  fs.writeFileSync(initFilePath, newContent);
  return true;
}

function main() {
  const jsonFilePath = path.join(__dirname, '..', 'output', 'deployment-addresses.json');
  const textFilePath = path.join(__dirname, 'deployment-output.txt');
  
  let addresses = {};
  
  // Try JSON file first (new approach)
  if (fs.existsSync(jsonFilePath)) {
    console.log('📋 Reading deployment addresses from deployment-addresses.json...');
    addresses = parseDeploymentJSON(jsonFilePath);
    
    if (Object.keys(addresses).length > 0) {
      console.log('✅ Found addresses from JSON file:');
      Object.entries(addresses).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });
    } else {
      console.log('❌ No valid addresses found in JSON file, trying text file...');
    }
  }
  
  // Fallback to text file (backward compatibility)
  if (Object.keys(addresses).length === 0) {
    if (!fs.existsSync(textFilePath)) {
      console.error('❌ Neither deployment-addresses.json nor deployment-output.txt found!');
      console.log('Please either:');
      console.log('  1. Run: npx hardhat deploy-all-and-update --network <your-network>');
      console.log('  2. Or paste deployment output in scripts/update/deployment-output.txt');
      process.exit(1);
    }
    
    console.log('📋 Reading deployment output from deployment-output.txt...');
    
    const deploymentText = fs.readFileSync(textFilePath, 'utf8');
    
    // Check if there's actual deployment output (contains addresses)
    const hasAddresses = /0x[a-fA-F0-9]{40}/.test(deploymentText);
    
    if (!hasAddresses) {
      console.log('❌ No deployment output found in deployment-output.txt');
      console.log('Please paste your deployment output in the file and run this script again.');
      process.exit(1);
    }
    
    console.log('🔍 Parsing deployment output...');
    
    addresses = parseDeploymentOutput(deploymentText);
    
    if (Object.keys(addresses).length === 0) {
      console.log('❌ No addresses found in the deployment output.');
      console.log('Make sure you copied the complete deployment output.');
      process.exit(1);
    }
    
    console.log('✅ Found addresses from text file:');
    Object.entries(addresses).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
  }
  
  console.log('\n📝 Updating console-init.js...');
  
  if (updateInitFile(addresses)) {
    console.log('✅ Successfully updated scripts/console-init.js with new addresses!');
    console.log('\nYou can now use: npx hardhat console --network <your-network>');
    console.log('Then: .load scripts/console-init.js');
  } else {
    console.log('❌ Failed to update console-init.js');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { parseDeploymentOutput, updateInitFile };
