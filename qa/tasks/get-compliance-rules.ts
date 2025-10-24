import { task, types } from "hardhat/config";
import * as fs from "fs";
import * as path from "path";

// Contract addresses (auto-updated from deployment)
const CONTRACT_ADDRESSES = {
  regService: "0x472c1AbE5e54e56480f78C96bF05436B3ACF4606",
  trustService: "0xDC06cdD538F4E5A08F6009011EBa941d1d16e869",
  compConfigService: "0xAB6257058319aeF98E19680DDFfc748F7a387313",
  compService: "0x389629Fd1f3BDDC051d9458E0B043606928D24D1",
  walletManager: "0xb1916a151Ad7ecEA8c62b8aF5a2505b0EFC9A6C3",
  lockManager: "0x9B79cf4F3D56e87837B9434b09EdF5972e82eB4b",
  tokenIssuer: "0x263b1B606C40bdA91966F5723CB8D9DdF26eA6C6",
  walletRegistrar: "0x36dfD20EAD02ed688a6Bf9e8F73F21932D1C321b",
  transactionRelayer: "0xa05474C1Bfd5006dAC55384b6E1dFFB9413FfdCB",
  bulkOperator: "0xe3F0B5a7c70B006D41c06f3F3f8735B8Fc15e73f",
  rebasingProvider: "0x15eaaC206Dfe731664Ef1dE25bCD139b7C01D52d",
  mockToken: "0x42b2c2bc9d97de30bCe0f06327655C5988D9c982",
  dsToken: "0xbA5a5EFDf79F63B5cD413AC88daf7251B29cA5EB"
};;;;;;;;;;;;;;

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
