import { task, types } from "hardhat/config";
import * as fs from "fs";
import * as path from "path";

// Contract addresses (auto-updated from deployment)
const CONTRACT_ADDRESSES = {
  compConfigService: "0x5EFae3f89f57c28Ccbf19366d161D44630D91873",
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

// Compliance constants
const COMPLIANCE_VALUES = {
  NONE: 0,
  US: 1,
  EU: 2,
  FORBIDDEN: 4,
  JP: 8
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
    const countryCompliance = complianceData.countryCompliance || {};
    
    // Validate array lengths
    if (uintValues.length !== 16) {
      throw new Error(`uintValues must have exactly 16 values, got ${uintValues.length}`);
    }
    if (boolValues.length !== 5) {
      throw new Error(`boolValues must have exactly 5 values, got ${boolValues.length}`);
    }
    
    // Validate country compliance values
    const validValues = Object.values(COMPLIANCE_VALUES);
    for (const [country, value] of Object.entries(countryCompliance)) {
      if (!validValues.includes(value as number)) {
        throw new Error(`Invalid compliance value ${value} for country ${country}. Valid values: ${validValues.join(', ')}`);
      }
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
    uintValues.forEach((value: any, index: number) => {
      const currentValue = currentUintValues[index];
      const changed = currentValue.toString() !== value.toString();
      console.log(`   [${index}] ${PARAMETER_NAMES.uintValues[index]}: ${currentValue} → ${value} ${changed ? '🔄' : '✅'}`);
    });
    
    console.log('\n🔘 Bool Values:');
    boolValues.forEach((value: any, index: number) => {
      const currentValue = currentBoolValues[index];
      const changed = currentValue !== value;
      console.log(`   [${index}] ${PARAMETER_NAMES.boolValues[index]}: ${currentValue} → ${value} ${changed ? '🔄' : '✅'}`);
    });
    
    // Display country compliance if provided
    if (Object.keys(countryCompliance).length > 0) {
      console.log('\n🌍 Country Compliance:');
      for (const [country, value] of Object.entries(countryCompliance)) {
        const currentValue = await compConfigService.getCountryCompliance(country);
        const changed = currentValue.toString() !== (value as number).toString();
        const complianceName = Object.keys(COMPLIANCE_VALUES).find(key => COMPLIANCE_VALUES[key as keyof typeof COMPLIANCE_VALUES] === value) || 'UNKNOWN';
        console.log(`   ${country}: ${currentValue} → ${value} (${complianceName}) ${changed ? '🔄' : '✅'}`);
      }
    }
    
    // Prepare output data
    const outputData: any = {
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
        hash: null as any,
        blockNumber: null as any,
        gasUsed: null as any,
        gasPrice: null as any,
        timestamp: null as any
      } as any,
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
        },
        countryCompliance: {
          values: countryCompliance,
          changes: []
        }
      },
      changes: {
        uintChanges: [],
        boolChanges: [],
        countryChanges: []
      }
    };
    
    // Map values to names for easier reading
    uintValues.forEach((value: any, index: number) => {
      outputData.complianceRules.uintValues.mapped[PARAMETER_NAMES.uintValues[index]] = value;
    });
    
    boolValues.forEach((value: any, index: number) => {
      outputData.complianceRules.boolValues.mapped[PARAMETER_NAMES.boolValues[index]] = value;
    });
    
    // Track changes
    uintValues.forEach((value: any, index: number) => {
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
    
    boolValues.forEach((value: any, index: number) => {
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
    
    // Track country compliance changes
    for (const [country, value] of Object.entries(countryCompliance)) {
      const currentValue = await compConfigService.getCountryCompliance(country);
      if (currentValue.toString() !== (value as number).toString()) {
        const complianceName = Object.keys(COMPLIANCE_VALUES).find(key => COMPLIANCE_VALUES[key as keyof typeof COMPLIANCE_VALUES] === value) || 'UNKNOWN';
        outputData.changes.countryChanges.push({
          country,
          from: currentValue.toString(),
          to: (value as number).toString(),
          complianceName
        });
      }
    }
    
    if (dryrun) {
      console.log('\n🔍 DRY RUN - No transactions will be executed');
      console.log(`📊 Summary: ${outputData.changes.uintChanges.length} uint changes, ${outputData.changes.boolChanges.length} bool changes, ${outputData.changes.countryChanges.length} country changes`);
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
      
      // Execute country compliance if provided
      if (Object.keys(countryCompliance).length > 0) {
        console.log('\n🌍 Setting country compliance...');
        const countries = Object.keys(countryCompliance);
        const values = Object.values(countryCompliance) as number[];
        
        const countryTx = await compConfigService.setCountriesCompliance(countries, values);
        console.log(`📝 Country compliance transaction submitted: ${countryTx.hash}`);
        
        const countryReceipt = await countryTx.wait();
        console.log(`✅ Country compliance transaction mined in block: ${countryReceipt.blockNumber}`);
        console.log(`⛽ Gas used: ${countryReceipt.gasUsed.toString()}`);
        
        // Update output data with country compliance transaction info
        outputData.transaction.countryCompliance = {
          hash: countryTx.hash,
          blockNumber: countryReceipt.blockNumber,
          gasUsed: countryReceipt.gasUsed.toString(),
          gasPrice: countryTx.gasPrice?.toString() || '0',
          timestamp: new Date().toISOString()
        };
      }
      
      // Verify the changes by getting the new values
      console.log('\n🔍 Verifying changes...');
      const [newUintValues, newBoolValues] = await compConfigService.getAll();
      
      // Add verification to output
      outputData.verification = {
        uintValues: {
          expected: uintValues,
          actual: newUintValues.map((v: any) => v.toString()),
          verified: uintValues.every((v: any, i: number) => v.toString() === newUintValues[i].toString())
        },
        boolValues: {
          expected: boolValues,
          actual: newBoolValues,
          verified: boolValues.every((v: any, i: number) => v === newBoolValues[i])
        },
        countryCompliance: {}
      };
      
      // Verify country compliance
      for (const [country, expectedValue] of Object.entries(countryCompliance)) {
        const actualValue = await compConfigService.getCountryCompliance(country);
        const verified = actualValue.toString() === (expectedValue as number).toString();
        outputData.verification.countryCompliance[country] = {
          expected: expectedValue as number,
          actual: actualValue.toString(),
          verified
        };
      }
      
      console.log(`✅ UInt values verified: ${outputData.verification.uintValues.verified}`);
      console.log(`✅ Bool values verified: ${outputData.verification.boolValues.verified}`);
      console.log(`✅ Country compliance verified: ${Object.values(outputData.verification.countryCompliance).every((v: any) => v.verified)}`);
      console.log('✅ All compliance rules set successfully!');
    }
    
    // Save output file
    const outputFile = saveComplianceOutput(outputData, outputDir);
    console.log(`\n📁 Full compliance rules output saved to: ${outputFile}`);
    
    return outputData;
  });

// Export for use in other tasks
export { CONTRACT_ADDRESSES, PARAMETER_NAMES };
