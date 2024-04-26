import { subtask } from 'hardhat/config';
import { printContractAddresses } from './utils/task.helper';

subtask('deploy-transaction-relayer', 'Deploy Transaction Relayer')
  .setAction(
    async (args, hre, run) => {
      const Service = await hre.ethers.getContractFactory('TransactionRelayer');
      const service = await hre.upgrades.deployProxy(Service);
      await service.waitForDeployment();

      return printContractAddresses('Transaction Relayer', service, hre);
    }
  );
