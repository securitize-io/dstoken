import { task, types } from 'hardhat/config';
import { DSConstants } from '../utils/globals';

const OWNABLE_ABI = [
  'function owner() view returns (address)',
  'function transferOwnership(address newOwner)',
];

// Service ids whose contracts are Ownable ServiceConsumers subject to the owner() bypass of onlyMaster.
const OWNED_SERVICE_IDS: Record<string, number> = {
  REGISTRY_SERVICE: DSConstants.services.REGISTRY_SERVICE,
  COMPLIANCE_SERVICE: DSConstants.services.COMPLIANCE_SERVICE,
  WALLET_MANAGER: DSConstants.services.WALLET_MANAGER,
  LOCK_MANAGER: DSConstants.services.LOCK_MANAGER,
  COMPLIANCE_CONFIGURATION_SERVICE: DSConstants.services.COMPLIANCE_CONFIGURATION_SERVICE,
  TOKEN_ISSUER: DSConstants.services.TOKEN_ISSUER,
  WALLET_REGISTRAR: DSConstants.services.WALLET_REGISTRAR,
  TRANSACTION_RELAYER: DSConstants.services.TRANSACTION_RELAYER,
  REBASING_PROVIDER: DSConstants.services.REBASING_PROVIDER,
  BLACKLIST_MANAGER: DSConstants.services.BLACKLIST_MANAGER,
};

/**
 * One-time BC-2133 governance wiring for a deployed token suite.
 *
 * Without --handover (default) it only wires the timelocks while MASTER is still the deployer:
 *   token registry discovery entries (8198/8199/8200), the compliance rules timelock on the
 *   ComplianceConfigurationService, and the roles governor on the TrustService.
 *
 * With --handover it additionally transfers every owner() to the master timelock and finally
 * TrustService MASTER itself. After that the signer has no authority left: run it only after
 * verify-governance passes on the wiring step.
 */
task('setup-governance', 'Wire BC-2133 timelocks into a deployed DS token suite')
  .addParam('token', 'DSToken proxy address', undefined, types.string)
  .addParam('masterTimelock', 'Master timelock address', undefined, types.string)
  .addParam('complianceTimelock', 'Compliance rules timelock address', undefined, types.string)
  .addParam('rolesTimelock', 'Roles timelock address', undefined, types.string)
  .addOptionalParam('handover', 'Also transfer MASTER and every owner() to the master timelock', false, types.boolean)
  .setAction(async (args, hre) => {
    const dsToken = await hre.ethers.getContractAt('DSToken', args.token);
    const trustService = await hre.ethers.getContractAt('TrustService', await dsToken.getDSService(DSConstants.services.TRUST_SERVICE));
    const complianceConfigurationService = await hre.ethers.getContractAt(
      'ComplianceConfigurationService',
      await dsToken.getDSService(DSConstants.services.COMPLIANCE_CONFIGURATION_SERVICE),
    );

    console.log('Registering timelock discovery entries on the token registry');
    let tx = await dsToken.setDSService(DSConstants.services.MASTER_TIMELOCK, args.masterTimelock);
    await tx.wait();
    tx = await dsToken.setDSService(DSConstants.services.COMPLIANCE_RULES_TIMELOCK, args.complianceTimelock);
    await tx.wait();
    tx = await dsToken.setDSService(DSConstants.services.ROLES_TIMELOCK, args.rolesTimelock);
    await tx.wait();

    console.log('Registering compliance rules timelock on the compliance configuration service (enforcement)');
    tx = await complianceConfigurationService.setDSService(DSConstants.services.COMPLIANCE_RULES_TIMELOCK, args.complianceTimelock);
    await tx.wait();

    console.log('Setting roles governor on the trust service (enforcement)');
    tx = await trustService.setRolesGovernor(args.rolesTimelock);
    await tx.wait();

    if (args.handover) {
      const [signer] = await hre.ethers.getSigners();
      console.log(`\nHandover: transferring ownership to master timelock ${args.masterTimelock}`);

      const owned: { name: string; address: string }[] = [{ name: 'DS_TOKEN', address: args.token }];
      for (const [name, serviceId] of Object.entries(OWNED_SERVICE_IDS)) {
        const address = await dsToken.getDSService(serviceId);
        if (address !== hre.ethers.ZeroAddress) owned.push({ name, address });
      }

      const transferred = new Set<string>();
      for (const { name, address } of owned) {
        if (transferred.has(address.toLowerCase())) continue;
        transferred.add(address.toLowerCase());
        const ownable = await hre.ethers.getContractAt(OWNABLE_ABI, address);
        try {
          const currentOwner = await ownable.owner();
          if (currentOwner.toLowerCase() !== signer.address.toLowerCase()) {
            console.log(`  ${name} (${address}): owner is ${currentOwner}, skipping`);
            continue;
          }
          tx = await ownable.transferOwnership(args.masterTimelock);
          await tx.wait();
          console.log(`  ${name} (${address}): owner() -> master timelock`);
        } catch {
          console.log(`  ${name} (${address}): not Ownable, skipping`);
        }
      }

      console.log('Transferring TrustService MASTER to the master timelock (final step, irreversible for this signer)');
      tx = await trustService.setServiceOwner(args.masterTimelock);
      await tx.wait();
    }

    await hre.run('verify-governance', {
      token: args.token,
      masterTimelock: args.masterTimelock,
      complianceTimelock: args.complianceTimelock,
      rolesTimelock: args.rolesTimelock,
      handedOver: args.handover,
    });
  });
