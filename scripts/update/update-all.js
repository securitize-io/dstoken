// scripts/update/update-all.js
// Unified script that updates console-init.js, task files, and test files with deployed contract addresses

const { execSync } = require('child_process');

console.log('🚀 Updating all scripts...\n');

try {
  console.log('📝 Step 1: Updating console-init.js...');
  execSync('node scripts/update/update-console-init.js', { stdio: 'inherit' });
  
  console.log('\n🔧 Step 2: Updating task files...');
  execSync('node scripts/update/update-tasks.js', { stdio: 'inherit' });
  
  console.log('\n🧪 Step 3: Updating test files...');
  execSync('node scripts/update/update-tests.js', { stdio: 'inherit' });
  
  console.log('\n🎉 All scripts updated successfully!');
  console.log('\n📖 Next steps:');
  console.log('   1. Use Hardhat console: npx hardhat console --network arbitrum');
  console.log('   2. Load contracts: .load scripts/console-init.js');
  console.log('   3. Create investors: npx hardhat create-investor scripts/config/create-investor.json --network arbitrum --generatewallets');
  console.log('   4. Run compliance tests: npx hardhat test test/compliance-rules/min-tokens.test.ts --network arbitrum');
} catch (error) {
  console.error('❌ Error updating scripts:', error.message);
  process.exit(1);
}
