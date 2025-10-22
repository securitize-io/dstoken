import { subtask, types } from 'hardhat/config';
import { DSConstants } from '../utils/globals';

subtask('set-services', 'Set DS Services')
  .addParam('dsContracts', 'Json DS Contract Addresses', undefined, types.json, false)
  .addOptionalParam('isGRS', 'Is Global Registry', false, types.boolean)
  .setAction(
    async (args) => {
      const { dsContracts, isGRS } = args;
      const {
        dsToken,
        trustService,
        registryService,
        complianceService,
        walletManager,
        lockManager,
        complianceConfigurationService,
        tokenIssuer,
        walletRegistrar,
        transactionRelayer,
        bulkOperator,
        rebasingProvider,
        blacklistManager,
      } = dsContracts;

      // Token
      console.log('Connecting token to registry');
      let tx = await dsToken.setDSService(DSConstants.services.REGISTRY_SERVICE, registryService.getAddress());
      await tx.wait();
      console.log('Connecting token to token issuer');
      tx = await dsToken.setDSService(DSConstants.services.TOKEN_ISSUER, tokenIssuer.getAddress());
      await tx.wait();
      console.log('Connecting token to wallet registrar');
      tx = await dsToken.setDSService(DSConstants.services.WALLET_REGISTRAR, walletRegistrar.getAddress());
      await tx.wait();
      console.log('Connecting token to trust service');
      tx = await dsToken.setDSService(DSConstants.services.TRUST_SERVICE, trustService.getAddress());
      await tx.wait();
      console.log('Connecting token to compliance service');
      tx = await dsToken.setDSService(DSConstants.services.COMPLIANCE_SERVICE, complianceService.getAddress());
      await tx.wait();
      console.log('Connecting token to compliance configuration service');
      tx = await dsToken.setDSService(DSConstants.services.COMPLIANCE_CONFIGURATION_SERVICE, complianceConfigurationService.getAddress());
      await tx.wait();
      console.log('Connecting token to wallet manager');
      tx = await dsToken.setDSService(DSConstants.services.WALLET_MANAGER, walletManager.getAddress());
      await tx.wait();
      console.log('Connecting token to lock manager');
      tx = await dsToken.setDSService(DSConstants.services.LOCK_MANAGER, lockManager.getAddress());
      await tx.wait();
      console.log('Connecting token to transaction relayer');
      tx = await dsToken.setDSService(DSConstants.services.TRANSACTION_RELAYER, transactionRelayer.getAddress());
      await tx.wait();
      console.log('Connecting token to rebasing provider');
      tx = await dsToken.setDSService(DSConstants.services.REBASING_PROVIDER, rebasingProvider.getAddress());
      await tx.wait();
      console.log('Connecting token to blacklist manager');
      tx = await dsToken.setDSService(DSConstants.services.BLACKLIST_MANAGER, blacklistManager.getAddress());
      await tx.wait();

      // Registry Service, only if not GRS (Global Registry Service)
      if (!isGRS) {
        console.log('Connecting registry service to trust service');
        tx = await registryService.setDSService(DSConstants.services.TRUST_SERVICE, trustService.getAddress());
        await tx.wait();
        console.log('Connecting registry service to token');
        tx = await registryService.setDSService(DSConstants.services.DS_TOKEN, dsToken.getAddress());
        await tx.wait();
        console.log('Connecting registry service to wallet manager');
        tx = await registryService.setDSService(DSConstants.services.WALLET_MANAGER, walletManager.getAddress());
        await tx.wait();
        console.log('Connecting registry service to compliance services');
        tx = await registryService.setDSService(DSConstants.services.COMPLIANCE_SERVICE, complianceService.getAddress());
        await tx.wait();
      } else {
        console.log('Skipping registry service connections because this is a GRS setup');
      }

      // Compliance Configuration Service
      console.log('Connecting compliance configuration to trust service');
      tx = await complianceConfigurationService.setDSService(DSConstants.services.TRUST_SERVICE, trustService.getAddress());
      await tx.wait();

      // Compliance Service
      console.log('Connecting compliance service to trust service');
      tx = await complianceService.setDSService(DSConstants.services.TRUST_SERVICE, trustService.getAddress());
      await tx.wait();
      console.log('Connecting compliance service to compliance configuration service');
      tx = await complianceService.setDSService(DSConstants.services.COMPLIANCE_CONFIGURATION_SERVICE, complianceConfigurationService.getAddress());
      await tx.wait();
      console.log('Connecting compliance service to wallet manager');
      tx = await complianceService.setDSService(DSConstants.services.WALLET_MANAGER, walletManager.getAddress());
      await tx.wait();
      console.log('Connecting compliance service to lock manager');
      tx = await complianceService.setDSService(DSConstants.services.LOCK_MANAGER, lockManager.getAddress());
      await tx.wait();
      console.log('Connecting compliance service to token');
      tx = await complianceService.setDSService(DSConstants.services.DS_TOKEN, dsToken.getAddress());
      await tx.wait();
      console.log('Connecting compliance service to registry');
      tx = await complianceService.setDSService(DSConstants.services.REGISTRY_SERVICE, registryService.getAddress());
      await tx.wait();
      console.log('Connecting compliance service to rebasing provider');
      tx = await complianceService.setDSService(DSConstants.services.REBASING_PROVIDER, rebasingProvider.getAddress());
      await tx.wait();
      console.log('Connecting compliance service to blacklist manager');
      tx = await complianceService.setDSService(DSConstants.services.BLACKLIST_MANAGER, blacklistManager.getAddress());
      await tx.wait();

      // Lock Manager
      console.log('Connecting lock manager to trust service');
      tx = await lockManager.setDSService(DSConstants.services.TRUST_SERVICE, trustService.getAddress());
      await tx.wait();
      console.log('Connecting lock manager to token');
      tx = await lockManager.setDSService(DSConstants.services.DS_TOKEN, dsToken.getAddress());
      await tx.wait();
      console.log('Connecting lock manager to compliance registry service');
      tx = await lockManager.setDSService(DSConstants.services.REGISTRY_SERVICE, registryService.getAddress());
      await tx.wait();
      console.log('Connecting lock manager to compliance service');
      tx = await lockManager.setDSService(DSConstants.services.COMPLIANCE_SERVICE, complianceService.getAddress());
      await tx.wait();

      // Token Issuer
      console.log('Connecting token issuer to trust service');
      tx = await tokenIssuer.setDSService(DSConstants.services.TRUST_SERVICE, trustService.getAddress());
      await tx.wait();
      console.log('Connecting token issuer to token');
      tx = await tokenIssuer.setDSService(DSConstants.services.DS_TOKEN, dsToken.getAddress());
      await tx.wait();
      console.log('Connecting token issuer to registry service');
      tx = await tokenIssuer.setDSService(DSConstants.services.REGISTRY_SERVICE, registryService.getAddress());
      await tx.wait();
      console.log('Connecting token issuer to lock manager');
      tx = await tokenIssuer.setDSService(DSConstants.services.LOCK_MANAGER, lockManager.getAddress());
      await tx.wait();

      // Wallet Registrar
      console.log('Connecting wallet registrar to trust service');
      tx = await walletRegistrar.setDSService(DSConstants.services.TRUST_SERVICE, trustService.getAddress());
      await tx.wait();
      console.log('Connecting wallet registrar to registry service');
      tx = await walletRegistrar.setDSService(DSConstants.services.REGISTRY_SERVICE, registryService.getAddress());
      await tx.wait();

      // Wallet Manager
      console.log('Connecting wallet manager to trust service');
      tx = await walletManager.setDSService(DSConstants.services.TRUST_SERVICE, trustService.getAddress());
      await tx.wait();
      console.log('Connecting wallet manager to registry service');
      tx = await walletManager.setDSService(DSConstants.services.REGISTRY_SERVICE, registryService.getAddress());
      await tx.wait();

      // Bulk Operator
      console.log('Connecting Bulk Operator to Trust Service');
      tx = await bulkOperator.setDSService(DSConstants.services.TRUST_SERVICE, trustService.getAddress());
      await tx.wait();
      tx = await bulkOperator.setDSService(DSConstants.services.TOKEN_ISSUER, tokenIssuer.getAddress());
      await tx.wait();

      // Transaction Relayer
      console.log('Connecting transaction relayer to trust service');
      tx = await transactionRelayer.setDSService(DSConstants.services.TRUST_SERVICE, trustService.getAddress());
      await tx.wait();

      // Rebasing Provider
      console.log('Connecting rebasing provider to trust service');
      tx = await rebasingProvider.setDSService(DSConstants.services.TRUST_SERVICE, trustService.getAddress());
      await tx.wait();

      // Blacklist Manager
      console.log('Connecting blacklist manager to trust service');
      tx = await blacklistManager.setDSService(DSConstants.services.TRUST_SERVICE, trustService.getAddress());
      await tx.wait();
    },
  );
