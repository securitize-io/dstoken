import { task, types } from 'hardhat/config';
import { DSConstants } from '../utils/globals';

const OWNABLE_ABI = ['function owner() view returns (address)'];
const TIMELOCK_ABI = [
  'function getMinDelay() view returns (uint256)',
  'function hasRole(bytes32,address) view returns (bool)',
  'function DEFAULT_ADMIN_ROLE() view returns (bytes32)',
];

/**
 * Read-only BC-2133 governance verification checklist.
 * Asserts the discovery entries and the enforcement slots agree (drift check), and reports
 * every owner()/MASTER so the operator can confirm the handover state before renouncing
 * the temporary timelock admin roles.
 */
task('verify-governance', 'Verify BC-2133 governance wiring for a deployed DS token suite')
  .addParam('token', 'DSToken proxy address', undefined, types.string)
  .addOptionalParam('masterTimelock', 'Expected master timelock address', undefined, types.string)
  .addOptionalParam('complianceTimelock', 'Expected compliance rules timelock address', undefined, types.string)
  .addOptionalParam('rolesTimelock', 'Expected roles timelock address', undefined, types.string)
  .addOptionalParam('handedOver', 'Expect MASTER and owner() to be the master timelock', false, types.boolean)
  .addOptionalParam('admin', 'Temporary timelock admin address, asserted to have renounced', undefined, types.string)
  .addFlag(
    'expectAdminRenounced',
    'Require that no external wallet holds DEFAULT_ADMIN_ROLE. Separate from --handed-over on ' +
      'purpose: the runbook renounces the admin only AFTER verify-governance passes post-handover, ' +
      'so making --handed-over require it would deadlock that sequence.',
  )
  .setAction(async (args, hre) => {
    const failures: string[] = [];
    const check = (label: string, ok: boolean, detail: string) => {
      console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${label}: ${detail}`);
      if (!ok) failures.push(label);
    };
    const same = (a: string, b?: string) => !!b && a.toLowerCase() === b.toLowerCase();

    const dsToken = await hre.ethers.getContractAt('DSToken', args.token);
    const trustService = await hre.ethers.getContractAt('TrustService', await dsToken.getDSService(DSConstants.services.TRUST_SERVICE));
    const ccsAddress = await dsToken.getDSService(DSConstants.services.COMPLIANCE_CONFIGURATION_SERVICE);
    const complianceConfigurationService = await hre.ethers.getContractAt('ComplianceConfigurationService', ccsAddress);

    console.log('\nGovernance verification checklist');
    console.log('== Discovery (token registry) ==');
    const masterEntry = await dsToken.getDSService(DSConstants.services.MASTER_TIMELOCK);
    const complianceEntry = await dsToken.getDSService(DSConstants.services.COMPLIANCE_RULES_TIMELOCK);
    const rolesEntry = await dsToken.getDSService(DSConstants.services.ROLES_TIMELOCK);
    console.log(`  MASTER_TIMELOCK: ${masterEntry}`);
    console.log(`  COMPLIANCE_RULES_TIMELOCK: ${complianceEntry}`);
    console.log(`  ROLES_TIMELOCK: ${rolesEntry}`);

    console.log('== Enforcement vs discovery (drift check) ==');
    const ccsTimelock = await complianceConfigurationService.getDSService(DSConstants.services.COMPLIANCE_RULES_TIMELOCK);
    const rolesGovernor = await trustService.getRolesGovernor();
    check('compliance enforcement matches discovery', same(ccsTimelock, complianceEntry), `CCS=${ccsTimelock} token=${complianceEntry}`);
    check('roles enforcement matches discovery', same(rolesGovernor, rolesEntry), `TrustService=${rolesGovernor} token=${rolesEntry}`);
    if (args.complianceTimelock) check('compliance timelock is the expected address', same(ccsTimelock, args.complianceTimelock), ccsTimelock);
    if (args.rolesTimelock) check('roles timelock is the expected address', same(rolesGovernor, args.rolesTimelock), rolesGovernor);
    if (args.masterTimelock) check('master timelock is the expected address', same(masterEntry, args.masterTimelock), masterEntry);

    console.log('== Timelock delays ==');
    for (const [label, address] of [['master', masterEntry], ['compliance', complianceEntry], ['roles', rolesEntry]]) {
      if (address === hre.ethers.ZeroAddress) continue;
      try {
        const timelock = await hre.ethers.getContractAt(TIMELOCK_ABI, address);
        console.log(`  ${label} timelock minDelay: ${await timelock.getMinDelay()}s`);
      } catch {
        check(`${label} timelock responds to getMinDelay`, false, `${address} does not look like a TimelockController`);
      }
    }

    console.log('== Authority ==');
    if (args.masterTimelock) {
      const masterRole = await trustService.getRole(args.masterTimelock);
      check(
        'master timelock holds MASTER role',
        args.handedOver ? masterRole === BigInt(DSConstants.roles.MASTER) : true,
        `getRole(masterTimelock)=${masterRole}${args.handedOver ? '' : ' (handover not requested)'}`,
      );
    }
    const ownedIds: [string, number][] = [
      ['DS_TOKEN', DSConstants.services.DS_TOKEN],
      ['REGISTRY_SERVICE', DSConstants.services.REGISTRY_SERVICE],
      ['COMPLIANCE_SERVICE', DSConstants.services.COMPLIANCE_SERVICE],
      ['WALLET_MANAGER', DSConstants.services.WALLET_MANAGER],
      ['LOCK_MANAGER', DSConstants.services.LOCK_MANAGER],
      ['COMPLIANCE_CONFIGURATION_SERVICE', DSConstants.services.COMPLIANCE_CONFIGURATION_SERVICE],
      ['TOKEN_ISSUER', DSConstants.services.TOKEN_ISSUER],
      ['WALLET_REGISTRAR', DSConstants.services.WALLET_REGISTRAR],
      ['TRANSACTION_RELAYER', DSConstants.services.TRANSACTION_RELAYER],
      ['REBASING_PROVIDER', DSConstants.services.REBASING_PROVIDER],
      ['BLACKLIST_MANAGER', DSConstants.services.BLACKLIST_MANAGER],
    ];
    for (const [name, serviceId] of ownedIds) {
      const address = name === 'DS_TOKEN' ? args.token : await dsToken.getDSService(serviceId);
      if (address === hre.ethers.ZeroAddress) continue;
      try {
        const owner = await (await hre.ethers.getContractAt(OWNABLE_ABI, address)).owner();
        if (args.handedOver && args.masterTimelock) {
          check(`${name} owner() is the master timelock`, same(owner, args.masterTimelock), owner);
        } else {
          console.log(`  ${name} owner(): ${owner}`);
        }
      } catch {
        console.log(`  ${name} (${address}): not Ownable`);
      }
    }

    // The temporary DEFAULT_ADMIN_ROLE is the last thing a handover must give up. While an EOA
    // holds it on a timelock it can grant itself PROPOSER_ROLE and push anything through after the
    // delay — so "the old MASTER has no way back" is only true for INSTANT authority until this is
    // renounced. AccessControl is not enumerable here, so the check is against known addresses:
    // every configured signer, plus --admin if given.
    // A registered timelock address proves nothing on its own. The pre-BC-2133
    // ComplianceConfigurationService gates its setters with onlyTransferAgentOrAbove and never
    // reads the timelock slot, so registering a timelock on a NON-upgraded CCS records the address
    // and changes no behaviour — discovery says "timelocked" while any TRANSFER_AGENT can still
    // change the rules. Probe the enforcement instead of trusting the record: a TRANSFER_AGENT
    // must be rejected. Read-only, via eth_call with a `from` override.
    console.log('== Compliance enforcement is real (not just registered) ==');
    if (ccsTimelock === hre.ethers.ZeroAddress) {
      console.log('  no compliance timelock registered, nothing to enforce');
    } else {
      const transferAgent = await findRoleHolder(hre, trustService, DSConstants.roles.TRANSFER_AGENT);
      if (!transferAgent) {
        console.log(
          '  SKIPPED: no configured signer holds TRANSFER_AGENT, so the probe cannot distinguish an\n' +
            '  upgraded CCS from a legacy one. Configure a TRANSFER_AGENT key to enable this check.',
        );
      } else {
        let rejected: boolean;
        try {
          await complianceConfigurationService.setCountryCompliance.staticCall('bc2329-probe', 1, { from: transferAgent });
          rejected = false;
        } catch {
          rejected = true;
        }
        check(
          'compliance setters actually reject a TRANSFER_AGENT',
          rejected,
          rejected
            ? `probe from ${transferAgent} reverted, gating is live`
            : `probe from ${transferAgent} SUCCEEDED — the CCS at ${ccsAddress} is not upgraded, so the ` +
              `registered timelock is decorative and compliance rules remain TRANSFER_AGENT-changeable`,
        );
      }
    }

    console.log('== Timelock admin (renounce state) ==');
    const candidates = new Map<string, string>();
    for (const [index, signer] of (await hre.ethers.getSigners()).entries()) {
      candidates.set(signer.address.toLowerCase(), `signer ${index}`);
    }
    if (args.admin) candidates.set(args.admin.toLowerCase(), 'temporary admin');

    for (const [label, address] of [['master', masterEntry], ['compliance', complianceEntry], ['roles', rolesEntry]]) {
      if (address === hre.ethers.ZeroAddress) continue;
      const timelock = await hre.ethers.getContractAt(TIMELOCK_ABI, address);
      let adminRole: string;
      try {
        adminRole = await timelock.DEFAULT_ADMIN_ROLE();
      } catch {
        check(`${label} timelock exposes DEFAULT_ADMIN_ROLE`, false, address);
        continue;
      }

      check(
        `${label} timelock is self-administered`,
        await timelock.hasRole(adminRole, address),
        'the timelock itself holds DEFAULT_ADMIN_ROLE',
      );

      const stillAdmin: string[] = [];
      for (const [candidate, who] of candidates) {
        if (candidate === address.toLowerCase()) continue;
        if (await timelock.hasRole(adminRole, candidate)) stillAdmin.push(`${who} ${candidate}`);
      }
      if (args.expectAdminRenounced) {
        check(
          `${label} timelock: no external wallet holds DEFAULT_ADMIN_ROLE`,
          stillAdmin.length === 0,
          stillAdmin.length === 0 ? 'renounced' : `still admin: ${stillAdmin.join(', ')}`,
        );
      } else {
        const pending = stillAdmin.length > 0;
        console.log(
          `  ${label} timelock external admins: ${pending ? stillAdmin.join(', ') : 'none'}` +
            (pending
              ? ' — STILL A DELAYED PATH BACK TO AUTHORITY: an admin can grant itself PROPOSER_ROLE.' +
                ' Renounce it, then re-run with --expect-admin-renounced'
              : ''),
        );
      }
    }
    console.log('  note: AccessControl is not enumerable, so this covers the configured signers and --admin only');

    if (failures.length > 0) {
      throw new Error(`Governance verification failed: ${failures.join(' | ')}`);
    }
    console.log('\nGovernance verification passed');
  });

/** Returns the first configured signer holding the given role, or undefined. */
async function findRoleHolder(hre: any, trustService: any, role: number): Promise<string | undefined> {
  for (const signer of await hre.ethers.getSigners()) {
    if (Number(await trustService.getRole(signer.address)) === role) return signer.address;
  }
  return undefined;
}
