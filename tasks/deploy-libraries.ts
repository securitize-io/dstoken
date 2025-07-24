import { task, types } from 'hardhat/config';

task('deploy-libraries', 'Deploy DS Protocol libraries')
  .setAction(
    async (args, hre, run) => {
      console.log('Deploying libraries');
      
      console.log('ComplianceServiceLibrary...');
      const ComplianceLib = await hre.ethers.getContractFactory(
        'ComplianceServiceLibrary',
      );
      const complianceLib = await ComplianceLib.deploy();
      console.log(`ComplianceServiceLibrary deployed at: ${complianceLib.target}`);

      console.log('TokenLibrary...');
      const TokenLibrary = await hre.ethers.getContractFactory(
        'TokenLibrary',
      );
      const tokenLibrary = await TokenLibrary.deploy();
      console.log(`TokenLibrary deployed at: ${tokenLibrary.target}`);
    });
