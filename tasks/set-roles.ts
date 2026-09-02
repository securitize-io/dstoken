import { subtask, types } from 'hardhat/config';
import { DSConstants } from '../utils/globals';

subtask('set-roles', 'Set roles')
  .addParam('dsContracts', 'Json DS Contract Addresses', undefined, types.json, false)
  .setAction(
    async (args) => {
      const { dsContracts } = args;

      console.log(`Granting issuer permissions to Token Issuer ${await dsContracts.tokenIssuer.getAddress()}`);
      let tx = await dsContracts.trustService.setRole(await dsContracts.tokenIssuer.getAddress(), DSConstants.roles.ISSUER);
      await tx.wait();
      // EXCHANGE, not ISSUER: the registrar's only downstream call is
      // RegistryService::updateInvestor, which is onlyExchangeOrAbove. ISSUER would additionally
      // authorize DSToken::burn (onlyIssuerOrTransferAgentOrAbove), and this proxy is owned by the
      // wallet syncer rather than the master timelock, so that key would keep an instant burn path.
      console.log(`Granting exchange permissions to Wallet Registrar`);
      tx = await dsContracts.trustService.setRole(await dsContracts.walletRegistrar.getAddress(), DSConstants.roles.EXCHANGE);
      await tx.wait();
      console.log(`Granting exchange permissions to Transaction Relayer`);
      tx = await dsContracts.trustService.setRole(await dsContracts.transactionRelayer.getAddress(), DSConstants.roles.EXCHANGE);
      await tx.wait();
      console.log(`Granting issuer permissions to Bulk Operator`);
      tx = await dsContracts.trustService.setRole(await dsContracts.bulkOperator.getAddress(), DSConstants.roles.ISSUER);
      await tx.wait();
    }
  );
