import { subtask, types } from 'hardhat/config';
import { getComplianceContractName, printContractAddresses } from './utils/task.helper';

subtask('deploy-compliance-service', 'Deploy Compliance Service')
  .addParam('compliance', 'Compliance Type', 'REGULATED', types.string)
  .setAction(
    async (args, hre, run) => {
      const ComplianceLib = await hre.ethers.getContractFactory('ComplianceServiceLibrary');
      const complianceLib = await ComplianceLib.deploy();

      const libraries = { ComplianceServiceLibrary: complianceLib};

      if (args.compliance === 'PARTITIONED') {
        const CompliancePartitionedLib = await hre.ethers.getContractFactory('ComplianceServicePartitionedLibrary');
        const compliancePartitionedLib = await CompliancePartitionedLib.deploy();
        libraries.ComplianceServicePartitionedLibrary = compliancePartitionedLib;
      }

      const complianceContractName = getComplianceContractName(args.compliance);

      const Service = await hre.ethers.getContractFactory(complianceContractName, {
        libraries
      });

      const service = await hre.upgrades.deployProxy(
        Service,
        [],
        { kind: 'uups', unsafeAllow: [ 'external-library-linking' ] }
      );

      await service.waitForDeployment();

      return printContractAddresses('Compliance Service', service, hre);
    }
  );
