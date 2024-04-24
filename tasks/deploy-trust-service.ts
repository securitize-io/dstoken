import { subtask } from 'hardhat/config';
import { printContractAddresses } from './utils/task.helper';

subtask('deploy-trust-service', 'Deploy Trust Service')
  .setAction(
    async (args, hre, run) => {
      const Service = await hre.ethers.getContractFactory('TrustService');
      const service = await hre.upgrades.deployProxy(Service);
      await service.waitForDeployment();

      return printContractAddresses('Trust Service', service, hre);
    }
  );
