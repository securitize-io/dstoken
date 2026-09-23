import { task, types } from 'hardhat/config';
import { DSConstants } from '../utils/globals';
import { GOVERNED_SERVICES } from './utils/governed-services';

const OWNABLE_ABI = ['function owner() view returns (address)'];
const SERVICE_CONSUMER_ABI = ['function getDSService(uint256 serviceId) view returns (address)'];
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
    'ownersHandedOver',
    'Assert owner() is the master timelock without also expecting ROLE_MASTER to have moved. Lets the ' +
      'checklist run before setServiceOwner, so a failure prevents the irreversible step instead of ' +
      'merely recording that it already happened. Defaults to the value of --handed-over.',
    undefined,
    types.boolean,
  )
  .addOptionalParam(
    'reportOnly',
    'Report wiring without asserting it. For inspecting a token that is not expected to be wired ' +
      'yet; the default requires the expected timelock addresses and fails on unset slots.',
    false,
    types.boolean,
  )
  .addOptionalParam(
    'expectedMasterDelay',
    'Assert the master timelock minDelay equals this many seconds. Supply on every scheduled re-run: ' +
      'updateDelay accepts any value including zero, so a delay silently reduced after setup is only ' +
      'caught by asserting it.',
    undefined,
    types.int,
  )
  .addOptionalParam('expectedComplianceDelay', 'Assert the compliance rules timelock minDelay, in seconds', undefined, types.int)
  .addOptionalParam('expectedRolesDelay', 'Assert the roles timelock minDelay, in seconds', undefined, types.int)
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
    // Rejects the zero address explicitly. `!!b` guarded only against a missing command-line
    // argument; a slot read from chain arrives as the truthy string "0x0000...0", so two unset
    // slots compared equal and every drift check on a never-wired token passed.
    const isSet = (v?: string) => !!v && v !== hre.ethers.ZeroAddress;
    const same = (a: string, b?: string) => isSet(a) && isSet(b) && a.toLowerCase() === b!.toLowerCase();

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

    if (args.reportOnly) {
      console.log('  (--report-only: wiring is reported, not asserted)');
    } else {
      // An unwired token must not pass the checklist. Asserted explicitly rather than left to
      // emerge from comparisons, since two unset slots agree with each other.
      check('MASTER_TIMELOCK is registered', isSet(masterEntry), masterEntry);
      check('COMPLIANCE_RULES_TIMELOCK is registered', isSet(complianceEntry), complianceEntry);
      check('ROLES_TIMELOCK is registered', isSet(rolesEntry), rolesEntry);

      // Comparing two chain reads only proves they agree, not that they are what was intended.
      check(
        'expected timelock addresses were supplied',
        isSet(args.masterTimelock) && isSet(args.complianceTimelock) && isSet(args.rolesTimelock),
        'pass --master-timelock, --compliance-timelock and --roles-timelock, or --report-only to inspect without asserting',
      );
    }

    console.log('== Enforcement vs discovery (drift check) ==');
    const ccsTimelock = await complianceConfigurationService.getDSService(DSConstants.services.COMPLIANCE_RULES_TIMELOCK);
    const rolesGovernor = await trustService.getRolesGovernor();
    if (args.reportOnly) {
      console.log(`  CCS enforcement: ${ccsTimelock}`);
      console.log(`  TrustService rolesGovernor: ${rolesGovernor}`);
    } else {
      check('compliance enforcement matches discovery', same(ccsTimelock, complianceEntry), `CCS=${ccsTimelock} token=${complianceEntry}`);
      check('roles enforcement matches discovery', same(rolesGovernor, rolesEntry), `TrustService=${rolesGovernor} token=${rolesEntry}`);
      if (args.complianceTimelock) check('compliance timelock is the expected address', same(ccsTimelock, args.complianceTimelock), ccsTimelock);
      if (args.rolesTimelock) check('roles timelock is the expected address', same(rolesGovernor, args.rolesTimelock), rolesGovernor);
      if (args.masterTimelock) check('master timelock is the expected address', same(masterEntry, args.masterTimelock), masterEntry);
    }

    console.log('== Timelock delays ==');
    const expectedDelays: Record<string, number | undefined> = {
      master: args.expectedMasterDelay,
      compliance: args.expectedComplianceDelay,
      roles: args.expectedRolesDelay,
    };
    for (const [label, address] of [['master', masterEntry], ['compliance', complianceEntry], ['roles', rolesEntry]]) {
      if (address === hre.ethers.ZeroAddress) continue;
      try {
        const timelock = await hre.ethers.getContractAt(TIMELOCK_ABI, address);
        const minDelay = await timelock.getMinDelay();
        const expected = expectedDelays[label];
        if (expected === undefined) {
          console.log(`  ${label} timelock minDelay: ${minDelay}s (not asserted — pass --expected-${label}-delay)`);
        } else {
          // A delay of zero makes schedule-and-execute available in one block, so this asserts the
          // value rather than reporting it.
          check(`${label} timelock minDelay is ${expected}s`, minDelay === BigInt(expected), `${minDelay}s`);
        }
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

    const tokenTrustService = await dsToken.getDSService(DSConstants.services.TRUST_SERVICE);

    for (const { name, serviceId, transferable } of ownedIds) {
      const address = serviceId === null ? args.token : await dsToken.getDSService(serviceId);
      if (address === hre.ethers.ZeroAddress) continue;
      const expectOwners = args.ownersHandedOver ?? args.handedOver;
      const asserted = transferable && !skipped.has(name.toUpperCase());

      // A registered id pointing at an address with no code is a failure in itself, and would
      // otherwise surface as an unreadable interface below.
      if ((await hre.ethers.provider.getCode(address)) === '0x') {
        check(`${name} address has code`, false, `${address} has no contract`);
        continue;
      }

      // Read inside the handler, assert outside it. Previously the assertion sat within the try,
      // so an unreadable owner logged a note and contributed nothing to the failure list.
      let owner: string | undefined;
      let readError: string | undefined;
      try {
        owner = await (await hre.ethers.getContractAt(OWNABLE_ABI, address)).owner();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        // A revert means the interface is absent; anything else is an indeterminate transport
        // failure, which must not be reported as a definitive answer either way.
        readError = /revert|call exception|BAD_DATA|missing revert data/i.test(message)
          ? `owner() is not present on ${address}`
          : `owner() could not be read from ${address}: ${message}`;
      }

      if (owner === undefined) {
        // Legitimately non-Ownable services are declared transferable: false, so only those may
        // lack the interface without it being a finding.
        if (asserted) check(`${name} exposes owner()`, false, readError ?? 'unknown');
        else console.log(`  ${name} (${address}): no owner() — report-only entry`);
        continue;
      }

      if (expectOwners && args.masterTimelock && asserted) {
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

      // Each service consumer resolves roles through its OWN trust service pointer, and
      // onlyComplianceAdmin reaches the master principal that way. A service pointing at a
      // different instance is governed by a different role set than the one verified here.
      if (asserted && serviceId !== null) {
        try {
          const serviceTrust = await (
            await hre.ethers.getContractAt(SERVICE_CONSUMER_ABI, address)
          ).getDSService(DSConstants.services.TRUST_SERVICE);
          check(
            `${name} resolves the same trust service as the token`,
            same(serviceTrust, tokenTrustService),
            `service=${serviceTrust} token=${tokenTrustService}`,
          );
        } catch {
          check(`${name} exposes getDSService`, false, `could not read TRUST_SERVICE from ${address}`);
        }
      }
    }

    if (failures.length > 0) {
      throw new Error(`Governance verification failed: ${failures.join(' | ')}`);
    }
    console.log('\nGovernance verification passed');
  });
