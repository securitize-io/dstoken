import { subtask, types } from 'hardhat/config';
import { getComplianceContractName, printContractAddresses } from './utils/task.helper';

subtask('deploy-compliance-service', 'Deploy Compliance Service')
  .addParam('compliance', 'Compliance Type', 'REGULATED', types.string)
  .setAction(
    async (args, hre, run) => {
      const libraries: Record<string, any> = {};
      if (args.compliance !== 'WHITELISTED' && args.compliance !== 'GLOBAL_WHITELISTED') {
        const ComplianceLib = await hre.ethers.getContractFactory('ComplianceServiceLibrary');
        const complianceLib = await ComplianceLib.deploy();

        libraries.ComplianceServiceLibrary = complianceLib;
      }

      const complianceContractName = getComplianceContractName(args.compliance);

      const Service = await hre.ethers.getContractFactory(complianceContractName, { libraries });

      const service = await hre.upgrades.deployProxy(
        Service,
        [],
        { kind: 'uups', unsafeAllow: [ 'external-library-linking' ] }
      );

      await service.waitForDeployment();

      await printContractAddresses('Compliance Service', service, hre);
      return service;
    }
  );
