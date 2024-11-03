import { subtask, types } from 'hardhat/config';
import { DSConstants } from '../utils/globals';

subtask('set-services', 'Set DS Services')
  .addParam('dsContracts', 'Json DS Contract Addresses', undefined, types.json, false)
  .setAction(
    async (args, hre, run) => {
      const { dsContracts } = args;
      const {
        dsToken,
        trustService,
        registryService,
        complianceService,
        walletManager,
        lockManager,
        partitionsManager,
        complianceConfigurationService,
        tokenIssuer,
        walletRegistrar,
        omnibusTBEController,
        transactionRelayer,
        tokenReallocator,
        issuerMulticall,
        bulkOperator,
        swap
      } = dsContracts;

      // Token
      console.log('Connecting token to registry');
      await dsContracts.dsToken.setDSService(DSConstants.services.REGISTRY_SERVICE, registryService.getAddress());
      console.log('Connecting token to token issuer');
      await dsToken.setDSService(DSConstants.services.TOKEN_ISSUER, tokenIssuer.getAddress());
      console.log('Connecting token to wallet registrar');
      await dsToken.setDSService(DSConstants.services.WALLET_REGISTRAR, walletRegistrar.getAddress());
      console.log('Connecting token to token reallocator');
      await dsToken.setDSService(DSConstants.services.TOKEN_REALLOCATOR, tokenReallocator.getAddress());
      console.log('Connecting token to omnibus TBE controller');
      await dsToken.setDSService(DSConstants.services.OMNIBUS_TBE_CONTROLLER, omnibusTBEController.getAddress());
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
      await dsToken.setDSService(DSConstants.services.TRANSACTION_RELAYER, transactionRelayer.getAddress());
      if (partitionsManager) {
        console.log('Connecting token to partitions manager');
        await dsToken.setDSService(DSConstants.services.PARTITIONS_MANAGER, partitionsManager.getAddress());
      }

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
      console.log('Connecting compliance service to omnibus TBE controller');
      await complianceService.setDSService(DSConstants.services.OMNIBUS_TBE_CONTROLLER, omnibusTBEController.getAddress());
      if (partitionsManager) {
        console.log('Connecting compliance service to partitions manager');
        await complianceService.setDSService(DSConstants.services.PARTITIONS_MANAGER, partitionsManager.getAddress());
      }

      // Omnibus TBE Controller
      console.log('Connecting omnibus TBE controller to trust service');
      await omnibusTBEController.setDSService(DSConstants.services.TRUST_SERVICE, trustService.getAddress());
      console.log('Connecting omnibus TBE controller to token');
      await omnibusTBEController.setDSService(DSConstants.services.DS_TOKEN, dsToken.getAddress());
      console.log('Connecting omnibus TBE controller to compliance configuration service');
      await omnibusTBEController.setDSService(DSConstants.services.COMPLIANCE_CONFIGURATION_SERVICE, complianceConfigurationService.getAddress());
      console.log('Connecting omnibus TBE controller to compliance service');
      await omnibusTBEController.setDSService(DSConstants.services.COMPLIANCE_SERVICE, complianceService.getAddress());

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
      const tbe = await omnibusTBEController.getOmnibusWallet();
      await walletManager.addPlatformWallet(tbe);

      // Token Reallocator
      console.log('Connecting token reallocator to trust service');
      await tokenReallocator.setDSService(DSConstants.services.TRUST_SERVICE, trustService.getAddress());
      console.log('Connecting token reallocator to omnibus tbe controller');
      await tokenReallocator.setDSService(DSConstants.services.OMNIBUS_TBE_CONTROLLER, omnibusTBEController.getAddress());
      console.log('Connecting token reallocator to registry service');
      await tokenReallocator.setDSService(DSConstants.services.REGISTRY_SERVICE, registryService.getAddress());
      console.log('Connecting token reallocator to lock manager');
      await tokenReallocator.setDSService(DSConstants.services.LOCK_MANAGER, lockManager.getAddress());

      // Bulk Operator
      console.log('Connecting Bulk Operator to Trust Service');
      await bulkOperator.setDSService(DSConstants.services.TRUST_SERVICE, trustService.getAddress());
      await bulkOperator.setDSService(DSConstants.services.TOKEN_ISSUER, tokenIssuer.getAddress());
      

      // Transaction Relayer
      console.log('Connecting transaction relayer to trust service');
      await transactionRelayer.setDSService(DSConstants.services.TRUST_SERVICE, trustService.getAddress());

      // Issuer Multi Call
      console.log('Connecting issuer multi call to trust service');
      await issuerMulticall.setDSService(DSConstants.services.TRUST_SERVICE, trustService.getAddress());

      // Swap
      console.log('Connecting swap to trust service');
      await swap.setDSService(DSConstants.services.TRUST_SERVICE, trustService.getAddress());
      console.log('Connecting swap to wallet manager');
      await walletManager.addIssuerWallet(swap.target);
      console.log('Connecting Swap with Registry Service');
      await swap.setDSService(DSConstants.services.REGISTRY_SERVICE, registryService.getAddress());

      // Partitions Manager
      if (partitionsManager) {
        console.log('Connecting partitions manager to trust service');
        await partitionsManager.setDSService(DSConstants.services.TRUST_SERVICE, trustService.getAddress());
        console.log('Connecting partitions manager to token');
        await partitionsManager.setDSService(DSConstants.services.DS_TOKEN, dsToken.getAddress());
      }
    }
  );
