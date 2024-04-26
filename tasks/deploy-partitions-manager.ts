import { subtask, types } from 'hardhat/config';
import { isPartitioned, printContractAddresses } from './utils/task.helper';

subtask('deploy-partitions-manager', 'Deploy Partitions Manager')
  .addParam('compliance', 'Compliance Type', 'REGULATED', types.string)
  .setAction(
    async (args, hre, run) => {
      if (!isPartitioned(args.compliance)) {
        return;
      }

      const Service = await hre.ethers.getContractFactory('PartitionsManager');
      const service = await hre.upgrades.deployProxy(Service);
      await service.waitForDeployment();

      return printContractAddresses('Partitions Manager', service, hre);
    }
  );
