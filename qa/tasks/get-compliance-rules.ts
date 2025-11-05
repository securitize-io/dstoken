import { task, types } from "hardhat/config";
import * as fs from "fs";
import * as path from "path";

// Contract addresses (auto-updated from deployment)
const CONTRACT_ADDRESSES = {
  regService: "0x65A4DFB4d27462118E2044916B776DDEfFd54e7d",
  trustService: "0xD13F9A8be57432a6C7bB4E7D7351D2192139995F",
  compConfigService: "0xBe27CafcE28E91048B9F5fD06b6756B75b24223E",
  compService: "0x1B1eA586261fD2343C8979BD125c25FeE8D68818",
  walletManager: "0xC116ca3A929D787F55bd94CC5280dE7719CE2FBF",
  lockManager: "0x1b71363Ed7C444A46413cb7E47FF9CBf5d9C1CaE",
  tokenIssuer: "0x00eF3496B86AB81497e84706082eDbF4a61B1D4b",
  walletRegistrar: "0xEE4ce6faD4c2Ff09b426b68861339C2214C64CeE",
  transactionRelayer: "0x77fBfB85848D6aDddb3142fE7dD0f74B722f9028",
  bulkOperator: "0x7c8140B825E3Dc0Da6f23e320e5E591501D4F02a",
  rebasingProvider: "0xFa642C8D2053a54e71bACbDec215bf3b497B99AD",
  mockToken: "0xB39619F934a4ABEA17c83e91192C17D73c380c79",
  dsToken: "0x696636c032cCBb81932d9aeB176992CfAf264d32"
};;;;;;;;;;;;;;;

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
