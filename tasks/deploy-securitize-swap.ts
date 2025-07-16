import { subtask, types } from 'hardhat/config';
import { printContractAddresses } from './utils/task.helper';
import { ethers } from 'ethers';

subtask('deploy-securitize-swap', 'Deploy Securitize Swap')
  .addParam('dsToken', 'DS Token Address', '', types.string)
  .addParam('stableCoin', 'Stable coin', '', types.string)
  .addParam('navProvider', 'NAV price provides', '', types.string, true)
  .addParam('issuerWallet', 'Issuer wallet', '', types.string)
  .setAction(
    async (args, hre, run) => {
      const Service = await hre.ethers.getContractFactory('SecuritizeSwap');
      const service = await hre.upgrades.deployProxy(Service,
        [args.dsToken, args.stableCoin, args.navProvider, args.issuerWallet, 0, ethers.ZeroAddress]);

      await service.waitForDeployment();
      await printContractAddresses('Securitize Swap', service, hre);
      return service;
    },
  );
