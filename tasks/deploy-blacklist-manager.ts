import { subtask } from 'hardhat/config';
import { printContractAddresses } from './utils/task.helper';

subtask('deploy-blacklist-manager', 'Deploy Blacklist Manager')
  .setAction(
    async (_, hre) => {
      const Service = await hre.ethers.getContractFactory('BlackListManager');
      const service = await hre.upgrades.deployProxy(Service);
      await service.waitForDeployment();

      await printContractAddresses('Blacklist Manager', service, hre);
      return service;
    }
  );