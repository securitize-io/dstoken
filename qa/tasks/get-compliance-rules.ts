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

// Service IDs from DSConstants
const SERVICE_IDS = {
  COMPLIANCE_SERVICE: 8,
  COMPLIANCE_CONFIGURATION_SERVICE: 256
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

// Hardcoded countries to check
const COUNTRIES = ['US', 'EU', 'DE', 'FR', 'IT', 'ES', 'JP', 'UK'];

// Function to save compliance output
function saveComplianceOutput(outputData: any, outputDir: string, timestamp: string) {
  const filename = `get-compliance-rules+${timestamp}.json`;
  const filepath = path.join(outputDir, 'output', filename);
  
  fs.writeFileSync(filepath, JSON.stringify(outputData, null, 2));
  console.log(`📁 Compliance rules output saved to: ${filepath}`);
  return filepath;
}

task('get-compliance-rules', 'Get all compliance counters and limits')
  .addOptionalParam('outputDir', 'Directory to save output files', './qa/tasks', types.string)
  .setAction(async (args, hre) => {
    const { outputDir } = args;
    console.log('📊 Getting All Compliance Counters and Rules');
    console.log('='.repeat(80));
    console.log(`🌐 Network: ${hre.network.name}`);
    console.log(`🔗 Chain ID: ${hre.network.config.chainId}`);
    console.log(`🗺️  Countries to check: ${COUNTRIES.join(', ')}`);
    
    const [signer] = await hre.ethers.getSigners();
    console.log(`👤 Using signer: ${await signer.getAddress()}`);
    
    // Get DS Token contract
    const dsTokenAddress = CONTRACT_ADDRESSES.dsToken;
    console.log(`📝 DS Token: ${dsTokenAddress}`);
    const dsToken = await hre.ethers.getContractAt("DSToken", dsTokenAddress, signer);
    
    // Get service addresses dynamically
    console.log('\n🔍 Getting service addresses...');
    const complianceServiceAddress = await dsToken.getDSService(SERVICE_IDS.COMPLIANCE_SERVICE);
    const compConfigServiceAddress = await dsToken.getDSService(SERVICE_IDS.COMPLIANCE_CONFIGURATION_SERVICE);
    
    console.log(`📝 Compliance Service: ${complianceServiceAddress}`);
    console.log(`📝 Compliance Config Service: ${compConfigServiceAddress}`);
    
    // Connect to services
    const complianceService = await hre.ethers.getContractAt("ComplianceServiceRegulated", complianceServiceAddress, signer);
    const compConfigService = await hre.ethers.getContractAt("IDSComplianceConfigurationService", compConfigServiceAddress, signer);
    
    try {
      console.log('\n📊 Getting current counters...');
      
      // Get all counters
      const totalInvestorsCount = parseInt(await complianceService.getTotalInvestorsCount());
      const usTotalInvestorsCount = parseInt(await complianceService.getUSInvestorsCount());
      const accreditedInvestorsCount = parseInt(await complianceService.getAccreditedInvestorsCount());
      const usAccreditedInvestorsCount = parseInt(await complianceService.getUSAccreditedInvestorsCount());
      const jpTotalInvestorsCount = parseInt(await complianceService.getJPInvestorsCount());
      
      // Get EU retail investors counts for each country
      const euRetailInvestorsCounts: { [key: string]: number } = {};
      for (const country of COUNTRIES) {
        try {
          const count = await complianceService.getEURetailInvestorsCount(country);
          euRetailInvestorsCounts[country] = parseInt(count);
        } catch (error) {
          console.log(`⚠️  Could not get EU retail count for ${country}`);
          euRetailInvestorsCounts[country] = 0;
        }
      }
      
      console.log('📋 Getting compliance limits...');
      
      // Get all limits from compliance configuration service
      const [uintValues, boolValues] = await compConfigService.getAll();
      
      // Map uint and bool values to readable names
      const mappedUintValues: { [key: string]: number } = {};
      const mappedBoolValues: { [key: string]: boolean } = {};
      
      uintValues.forEach((value, index) => {
        if (PARAMETER_NAMES.uintValues[index]) {
          mappedUintValues[PARAMETER_NAMES.uintValues[index]] = parseInt(value);
        }
      });
      
      boolValues.forEach((value, index) => {
        if (PARAMETER_NAMES.boolValues[index]) {
          mappedBoolValues[PARAMETER_NAMES.boolValues[index]] = value;
        }
      });
      
      // Prepare output data
      const outputData = {
        metadata: {
          generatedAt: new Date().toISOString(),
          network: hre.network.name,
          chainId: hre.network.config.chainId,
          signer: await signer.getAddress(),
          dsTokenAddress,
          complianceServiceAddress,
          compConfigServiceAddress,
          countries: COUNTRIES
        },
        counters: {
          totalInvestorsCount,
          usTotalInvestorsCount,
          accreditedInvestorsCount,
          usAccreditedInvestorsCount,
          jpTotalInvestorsCount,
          euRetailInvestorsCounts
        },
        limits: {
          uintValues: uintValues.map(v => parseInt(v)),
          boolValues: boolValues,
          mapped: {
            uintValues: mappedUintValues,
            boolValues: mappedBoolValues
          }
        }
      };
      
      // Display results
      console.log('\n📊 CURRENT COUNTERS');
      console.log('='.repeat(50));
      console.log(`📈 Total Investors: ${totalInvestorsCount}`);
      console.log(`🇺🇸 US Investors: ${usTotalInvestorsCount}`);
      console.log(`⭐ Accredited Investors: ${accreditedInvestorsCount}`);
      console.log(`🇺🇸⭐ US Accredited Investors: ${usAccreditedInvestorsCount}`);
      console.log(`🇯🇵 JP Investors: ${jpTotalInvestorsCount}`);
      
      console.log('\n🗺️  EU RETAIL INVESTORS BY COUNTRY');
      console.log('='.repeat(50));
      for (const [country, count] of Object.entries(euRetailInvestorsCounts)) {
        console.log(`🇪🇺 ${country}: ${count}`);
      }
      
      console.log('\n📋 COMPLIANCE LIMITS (UINT VALUES)');
      console.log('='.repeat(50));
      uintValues.forEach((value, index) => {
        const name = PARAMETER_NAMES.uintValues[index] || `Unknown[${index}]`;
        console.log(`   [${index}] ${name}: ${value}`);
      });
      
      console.log('\n🔘 COMPLIANCE RULES (BOOL VALUES)');
      console.log('='.repeat(50));
      boolValues.forEach((value, index) => {
        const name = PARAMETER_NAMES.boolValues[index] || `Unknown[${index}]`;
        console.log(`   [${index}] ${name}: ${value}`);
      });
      
      // Generate timestamp for consistent file naming
      const executionTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      // Save JSON output to qa/output folder
      const jsonFile = saveComplianceOutput(outputData, outputDir, executionTimestamp);
      
      console.log(`\n📁 Full compliance rules data saved to: ${jsonFile}`);
      
      return outputData;
      
    } catch (error) {
      console.error('❌ Error getting compliance rules:', error);
      throw error;
    }
  });

// Export for use in other tasks (CONTRACT_ADDRESSES is internal only)
export { SERVICE_IDS };
