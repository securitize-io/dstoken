import { task, types } from "hardhat/config";
import * as fs from "fs";
import * as path from "path";

// Contract addresses (auto-updated from deployment)
const CONTRACT_ADDRESSES = {
  regService: "0x193f890709A2005355460964fa31a3DF0c507802",
  trustService: "0x21c2A2D08bF7ad46137950bb5BfFd077DB7b8dC4",
  compConfigService: "0x61393fdA654F00D771822436e64091eCA64e4042",
  compService: "0xe0625E49720bC93Efe9927F9cC50B658d6708156",
  walletManager: "0x619Fec23873cc6850671EE405cB7f3480C1D6775",
  lockManager: "0x191B40369C87F2F664F945ce6dCe7fB4d28f2BC6",
  tokenIssuer: "0x7e9f4a2f4FF3C8438aD90b99cEC7d21E35a8ff0C",
  walletRegistrar: "0x456357A72DD81D7AA04AdA9cC5fff36E8fF36875",
  transactionRelayer: "0x906B6070d1C1070Cb5d8a12e51974CD38b885C31",
  bulkOperator: "0x5Bc0e6225d87Ea16A47B7Ae1d9EFF201C1003F2A",
  rebasingProvider: "0x7D17B28db440Dc6193b9a4a37C90289bD311588E",
  mockToken: "0x1928ee97f02Ac0197cD8901c4e61afb2101cE1dC",
  dsToken: "0xc1A5333f5668280506802fd7be291a9A60960B60"
};;

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
  .addOptionalParam('outputDir', 'Directory to save output files', './scripts', types.string)
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
      
      // Save JSON output to scripts/output folder
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
