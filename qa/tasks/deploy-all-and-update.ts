import { task, types } from "hardhat/config";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

task('deploy-all-and-update', 'Deploy DS Protocol and automatically update all references')
  .addParam('name', 'DS Token name', 'Token Example', types.string)
  .addParam('symbol', 'DS Token symbol', 'EXA', types.string)
  .addParam('decimals', 'DS Token decimals', 2, types.int)
  .addParam('compliance', 'Compliance Type', 'REGULATED', types.string)
  .addOptionalParam('multiplier', 'Rebasing Multiplier', '1000000000000000000', types.string)
  .setAction(async (args, { run }) => {
    console.log('🚀 Starting deployment and update process...\n');
    
    let dsContracts;
    
    try {
      // Step 1: Run the existing deploy-all task
      console.log('📦 Step 1: Deploying all contracts...');
      dsContracts = await run('deploy-all', args);
      
      // Step 2: Extract and map contract addresses
      console.log('🔍 Step 2: Extracting contract addresses...');
      
      // Map deploy-all result to standardized address keys
      const addressMapping = {
        dsToken: dsContracts.dsToken?.target || dsContracts.dsToken?.address,
        regService: dsContracts.registryService?.target || dsContracts.registryService?.address,
        trustService: dsContracts.trustService?.target || dsContracts.trustService?.address,
        compService: dsContracts.complianceService?.target || dsContracts.complianceService?.address,
        walletManager: dsContracts.walletManager?.target || dsContracts.walletManager?.address,
        lockManager: dsContracts.lockManager?.target || dsContracts.lockManager?.address,
        compConfigService: dsContracts.complianceConfigurationService?.target || dsContracts.complianceConfigurationService?.address,
        tokenIssuer: dsContracts.tokenIssuer?.target || dsContracts.tokenIssuer?.address,
        walletRegistrar: dsContracts.walletRegistrar?.target || dsContracts.walletRegistrar?.address,
        transactionRelayer: dsContracts.transactionRelayer?.target || dsContracts.transactionRelayer?.address,
        bulkOperator: dsContracts.bulkOperator?.target || dsContracts.bulkOperator?.address,
        rebasingProvider: dsContracts.rebasingProvider?.target || dsContracts.rebasingProvider?.address,
        mockToken: dsContracts.usdcMock?.target || dsContracts.usdcMock?.address
      };

      // Filter out undefined addresses
      const validAddresses = Object.fromEntries(
        Object.entries(addressMapping).filter(([_, address]) => address !== undefined)
      );

      console.log('✅ Found addresses:');
      Object.entries(validAddresses).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });

      // Step 3: Generate JSON file
      console.log('\n📝 Step 3: Generating deployment addresses JSON...');
      
      const outputDir = path.join(process.cwd(), 'qa', 'tasks', 'output');
      
      // Ensure output directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const jsonFilePath = path.join(outputDir, 'deploy-all-and-update.json');
      
      // Add metadata to the JSON file
      const deploymentData = {
        metadata: {
          deployedAt: new Date().toISOString(),
          deploymentTask: 'deploy-all-and-update',
          parameters: args
        },
        addresses: validAddresses
      };
      
      fs.writeFileSync(jsonFilePath, JSON.stringify(deploymentData, null, 2));
      console.log(`✅ JSON file created: ${jsonFilePath}`);

      // Step 4: Run the update scripts orchestrator
      console.log('\n🔧 Step 4: Running update scripts...');
      
      try {
        execSync('node qa/update-contracts-scripts/update-all.js', { 
          stdio: 'inherit',
          cwd: process.cwd()
        });
        
        console.log('\n🎉 Deploy and update process completed successfully!');
        console.log('\n💡 All contract references have been automatically updated in:');
        console.log('   - Hardhat console init script');
        console.log('   - QA task files');
        console.log('   - Test files');
        
        console.log('\n📖 Next steps:');
        console.log('   1. Use Hardhat console: npx hardhat console --network <your-network>');
        console.log('   2. Load contracts: .load qa/update-contracts-scripts/console-init.js');
        console.log('   3. Create investors: npx hardhat create-investor qa/tasks/config/create-investor.json --network <your-network> --generatewallets');
        console.log('   4. Run compliance tests: npx hardhat test qa/tests/compliance-rules/min-tokens.test.ts --network <your-network>');
        
      } catch (updateError) {
        console.error('\n⚠️  Deployment succeeded but update scripts failed:');
        console.error(updateError.message);
        console.log('\n💡 You can manually run the update scripts:');
        console.log('   node qa/update-contracts-scripts/update-all.js');
      }
      
    } catch (error) {
      console.error('\n❌ Deploy and update process failed:');
      console.error(error.message || error);
      process.exit(1);
    }
    
    return dsContracts;
  });
