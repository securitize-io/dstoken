// scripts/update-init.js
// Parses deploy-all-and-update.json and updates init.js with all contract addresses

const fs = require('fs');
const path = require('path');


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

module.exports = { parseDeploymentJSON, updateInitFile };
