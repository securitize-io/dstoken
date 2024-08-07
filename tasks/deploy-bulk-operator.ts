import { subtask, types } from 'hardhat/config';
import { printContractAddresses } from './utils/task.helper';

subtask('deploy-bulk-operator', 'Deploy Bulk Operator')
  .addParam('dsToken', 'DS Token Address', '', types.string)
  .setAction(
    async (args, hre, run) => {
      const Service = await hre.ethers.getContractFactory('BulkOperator');
      const service = await hre.upgrades.deployProxy(Service,
        [args.dsToken]);

      await service.waitForDeployment();
      await printContractAddresses('Bulk Operator', service, hre);
      return service;
    },
  );
