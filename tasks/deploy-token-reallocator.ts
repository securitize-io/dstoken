import { subtask } from 'hardhat/config';
import { printContractAddresses } from './utils/task.helper';

subtask('deploy-token-reallocator', 'Deploy Token Reallocator')
  .setAction(
    async (args, hre, run) => {
      const Service = await hre.ethers.getContractFactory('TokenReallocator');
      const service = await hre.upgrades.deployProxy(Service);
      await service.waitForDeployment();

      await printContractAddresses('Token Reallocator', service, hre);
      return service;
    }
  );
