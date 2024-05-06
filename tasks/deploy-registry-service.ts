import { subtask } from 'hardhat/config';
import { printContractAddresses } from './utils/task.helper';

subtask('deploy-registry-service', 'Deploy Registry Service')
  .setAction(
    async (args, hre, run) => {
      const Service = await hre.ethers.getContractFactory('RegistryService');
      const service = await hre.upgrades.deployProxy(Service);
      await service.waitForDeployment();

      await printContractAddresses('Registry Service', service, hre);
      return service;
    }
  );
