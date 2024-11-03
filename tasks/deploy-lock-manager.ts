import { subtask, types } from 'hardhat/config';
import { getLockManagerContractName, printContractAddresses } from './utils/task.helper';

subtask('deploy-lock-manager', 'Deploy Lock Manager')
  .addParam('compliance', 'Compliance Type', 'REGULATED', types.string)
  .setAction(
    async (args, hre, run) => {
      const lockManagerContractName = getLockManagerContractName(args.compliance);

      const Service = await hre.ethers.getContractFactory(lockManagerContractName);
      const service = await hre.upgrades.deployProxy(Service);
      await service.waitForDeployment();

      await printContractAddresses('Lock Manager', service, hre);
      return service;
    }
  );
