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
