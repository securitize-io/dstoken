import { subtask, types } from 'hardhat/config';
import { getComplianceContractName, getLockManagerContractName, printContractAddresses } from './utils/task.helper';

subtask('deploy-lock-manager', 'Deploy Lock Manager')
  .addParam('lock', 'Lock Type', 'INVESTOR', types.string)
  .setAction(
    async (args, hre, run) => {
      const lockManagerContractName = getLockManagerContractName(args.lockType);

      const Service = await hre.ethers.getContractFactory(lockManagerContractName);
      const service = await hre.upgrades.deployProxy(Service);
      await service.waitForDeployment();

      return printContractAddresses('Lock Manager', service, hre);
    }
  );
