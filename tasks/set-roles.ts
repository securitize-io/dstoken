import { subtask, types } from 'hardhat/config';
import { DSConstants } from '../utils/globals';

subtask('set-roles', 'Set roles')
  .addParam('dsContracts', 'Json DS Contract Addresses', undefined, types.json, false)
  .setAction(
    async (args, hre, run) => {
      const { dsContracts } = args;

      console.log(`Granting issuer permissions to Token Issuer ${await dsContracts.tokenIssuer.getAddress()}`);
      await dsContracts.trustService.setRole(await dsContracts.tokenIssuer.getAddress(), DSConstants.roles.ISSUER);
      console.log(`Granting issuer permissions to Wallet Registrar`);
      await dsContracts.trustService.setRole(await dsContracts.walletRegistrar.getAddress(), DSConstants.roles.ISSUER);
      console.log(`Granting issuer permissions to Transaction Relayer`);
      await dsContracts.trustService.setRole(await dsContracts.transactionRelayer.getAddress(), DSConstants.roles.ISSUER);
      console.log(`Granting issuer permissions to Bulk Operator`);
      await dsContracts.trustService.setRole(await dsContracts.bulkOperator.getAddress(), DSConstants.roles.ISSUER);
    }
  );
