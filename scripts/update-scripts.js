// scripts/update-scripts.js
// Unified script that updates both init.js and task files with deployed contract addresses

const { execSync } = require('child_process');

console.log('🚀 Updating all scripts...\n');

try {
  console.log('📝 Step 1: Updating init.js...');
  execSync('node scripts/update-init.js', { stdio: 'inherit' });
  
  console.log('\n🔧 Step 2: Updating task files...');
  execSync('node scripts/update-tasks.js', { stdio: 'inherit' });
  
  console.log('\n🎉 All scripts updated successfully!');
  console.log('\n📖 Next steps:');
  console.log('   1. Use Hardhat console: npx hardhat console --network arbitrum');
  console.log('   2. Load contracts: .load scripts/init.js');
  console.log('   3. Create investors: npx hardhat create-investor scripts/investors.json --network arbitrum');
  console.log('   4. Or with auto wallet generation: npx hardhat create-investor scripts/investors.json --network arbitrum --generate-wallets');
} catch (error) {
  console.error('❌ Error updating scripts:', error.message);
  process.exit(1);
}
