// qa/update-contracts-scripts/update-all.js
// Unified script that updates console-init.js, task files, and test files with deployed contract addresses

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Updating all scripts...\n');

// Check for deployment data
const jsonFilePath = path.join(__dirname, '..', 'tasks', 'output', 'deploy-all-and-update.json');

if (!fs.existsSync(jsonFilePath)) {
  console.error('❌ No deployment data found!');
  console.log('\nPlease run: npx hardhat deploy-all-and-update --network <your-network>');
  process.exit(1);
}

console.log('✅ Using deploy-all-and-update.json');

try {
  console.log('📝 Step 1: Updating console-init.js...');
  execSync('node qa/update-contracts-scripts/update-console-init.js', { stdio: 'inherit' });
  
  console.log('\n🔧 Step 2: Updating task files...');
  execSync('node qa/update-contracts-scripts/update-tasks.js', { stdio: 'inherit' });
  
  console.log('\n🧪 Step 3: Updating test files...');
  execSync('node qa/update-contracts-scripts/update-tests.js', { stdio: 'inherit' });
  
  console.log('\n🎉 All scripts updated successfully!');
  console.log('\n📖 Next steps:');
  console.log('   1. Use Hardhat console: npx hardhat console --network <your-network>');
  console.log('   2. Load contracts: .load qa/update-contracts-scripts/console-init.js');
  console.log('   3. Create investors: npx hardhat create-investor qa/tasks/config/create-investor.json --network <your-network> --generatewallets');
  console.log('   4. Run compliance tests: npx hardhat test qa/tests/compliance-rules/min-tokens.test.ts --network <your-network>');
} catch (error) {
  console.error('❌ Error updating scripts:', error.message);
  process.exit(1);
}
