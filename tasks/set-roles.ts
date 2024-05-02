import { subtask, types } from 'hardhat/config';
import { DSConstants } from '../utils/globals';

subtask('set-roles', 'Set roles')
  .addParam('trustServiceAddress', 'Trust Service address', undefined, types.string, false)
  .addParam('tokenIssuerAddress', 'Token Issuer address', undefined, types.string, false)
  .addParam('walletRegistrarAddress', 'Wallet Registrar address', undefined, types.string, false)
  .addParam('omnibusTBEControllerAddress', 'Omnibus TBE Controller address', undefined, types.string, false)
  .addParam('transactionRelayerAddress', 'Transaction Relayer address', undefined, types.string, false)
  .addParam('tokenReallocatorAddress', 'Token Reallocator address', undefined, types.json, false)
  .setAction(
    async (args, hre, run) => {
      console.log(`Initializing Trust Service at: ${args.trustServiceAddress}`);
      const trustService = await hre.ethers.getContractAt('IDSTrustService', args.trustServiceAddress);

      console.log(`Granting issuer permissions to Token Issuer`);
      await trustService.setRole(args.tokenIssuerAddress, DSConstants.roles.ISSUER);
      console.log(`Granting issuer permissions to Wallet Registrar`);
      await trustService.setRole(args.walletRegistrarAddress, DSConstants.roles.ISSUER);
      console.log(`Granting issuer permissions to Omnibus TBE Controller`);
      await trustService.setRole(args.omnibusTBEControllerAddress, DSConstants.roles.ISSUER);
      console.log(`Granting issuer permissions to Transaction Relayer`);
      await trustService.setRole(args.transactionRelayerAddress, DSConstants.roles.ISSUER);
      console.log(`Granting issuer permissions to Token Reallocator`);
      await trustService.setRole(args.tokenReallocatorAddress, DSConstants.roles.ISSUER);
    }
  );
