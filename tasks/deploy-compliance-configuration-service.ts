import { subtask } from 'hardhat/config';
import { printContractAddresses } from './utils/task.helper';

subtask('deploy-compliance-configuration-service', 'Deploy Compliance Configuration Service')
  .setAction(
    async (args, hre, run) => {
      const Service = await hre.ethers.getContractFactory('ComplianceConfigurationService');
      const service = await hre.upgrades.deployProxy(Service);
      await service.waitForDeployment();

      await printContractAddresses('Compliance Configuration Service', service, hre);
      return service;
    }
  );
