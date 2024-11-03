import { subtask } from 'hardhat/config';
import { printContractAddresses } from './utils/task.helper';

subtask('deploy-issuer-multicall', 'Deploy Issuer Multi Call')
  .setAction(
    async (args, hre, run) => {
      const Service = await hre.ethers.getContractFactory('IssuerMulticall');
      const service = await hre.upgrades.deployProxy(Service);
      await service.waitForDeployment();

      await printContractAddresses('Issuer Multi Call', service, hre);
      return service;
    }
  );
