import { task, types } from 'hardhat/config';
import { DSConstants } from '../utils/globals';
import { GOVERNED_SERVICES } from './utils/governed-services';

const OWNABLE_ABI = ['function owner() view returns (address)'];
const TIMELOCK_ABI = ['function getMinDelay() view returns (uint256)'];

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
  .addOptionalParam(
    'skipServices',
    'Comma-separated service names deliberately excluded from the handover; reported, not asserted',
    '',
    types.string,
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
    const ownedIds: { name: string; serviceId: number | null; transferable: boolean }[] = [
      { name: 'DS_TOKEN', serviceId: null, transferable: true },
      ...GOVERNED_SERVICES.map((svc) => ({ name: svc.name, serviceId: svc.serviceId, transferable: svc.transferable })),
    ];
    const skipped = new Set(
      String(args.skipServices || '')
        .split(',')
        .map((v: string) => v.trim().toUpperCase())
        .filter(Boolean),
    );

    for (const { name, serviceId, transferable } of ownedIds) {
      const address = serviceId === null ? args.token : await dsToken.getDSService(serviceId);
      if (address === hre.ethers.ZeroAddress) continue;
      try {
        const owner = await (await hre.ethers.getContractAt(OWNABLE_ABI, address)).owner();
        const asserted = transferable && !skipped.has(name.toUpperCase());
        if (args.handedOver && args.masterTimelock && asserted) {
          check(`${name} owner() is the master timelock`, same(owner, args.masterTimelock), owner);
        } else {
          // Report-only entries are shared/externally administered, so the master timelock owning
          // them would be wrong, not right — print the owner instead of asserting on it.
          const why = !transferable
            ? ' (report-only, not part of this handover)'
            : skipped.has(name.toUpperCase())
              ? ' (explicitly skipped via --skip-services)'
              : '';
          console.log(`  ${name} owner(): ${owner}${why}`);
        }
      } catch {
        console.log(`  ${name} (${address}): not Ownable`);
      }
    }

    if (failures.length > 0) {
      throw new Error(`Governance verification failed: ${failures.join(' | ')}`);
    }
    console.log('\nGovernance verification passed');
  });
