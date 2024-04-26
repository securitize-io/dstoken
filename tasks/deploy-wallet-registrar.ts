import { subtask } from 'hardhat/config';
import { printContractAddresses } from './utils/task.helper';

subtask('deploy-wallet-registrar', 'Deploy Wallet Registrar')
  .setAction(
    async (args, hre, run) => {
      const Service = await hre.ethers.getContractFactory('WalletRegistrar');
      const service = await hre.upgrades.deployProxy(Service);
      await service.waitForDeployment();

      return printContractAddresses('Wallet Registrar', service, hre);
    }
  );
