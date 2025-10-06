import { task, types } from "hardhat/config";
import * as fs from "fs";
import * as path from "path";

// Contract addresses (auto-updated from deployment)
const CONTRACT_ADDRESSES = {
  compConfigService: "0x17a3a58a849Da2996191758e43C9adaa0b7405E9",
};

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
function saveComplianceOutput(outputData: any, outputDir: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `compliance-rules-${timestamp}.json`;
  const filepath = path.join(outputDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(outputData, null, 2));
  console.log(`📁 Compliance rules output saved to: ${filepath}`);
  return filepath;
}

task('set-compliance-rules', 'Set all compliance rules from JSON file using setAll()')
  .addPositionalParam('file', 'Path to compliance rules JSON file', undefined, types.string)
  .addFlag('dryrun', 'Show what would be set without executing')
  .addOptionalParam('outputDir', 'Directory to save output JSON', './scripts', types.string)
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
      console.log('✅ All compliance rules validated successfully!');
    } else {
      console.log('\n⏳ Executing setAll() transaction...');
      const tx = await compConfigService.setAll(uintValues, boolValues);
      console.log(`📝 Transaction submitted: ${tx.hash}`);
      
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
    
    // Save output file
    const outputFile = saveComplianceOutput(outputData, outputDir);
    console.log(`\n📁 Full compliance rules output saved to: ${outputFile}`);
    
    return outputData;
  });

// Export for use in other tasks
export { CONTRACT_ADDRESSES, PARAMETER_NAMES };
