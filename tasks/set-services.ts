import { subtask, types } from 'hardhat/config';
import { DSConstants } from '../utils/globals';

subtask('set-services', 'Set DS Services')
  .addParam('dsContracts', 'Json DS Contract Addresses', undefined, types.json, false)
  .setAction(
    async (args) => {
      const { dsContracts } = args;
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
      await dsContracts.dsToken.setDSService(DSConstants.services.REGISTRY_SERVICE, registryService.getAddress());
      console.log('Connecting token to token issuer');
      await dsToken.setDSService(DSConstants.services.TOKEN_ISSUER, tokenIssuer.getAddress());
      console.log('Connecting token to wallet registrar');
      await dsToken.setDSService(DSConstants.services.WALLET_REGISTRAR, walletRegistrar.getAddress());
      console.log('Connecting token to trust service');
      await dsToken.setDSService(DSConstants.services.TRUST_SERVICE, trustService.getAddress());
      console.log('Connecting token to compliance service');
      await dsToken.setDSService(DSConstants.services.COMPLIANCE_SERVICE, complianceService.getAddress());
      console.log('Connecting token to compliance configuration service');
      await dsToken.setDSService(DSConstants.services.COMPLIANCE_CONFIGURATION_SERVICE, complianceConfigurationService.getAddress());
      console.log('Connecting token to wallet manager');
      await dsToken.setDSService(DSConstants.services.WALLET_MANAGER, walletManager.getAddress());
      console.log('Connecting token to lock manager');
      await dsToken.setDSService(DSConstants.services.LOCK_MANAGER, lockManager.getAddress());
      console.log('Connecting token to transaction relayer');
      await dsToken.setDSService(DSConstants.services.TRANSACTION_RELAYER, transactionRelayer.getAddress())
      console.log('Connecting token to rebasing provider');
      await dsToken.setDSService(DSConstants.services.REBASING_PROVIDER, rebasingProvider.getAddress());

      // Registry Service
      console.log('Connecting registry service to trust service');
      await registryService.setDSService(DSConstants.services.TRUST_SERVICE, trustService.getAddress());
      console.log('Connecting registry service to token');
      await registryService.setDSService(DSConstants.services.DS_TOKEN, dsToken.getAddress());
      console.log('Connecting registry service to wallet manager');
      await registryService.setDSService(DSConstants.services.WALLET_MANAGER, walletManager.getAddress());
      console.log('Connecting registry service to compliance services');
      await registryService.setDSService(DSConstants.services.COMPLIANCE_SERVICE, complianceService.getAddress());

      // Compliance Configuration Service
      console.log('Connecting compliance configuration to trust service');
      await complianceConfigurationService.setDSService(DSConstants.services.TRUST_SERVICE, trustService.getAddress());

      // Compliance Service
      console.log('Connecting compliance service to trust service');
      await complianceService.setDSService(DSConstants.services.TRUST_SERVICE, trustService.getAddress());
      console.log('Connecting compliance service to compliance configuration service');
      await complianceService.setDSService(DSConstants.services.COMPLIANCE_CONFIGURATION_SERVICE, complianceConfigurationService.getAddress());
      console.log('Connecting compliance service to wallet manager');
      await complianceService.setDSService(DSConstants.services.WALLET_MANAGER, walletManager.getAddress());
      console.log('Connecting compliance service to lock manager');
      await complianceService.setDSService(DSConstants.services.LOCK_MANAGER, lockManager.getAddress());
      console.log('Connecting compliance service to token');
      await complianceService.setDSService(DSConstants.services.DS_TOKEN, dsToken.getAddress());
      console.log('Connecting compliance service to registry');
      await complianceService.setDSService(DSConstants.services.REGISTRY_SERVICE, registryService.getAddress());
      console.log('Connecting compliance service to rebasing provider');
      await complianceService.setDSService(DSConstants.services.REBASING_PROVIDER, rebasingProvider.getAddress());
      console.log('Connecting compliance service to blacklist manager');
      await complianceService.setDSService(DSConstants.services.BLACKLIST_MANAGER, blacklistManager.getAddress());

      // Lock Manager
      console.log('Connecting lock manager to trust service');
      await lockManager.setDSService(DSConstants.services.TRUST_SERVICE, trustService.getAddress());
      console.log('Connecting lock manager to token');
      await lockManager.setDSService(DSConstants.services.DS_TOKEN, dsToken.getAddress());
      console.log('Connecting lock manager to compliance registry service');
      await lockManager.setDSService(DSConstants.services.REGISTRY_SERVICE, registryService.getAddress());
      console.log('Connecting lock manager to compliance service');
      await lockManager.setDSService(DSConstants.services.COMPLIANCE_SERVICE, complianceService.getAddress());

      // Token Issuer
      console.log('Connecting token issuer to trust service');
      await tokenIssuer.setDSService(DSConstants.services.TRUST_SERVICE, trustService.getAddress());
      console.log('Connecting token issuer to token');
      await tokenIssuer.setDSService(DSConstants.services.DS_TOKEN, dsToken.getAddress());
      console.log('Connecting token issuer to registry service');
      await tokenIssuer.setDSService(DSConstants.services.REGISTRY_SERVICE, registryService.getAddress());
      console.log('Connecting token issuer to lock manager');
      await tokenIssuer.setDSService(DSConstants.services.LOCK_MANAGER, lockManager.getAddress());

      // Wallet Registrar
      console.log('Connecting wallet registrar to trust service');
      await walletRegistrar.setDSService(DSConstants.services.TRUST_SERVICE, trustService.getAddress());
      console.log('Connecting wallet registrar to registry service');
      await walletRegistrar.setDSService(DSConstants.services.REGISTRY_SERVICE, registryService.getAddress());

      // Wallet Manager
      console.log('Connecting wallet manager to trust service');
      await walletManager.setDSService(DSConstants.services.TRUST_SERVICE, trustService.getAddress());
      console.log('Connecting wallet registrar to registry service');
      await walletManager.setDSService(DSConstants.services.REGISTRY_SERVICE, registryService.getAddress());

      // Bulk Operator
      console.log('Connecting Bulk Operator to Trust Service');
      await bulkOperator.setDSService(DSConstants.services.TRUST_SERVICE, trustService.getAddress());
      await bulkOperator.setDSService(DSConstants.services.TOKEN_ISSUER, tokenIssuer.getAddress());

      // Transaction Relayer
      console.log('Connecting transaction relayer to trust service');
      await transactionRelayer.setDSService(DSConstants.services.TRUST_SERVICE, trustService.getAddress());

      // Rebasing Provider
      console.log('Connecting rebasing provider to trust service');
      await rebasingProvider.setDSService(DSConstants.services.TRUST_SERVICE, trustService.getAddress());

      // Blacklist Manager
      console.log('Connecting blacklist manager to trust service');
      await blacklistManager.setDSService(DSConstants.services.TRUST_SERVICE, trustService.getAddress());
    },
  );
