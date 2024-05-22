import { subtask } from 'hardhat/config';
import { printContractAddresses } from './utils/task.helper';

subtask('deploy-wallet-manager', 'Deploy Wallet Manager')
  .setAction(
    async (args, hre, run) => {
      const Service = await hre.ethers.getContractFactory('WalletManager');
      const service = await hre.upgrades.deployProxy(Service);
      await service.waitForDeployment();

      await printContractAddresses('Wallet Manager', service, hre);
      return service;
    }
  );
