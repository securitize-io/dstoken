import { task, types } from "hardhat/config";
import * as fs from "fs";
import * as path from "path";

// Contract addresses (auto-updated from deployment)
const CONTRACT_ADDRESSES = {
  regService: "0x48B659E52082f59150fF7C04d56bdaA10096e06a",
  trustService: "0x81828Ee6D5cf26E6608d514c0eBE772CCF060A2c",
  compConfigService: "0x23B54eC18110f325079D83d8BF72Ca5524dD9f92",
  compService: "0x3B1685D38BCA0D99e62deCe68b399A6C42eA45b8",
  walletManager: "0x5Ba6C13F47e11beF5392d0cB8025b6967173bDbb",
  lockManager: "0x940Db9941e17e2229f03ebD28e1A672b1f1e425b",
  tokenIssuer: "0x03725C73A7B958d6df41C57A8226bA18a9D78D5b",
  walletRegistrar: "0x871dB8005F86F7733645910A421aFb9f39C1D366",
  transactionRelayer: "0x4D0EB693957Fd0db4a6817c26E5eD5F1AFE1f790",
  bulkOperator: "0x3cAf3a0e7656015b9D50A694a4c60aEF0AC395DE",
  rebasingProvider: "0xe920FCFcae40ff8F25e6ACfF1ddcF7E38D02cd74",
  mockToken: "0x712d7d168Da017Fe46759B60B6a347EE2DdDEA92",
  dsToken: "0x73D0b1CD6439578882FC30fe658c87D8927C79aF"
};;;;;;;;;;;;;

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
