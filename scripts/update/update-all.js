// scripts/update/update-all.js
// Unified script that updates console-init.js, task files, and test files with deployed contract addresses

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Updating all scripts...\n');

// Check for deployment data sources
const jsonFilePath = path.join(__dirname, '..', 'output', 'deploy-all-and-update.json');
const textFilePath = path.join(__dirname, 'deployment-output.txt');

const hasJsonFile = fs.existsSync(jsonFilePath);
const hasTextFile = fs.existsSync(textFilePath);

if (!hasJsonFile && !hasTextFile) {
  console.error('❌ No deployment data found!');
  console.log('\nPlease either:');
  console.log('  1. Run: npx hardhat deploy-all-and-update --network <your-network>');
  console.log('  2. Or paste deployment output in scripts/update/deployment-output.txt');
  process.exit(1);
}

if (hasJsonFile) {
  console.log('✅ Using deploy-all-and-update.json (structured data)');
} else {
  console.log('✅ Using deployment-output.txt (backward compatibility)');
}

try {
  console.log('📝 Step 1: Updating console-init.js...');
  execSync('node scripts/update/update-console-init.js', { stdio: 'inherit' });
  
  console.log('\n🔧 Step 2: Updating task files...');
  execSync('node scripts/update/update-tasks.js', { stdio: 'inherit' });
  
  console.log('\n🧪 Step 3: Updating test files...');
  execSync('node scripts/update/update-tests.js', { stdio: 'inherit' });
  
  console.log('\n🎉 All scripts updated successfully!');
  console.log('\n📖 Next steps:');
  console.log('   1. Use Hardhat console: npx hardhat console --network <your-network>');
  console.log('   2. Load contracts: .load scripts/console-init.js');
  console.log('   3. Create investors: npx hardhat create-investor scripts/config/create-investor.json --network <your-network> --generatewallets');
  console.log('   4. Run compliance tests: npx hardhat test test/compliance-rules/min-tokens.test.ts --network <your-network>');
} catch (error) {
  console.error('❌ Error updating scripts:', error.message);
  process.exit(1);
}
