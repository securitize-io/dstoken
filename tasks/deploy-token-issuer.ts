import { subtask } from 'hardhat/config';
import { printContractAddresses } from './utils/task.helper';

subtask('deploy-token-issuer', 'Deploy Token Issuer')
  .setAction(
    async (args, hre, run) => {
      const Service = await hre.ethers.getContractFactory('TokenIssuer');
      const service = await hre.upgrades.deployProxy(Service);
      await service.waitForDeployment();

      await printContractAddresses('Token Issuer', service, hre);
      return service;
    }
  );
