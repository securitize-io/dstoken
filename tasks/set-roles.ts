import { subtask, types } from 'hardhat/config';
import { printContractAddresses } from './utils/task.helper';

subtask('deploy-trust-service', 'Deploy Trust Service')
  .addParam('trustServiceAddress', 'Trust Service address', undefined, types.string, false)
  .addParam('tokenIssuerAddress', 'Token Issuer address', undefined, types.string, false)
  .addParam('walletRegistrarAddress', 'Wallet Registrar address', undefined, types.string, false)
  .addParam('omnibusTBEControllerAddress', 'Omnibus TBE Controller address', undefined, types.string, false)
  .addParam('transactionRelayerAddress', 'Transaction Relayer address', undefined, types.string, false)
  .addParam('tokenReallocatorAddress', 'Trust Service address', undefined, types.json, false)
  .setAction(
    async (args, hre, run) => {
      const Service = await hre.ethers.getContractFactory('TrustService');
      const service = await hre.upgrades.deployProxy(Service);
      await service.waitForDeployment();

      return printContractAddresses('Trust Service', service, hre);
    }
  );
