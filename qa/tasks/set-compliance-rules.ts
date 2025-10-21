import { task, types } from "hardhat/config";
import * as fs from "fs";
import * as path from "path";

// Contract addresses (auto-updated from deployment)
const CONTRACT_ADDRESSES = {
  regService: "0xF965F511856e8F963F6F455F4d48EE4d4c0f6cC1",
  trustService: "0x24C631eD5Ef434CE93bc2476358d732321d7F9e3",
  compConfigService: "0xC551dfbEea024F536Da48b3a0F4D671D70813C36",
  compService: "0xA20D6b350427Ac5864bE23d87CFc8eDe1A9eDC8d",
  walletManager: "0xD2B2dA929fdc903879158c84C4fCF28504E3d15e",
  lockManager: "0xFFc82f2D4ac645EE08ed1075287f0CA4FF083900",
  tokenIssuer: "0x2A643c33a57F7F54dc79611666123F9470cc75D8",
  walletRegistrar: "0xD4Eb8F12f4cD1718966B2fe613D8f17C3230b7b9",
  transactionRelayer: "0x7985E2be5Fe02E84De5BBF266367eae927f32c94",
  bulkOperator: "0x8A9428f1C31F96B5A75C320501e5f514abE9e93A",
  rebasingProvider: "0x3c75e059Ad038fdB8C11d35CdF12dC770E4cC0A5",
  mockToken: "0x6BF95b896fCdE7A961900e17ccd3AE68bB7D7297",
  dsToken: "0x758460444e70c9e15d069862BD21D7e6461405c0"
};;;;;;;;;;;

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
function saveComplianceOutput(outputData: any, outputDir: string, timestamp: string) {
  const filename = `set-compliance-rules+${timestamp}.json`;
  const filepath = path.join(outputDir, 'output', filename);
  
  fs.writeFileSync(filepath, JSON.stringify(outputData, null, 2));
  console.log(`📁 Compliance rules output saved to: ${filepath}`);
  return filepath;
}

task('set-compliance-rules', 'Set all compliance rules from JSON file using setAll()')
  .addPositionalParam('file', 'Path to compliance rules JSON file', undefined, types.string)
  .addFlag('dryrun', 'Show what would be set without executing')
  .addOptionalParam('outputDir', 'Directory to save output files', './qa/tasks', types.string)
  .setAction(async (args, hre) => {
    const { file, dryrun, outputDir } = args;
    
    // Validate file exists
    if (!fs.existsSync(file)) {
      console.error(`❌ File not found: ${file}`);
      process.exit(1);
    }
    
    // Load compliance rules from JSON
    const complianceData = JSON.parse(fs.readFileSync(file, 'utf8'));
    
    // Validate JSON structure
    if (!complianceData.complianceRules) {
      throw new Error('Invalid JSON format. Expected: { "complianceRules": {...} }');
    }
    
    const { uintValues, boolValues } = complianceData.complianceRules;
    const countryCompliance = complianceData.countryCompliance || {};
    
    // Validate array lengths
    if (uintValues.length !== 16) {
      throw new Error(`uintValues must have exactly 16 values, got ${uintValues.length}`);
    }
    if (boolValues.length !== 5) {
      throw new Error(`boolValues must have exactly 5 values, got ${boolValues.length}`);
    }
    
    const [signer] = await hre.ethers.getSigners();
    const compConfigService = await hre.ethers.getContractAt(
      "IDSComplianceConfigurationService", 
      CONTRACT_ADDRESSES.compConfigService, 
      signer
    );
    
    console.log('🚀 Setting compliance rules using setAll()...');
    console.log(`🌐 Network: ${hre.network.name}`);
    console.log(`🔗 Chain ID: ${hre.network.config.chainId}`);
    console.log(`👤 Using signer: ${await signer.getAddress()}`);
    console.log(`📝 Contract: ${CONTRACT_ADDRESSES.compConfigService}`);
    
    // Get current values before setting new ones
    console.log('\n📊 Getting current compliance rules...');
    const [currentUintValues, currentBoolValues] = await compConfigService.getAll();
    
    // Display what will be set
    console.log('\n📊 UInt Values:');
    uintValues.forEach((value, index) => {
      const currentValue = currentUintValues[index];
      const changed = currentValue.toString() !== value.toString();
      console.log(`   [${index}] ${PARAMETER_NAMES.uintValues[index]}: ${currentValue} → ${value} ${changed ? '🔄' : '✅'}`);
    });
    
    console.log('\n🔘 Bool Values:');
    boolValues.forEach((value, index) => {
      const currentValue = currentBoolValues[index];
      const changed = currentValue !== value;
      console.log(`   [${index}] ${PARAMETER_NAMES.boolValues[index]}: ${currentValue} → ${value} ${changed ? '🔄' : '✅'}`);
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
      },
      countryCompliance: {
        mappings: countryCompliance,
        countries: Object.keys(countryCompliance)
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
      console.log('\n🔍 DRY RUN - No transactions will be executed');
      console.log(`📊 Summary: ${outputData.changes.uintChanges.length} uint changes, ${outputData.changes.boolChanges.length} bool changes`);
      
      // Show country compliance mappings that would be set
      const countries = Object.keys(countryCompliance);
      if (countries.length > 0) {
        console.log('\n🗺️  Country Compliance Mappings (would be set):');
        countries.forEach(country => {
          console.log(`   ${country}: ${countryCompliance[country]}`);
        });
      }
      
      console.log('✅ All compliance rules validated successfully!');
    } else {
      console.log('\n⏳ Executing setAll() transaction...');
      const tx = await compConfigService.setAll(uintValues, boolValues);
      console.log(`📝 Transaction submitted: ${tx.hash}`);
      
      // Set country compliance mappings if they exist
      const countries = Object.keys(countryCompliance);
      if (countries.length > 0) {
        console.log('\n⏳ Setting country compliance mappings...');
        const countryValues = countries.map(country => countryCompliance[country]);
        const countryTx = await compConfigService.setCountriesCompliance(countries, countryValues);
        console.log(`📝 Country compliance transaction submitted: ${countryTx.hash}`);
        
        const countryReceipt = await countryTx.wait();
        console.log(`✅ Country compliance transaction mined in block: ${countryReceipt.blockNumber}`);
        console.log(`⛽ Country compliance gas used: ${countryReceipt.gasUsed.toString()}`);
        
        // Display what was set
        console.log('\n🗺️  Country Compliance Mappings Set:');
        countries.forEach(country => {
          console.log(`   ${country}: ${countryCompliance[country]}`);
        });
      }
      
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
      
      console.log(`✅ Transaction mined in block: ${receipt.blockNumber}`);
      console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);
      
      // Verify the changes by getting the new values
      console.log('\n🔍 Verifying changes...');
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
      
      console.log(`✅ UInt values verified: ${outputData.verification.uintValues.verified}`);
      console.log(`✅ Bool values verified: ${outputData.verification.boolValues.verified}`);
      console.log('✅ All compliance rules set successfully!');
    }
    
    // Generate timestamp for consistent file naming
    const executionTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Save output file
    const outputFile = saveComplianceOutput(outputData, outputDir, executionTimestamp);
    console.log(`\n📁 Full compliance rules output saved to: ${outputFile}`);
    
    return outputData;
  });

// Export for use in other tasks (CONTRACT_ADDRESSES is internal only)
export { PARAMETER_NAMES };
