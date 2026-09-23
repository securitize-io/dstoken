import { task, types } from 'hardhat/config';
import { DSConstants } from '../utils/globals';

const TIMELOCK_ROLES_ABI = [
  'function PROPOSER_ROLE() view returns (bytes32)',
  'function CANCELLER_ROLE() view returns (bytes32)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
];

const OWNABLE_ABI = [
  'function owner() view returns (address)',
  'function transferOwnership(address newOwner)',
];

import { GOVERNED_SERVICES } from './utils/governed-services';

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
  .addOptionalParam(
    'masterProposers',
    'Comma-separated addresses expected to hold PROPOSER_ROLE and CANCELLER_ROLE on the master ' +
      'timelock. Required with --handover: after handover only a proposer can schedule against it. ' +
      'Note this confirms the on-chain set matches what you supply — it cannot prove you control ' +
      'those keys, which only scheduling from one of them would.',
    undefined,
    types.string,
  )
  .addOptionalParam(
    'skipServices',
    'Comma-separated service names to leave untouched during handover (e.g. a shared Global Registry Service). Anything skipped keeps its current owner — record why.',
    '',
    types.string,
  )
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

      // After this step the master timelock is the sole holder of master authority and of every
      // owner(), so nothing can be scheduled against it except by a proposer. Confirm the set the
      // operator believes is live actually holds the roles on-chain before surrendering anything.
      if (!args.masterProposers) {
        throw new Error(
          'Refusing to hand over without --master-proposers: after handover only a proposer can ' +
            'schedule anything against the master timelock, so the set must be verified first.',
        );
      }

      const expectedProposers = String(args.masterProposers)
        .split(',')
        .map((a: string) => a.trim())
        .filter(Boolean);
      const masterTimelockContract = await hre.ethers.getContractAt(TIMELOCK_ROLES_ABI, args.masterTimelock);
      const proposerRole = await masterTimelockContract.PROPOSER_ROLE();
      const cancellerRole = await masterTimelockContract.CANCELLER_ROLE();
      const proposerProblems: string[] = [];

      for (const address of expectedProposers) {
        if (!hre.ethers.isAddress(address)) {
          proposerProblems.push(`${address} is not a valid address`);
          continue;
        }
        if (!(await masterTimelockContract.hasRole(proposerRole, address))) {
          proposerProblems.push(`${address} does not hold PROPOSER_ROLE on ${args.masterTimelock}`);
        }
        if (!(await masterTimelockContract.hasRole(cancellerRole, address))) {
          proposerProblems.push(`${address} does not hold CANCELLER_ROLE on ${args.masterTimelock}`);
        }
      }

      if (proposerProblems.length) {
        throw new Error(
          `Refusing to hand over: the master timelock proposer set does not match what was ` +
            `supplied:\n  - ${proposerProblems.join('\n  - ')}`,
        );
      }
      console.log(`  proposer set verified on the master timelock: ${expectedProposers.join(', ')}`);

      const skipped = new Set(
        String(args.skipServices || '')
          .split(',')
          .map((s: string) => s.trim().toUpperCase())
          .filter(Boolean),
      );

      const owned: { name: string; address: string; transferable: boolean; note?: string }[] = [
        { name: 'DS_TOKEN', address: args.token, transferable: true },
      ];
      for (const service of GOVERNED_SERVICES) {
        const address = await dsToken.getDSService(service.serviceId);
        if (address === hre.ethers.ZeroAddress) continue;
        owned.push({ name: service.name, address, transferable: service.transferable, note: service.note });
      }

      // Collected first so a mismatch aborts before any ownership has moved — a partially applied
      // handover is harder to reason about than one that never started.
      const blockers: string[] = [];
      const pending: { name: string; address: string }[] = [];
      const seen = new Set<string>();

      for (const { name, address, transferable, note } of owned) {
        if (seen.has(address.toLowerCase())) continue;
        seen.add(address.toLowerCase());

        if (!transferable) {
          console.log(`  ${name} (${address}): report-only, never transferred${note ? ` — ${note}` : ''}`);
          continue;
        }
        if (skipped.has(name.toUpperCase())) {
          console.log(`  ${name} (${address}): explicitly skipped via --skip-services`);
          continue;
        }

        let currentOwner: string;
        try {
          currentOwner = await (await hre.ethers.getContractAt(OWNABLE_ABI, address)).owner();
        } catch {
          // Every transferable entry is expected to be an Ownable BaseDSContract. One that is not
          // means the registered address is not the contract we think it is, which is a finding in
          // itself rather than something to pass over quietly. (Legitimately non-Ownable services
          // are declared transferable: false and never reach here.)
          blockers.push(`${name} (${address}) has no owner() — expected an Ownable BaseDSContract`);
          continue;
        }

        if (currentOwner.toLowerCase() !== signer.address.toLowerCase()) {
          // Ownable but owned by someone else: this contract keeps an independent upgrade path
          // after handover, so completing silently would misreport the result.
          blockers.push(`${name} (${address}) is owned by ${currentOwner}, not the signer${note ? ` — ${note}` : ''}`);
          continue;
        }
        pending.push({ name, address });
      }

      if (blockers.length) {
        throw new Error(
          `Refusing to hand over: ${blockers.length} contract(s) are Ownable but not owned by the signer, so ` +
            `they would retain an upgrade path outside the timelock:\n  - ${blockers.join('\n  - ')}\n` +
            `Resolve each one (transfer it first, or revoke its TrustService role), or pass ` +
            `--skip-services <names> to acknowledge it deliberately.`,
        );
      }

      for (const { name, address } of pending) {
        const ownable = await hre.ethers.getContractAt(OWNABLE_ABI, address);
        tx = await ownable.transferOwnership(args.masterTimelock);
        await tx.wait();

        // Re-read rather than trusting the receipt: surrendering MASTER is only safe once every
        // owner is known to have actually moved.
        const confirmed = await ownable.owner();
        if (confirmed.toLowerCase() !== String(args.masterTimelock).toLowerCase()) {
          throw new Error(
            `Aborting before handover: ${name} (${address}) still reports owner ${confirmed} after ` +
              `transferOwnership. ROLE_MASTER has NOT been surrendered.`,
          );
        }
        console.log(`  ${name} (${address}): owner() -> master timelock`);
      }

      // Full checklist while the signer still holds MASTER, so a failure here blocks the
      // irreversible step instead of merely reporting it afterwards.
      console.log('\nPre-handover verification (MASTER not yet surrendered)');
      await hre.run('verify-governance', {
        token: args.token,
        masterTimelock: args.masterTimelock,
        complianceTimelock: args.complianceTimelock,
        rolesTimelock: args.rolesTimelock,
        ownersHandedOver: true,
        skipServices: args.skipServices,
      });

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
      skipServices: args.skipServices,
    });
  });
