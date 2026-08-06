import { task, types } from 'hardhat/config';
import { DSConstants } from '../utils/globals';
import { Step, runScenario, resolveRoleSigners, parseRoleOverrides } from './qa/runner';
import { assertKnownTestnet } from './utils/network.helper';

/**
 * BC-2329 scenario B: the three BC-2133 governance timelocks, with real testnet timing.
 *
 * Expects the suite to already be wired with `setup-governance` (no --handover) and
 * `verify-governance` passing. Resumable: the timelock minDelays are waited out on the chain
 * clock. Operations are scheduled in batches so one wait covers several checks, which keeps a
 * realistic 24-48h minDelay from turning into days of serial waiting.
 *
 *   npx hardhat qa-scenario-b --network sepolia --token 0x... \
 *     --master-timelock 0xA --compliance-timelock 0xB --roles-timelock 0xC \
 *     --state qa-b-sepolia.json
 *
 * The handover phase is irreversible and only runs with --handover, after everything before it
 * has passed. Ordering note: a Master-gated action driven through the master timelock is only
 * possible once the handover has happened, because until then the master timelock holds no
 * authority — so those checks live in the handover phase, not before it.
 */
task('qa-scenario-b', 'BC-2329 scenario B: the three governance timelocks on a live network')
  .addParam('token', 'DSToken proxy address', undefined, types.string)
  .addParam('masterTimelock', 'Master timelock address', undefined, types.string)
  .addParam('complianceTimelock', 'Compliance rules timelock address', undefined, types.string)
  .addParam('rolesTimelock', 'Roles timelock address', undefined, types.string)
  .addParam('state', 'Run-state JSON file (created on first run, resumed afterwards)', undefined, types.string)
  .addFlag('handover', 'Run the irreversible handover phase (only after the earlier steps pass)')
  .addOptionalParam('country', 'Country whose compliance value the test changes', 'japan', types.string)
  .addOptionalParam(
    'roles',
    'Override which signer holds a role, e.g. "master=6" for a token whose MASTER is not signer 0',
    undefined,
    types.string,
  )
  .addFlag('allowUnknownChain', 'Bypass the testnet chain-id guard (only for a chain you verified yourself)')
  .setAction(async (args, hre) => {
    // Before anything touches the network: the role wallets here hold authority on other
    // deployments, so a misdirected RPC URL must fail closed.
    await assertKnownTestnet(hre, args.allowUnknownChain);

    console.log('Role wallets:');
    const { master, transferAgent, proposer, executor, canceller } = await resolveRoleSigners(
      hre,
      ['master', 'issuer', 'transferAgent', 'proposer', 'executor', 'canceller'],
      parseRoleOverrides(args.roles),
    );

    const token: any = await hre.ethers.getContractAt('DSToken', args.token);
    const trustService: any = await hre.ethers.getContractAt(
      'TrustService',
      await token.getDSService(DSConstants.services.TRUST_SERVICE),
    );
    const ccs: any = await hre.ethers.getContractAt(
      'ComplianceConfigurationService',
      await token.getDSService(DSConstants.services.COMPLIANCE_CONFIGURATION_SERVICE),
    );
    const masterTimelock: any = await hre.ethers.getContractAt('TimelockController', args.masterTimelock);
    const complianceTimelock: any = await hre.ethers.getContractAt('TimelockController', args.complianceTimelock);
    const rolesTimelock: any = await hre.ethers.getContractAt('TimelockController', args.rolesTimelock);

    /** Salt convention from docs/runbooks/governance-timelocks.md, so ids are computable up front. */
    const salt = (requestId: string) =>
      hre.ethers.solidityPackedKeccak256(['string', 'string'], ['securitize.governance.v1', requestId]);

    /** Schedules an operation and records the computed id and eta in the run state. */
    const scheduleOp = async (
      ctx: any,
      key: string,
      timelock: any,
      target: string,
      data: string,
      requestId: string,
    ) => {
      const operationSalt = salt(requestId);
      const minDelay = await timelock.getMinDelay();
      const id = await timelock.hashOperation(target, 0, data, hre.ethers.ZeroHash, operationSalt);
      const receipt = await ctx.send(
        `schedule ${key}`,
        timelock.connect(proposer).schedule(target, 0, data, hre.ethers.ZeroHash, operationSalt, minDelay),
      );
      const eta = await timelock.getTimestamp(id);

      // BC-2338: monitoring keys on CallScheduled, so record the exact emitted payload. These are
      // real events on a real timelock — usable as fixtures to validate the Hexagate/Blockaid rule.
      const scheduled = receipt.logs
        .map((log: any) => {
          try {
            return timelock.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((parsed: any) => parsed?.name === 'CallScheduled');
      ctx.check(`${key}: CallScheduled emitted`, !!scheduled, scheduled ? 'found' : 'MISSING');
      if (scheduled) {
        ctx.note(
          `${key} CallScheduled`,
          `id=${scheduled.args.id} index=${scheduled.args.index} target=${scheduled.args.target} ` +
            `value=${scheduled.args.value} predecessor=${scheduled.args.predecessor} delay=${scheduled.args.delay}`,
        );
        ctx.check(
          `${key}: CallScheduled id matches the id computed off-chain`,
          scheduled.args.id.toLowerCase() === id.toLowerCase(),
          `event=${scheduled.args.id} hashOperation=${id}`,
        );
        ctx.set(`${key}.timelock`, await timelock.getAddress());
      }

      ctx.set(`${key}.id`, id);
      ctx.set(`${key}.salt`, operationSalt);
      ctx.set(`${key}.target`, target);
      ctx.set(`${key}.data`, data);
      ctx.set(`${key}.eta`, eta.toString());
      ctx.note(`${key} id`, id);
      ctx.note(`${key} eta`, `${eta} (${new Date(Number(eta) * 1000).toISOString()})`);
      ctx.check(
        `${key}: id computed off-chain matches the scheduled operation`,
        eta > 0n,
        `hashOperation=${id} getTimestamp=${eta}`,
      );
      return id;
    };

    const executeOp = (ctx: any, key: string, timelock: any, signer: any, overrides: object = {}) =>
      timelock
        .connect(signer)
        .execute(
          ctx.get(`${key}.target`),
          0,
          ctx.get(`${key}.data`),
          hre.ethers.ZeroHash,
          ctx.get(`${key}.salt`),
          overrides,
        );

    /** Largest eta across the given keys, so one wait covers the whole batch. */
    const maxEta = (ctx: any, keys: string[]) => Math.max(...keys.map((k) => Number(ctx.get(`${k}.eta`)!)));

    const newCountryValue = 8; // JP bucket, harmless and easy to read back
    const exchangeTarget = canceller.address; // any address not already holding a role

    const steps: Step[] = [
      {
        id: 'b0-preflight',
        title: 'verify-governance passes and every timelock role sits on the intended wallet',
        run: async (ctx) => {
          await hre.run('verify-governance', {
            token: args.token,
            masterTimelock: args.masterTimelock,
            complianceTimelock: args.complianceTimelock,
            rolesTimelock: args.rolesTimelock,
            handedOver: false,
          });
          ctx.note('verify-governance', 'passed');

          for (const [label, timelock] of [
            ['master', masterTimelock],
            ['compliance', complianceTimelock],
            ['roles', rolesTimelock],
          ] as const) {
            const minDelay = await timelock.getMinDelay();
            ctx.check(`${label} timelock minDelay is non-zero`, minDelay > 0n, `${minDelay}s`);
            ctx.check(
              `${label} timelock: proposer wallet holds PROPOSER_ROLE`,
              await timelock.hasRole(await timelock.PROPOSER_ROLE(), proposer.address),
              proposer.address,
            );
            ctx.check(
              `${label} timelock: canceller wallet holds CANCELLER_ROLE`,
              await timelock.hasRole(await timelock.CANCELLER_ROLE(), canceller.address),
              canceller.address,
            );
            const executorRole = await timelock.EXECUTOR_ROLE();
            const permissionless = await timelock.hasRole(executorRole, hre.ethers.ZeroAddress);
            ctx.check(
              `${label} timelock: execution is possible for the executor wallet`,
              permissionless || (await timelock.hasRole(executorRole, executor.address)),
              permissionless ? 'permissionless (address(0) holds EXECUTOR_ROLE)' : executor.address,
            );
            ctx.note(`${label} timelock execution mode`, permissionless ? 'permissionless' : 'restricted');
          }

          ctx.note('country compliance before', (await ccs.getCountryCompliance(args.country)).toString());
          ctx.note('exchange target role before', (await trustService.getRole(exchangeTarget)).toString());
        },
      },
      {
        id: 'b1-schedule-batch',
        title: 'Schedule the legitimate, cross-domain and to-be-cancelled operations from the proposer',
        run: async (ctx) => {
          // Legitimate: a compliance rule change through the compliance timelock.
          await scheduleOp(
            ctx,
            'compliance',
            complianceTimelock,
            await ccs.getAddress(),
            ccs.interface.encodeFunctionData('setCountryCompliance', [args.country, newCountryValue]),
            `bc2329-compliance-${Date.now()}`,
          );

          // Legitimate: a role grant through the roles timelock.
          await scheduleOp(
            ctx,
            'roles',
            rolesTimelock,
            await trustService.getAddress(),
            trustService.interface.encodeFunctionData('setRole', [exchangeTarget, DSConstants.roles.EXCHANGE]),
            `bc2329-roles-${Date.now()}`,
          );

          // Cross-domain: the roles timelock must not be able to change compliance rules, and the
          // compliance timelock must not be able to grant roles. Scheduling is unrestricted on a
          // TimelockController; the enforcement has to happen at execution.
          await scheduleOp(
            ctx,
            'crossRolesIntoCompliance',
            rolesTimelock,
            await ccs.getAddress(),
            ccs.interface.encodeFunctionData('setCountryCompliance', [args.country, 4]),
            `bc2329-cross-roles-${Date.now()}`,
          );
          await scheduleOp(
            ctx,
            'crossComplianceIntoRoles',
            complianceTimelock,
            await trustService.getAddress(),
            trustService.interface.encodeFunctionData('setRole', [exchangeTarget, DSConstants.roles.TRANSFER_AGENT]),
            `bc2329-cross-compliance-${Date.now()}`,
          );

          // To be cancelled mid-delay by the canceller wallet.
          await scheduleOp(
            ctx,
            'toCancel',
            complianceTimelock,
            await ccs.getAddress(),
            ccs.interface.encodeFunctionData('setCountryCompliance', [args.country, 1]),
            `bc2329-cancel-${Date.now()}`,
          );
        },
      },
      {
        id: 'b2-cancel-mid-delay',
        title: 'Cancel one pending operation from the real canceller wallet, and prove a stranger cannot',
        run: async (ctx) => {
          await ctx.expectRevert('cancel from a wallet without CANCELLER_ROLE', () =>
            complianceTimelock.connect(transferAgent).cancel(ctx.get('toCancel.id')!, { gasLimit: 200_000 }),
          );
          await ctx.send('cancel (canceller wallet)', complianceTimelock.connect(canceller).cancel(ctx.get('toCancel.id')!));
          ctx.check(
            'cancelled operation is Unset again',
            (await complianceTimelock.getOperationState(ctx.get('toCancel.id')!)) === 0n,
            `state=${await complianceTimelock.getOperationState(ctx.get('toCancel.id')!)}`,
          );
        },
      },
      {
        id: 'b3-schedule-below-min-delay',
        title: 'Scheduling below minDelay must revert',
        run: async (ctx) => {
          const minDelay = await complianceTimelock.getMinDelay();
          const ccsAddress = await ccs.getAddress();
          await ctx.expectRevert('schedule with delay below minDelay', () =>
            complianceTimelock
              .connect(proposer)
              .schedule(
                ccsAddress,
                0,
                ccs.interface.encodeFunctionData('setCountryCompliance', [args.country, 2]),
                hre.ethers.ZeroHash,
                salt(`bc2329-short-delay-${Date.now()}`),
                minDelay - 1n,
                { gasLimit: 300_000 },
              ),
          );
        },
      },
      {
        id: 'b4-execute-batch',
        title: 'Wait out the real minDelay, then execute: legitimate ops succeed, cross-domain ops revert',
        run: async (ctx) => {
          const keys = ['compliance', 'roles', 'crossRolesIntoCompliance', 'crossComplianceIntoRoles'];
          const eta = maxEta(ctx, keys);
          const now = await ctx.blockTimestamp();
          if (now < eta) {
            return { waitUntil: eta, reason: `timelock minDelay must elapse for the scheduled batch (eta ${eta})` };
          }

          await ctx.send('execute compliance rule change', executeOp(ctx, 'compliance', complianceTimelock, executor));
          ctx.check(
            'compliance rule change took effect',
            (await ccs.getCountryCompliance(args.country)) === BigInt(newCountryValue),
            (await ccs.getCountryCompliance(args.country)).toString(),
          );

          await ctx.send('execute role grant', executeOp(ctx, 'roles', rolesTimelock, executor));
          ctx.check(
            'role grant took effect',
            (await trustService.getRole(exchangeTarget)) === BigInt(DSConstants.roles.EXCHANGE),
            (await trustService.getRole(exchangeTarget)).toString(),
          );

          await ctx.expectRevert('roles timelock executing a compliance rule change', () =>
            executeOp(ctx, 'crossRolesIntoCompliance', rolesTimelock, executor, { gasLimit: 600_000 }),
          );
          await ctx.expectRevert('compliance timelock executing a role grant', () =>
            executeOp(ctx, 'crossComplianceIntoRoles', complianceTimelock, executor, { gasLimit: 600_000 }),
          );
          ctx.check(
            'cross-domain attempt did not change the compliance value',
            (await ccs.getCountryCompliance(args.country)) === BigInt(newCountryValue),
            (await ccs.getCountryCompliance(args.country)).toString(),
          );
          ctx.check(
            'cross-domain attempt did not change the role',
            (await trustService.getRole(exchangeTarget)) === BigInt(DSConstants.roles.EXCHANGE),
            (await trustService.getRole(exchangeTarget)).toString(),
          );

          await ctx.expectRevert('execute the cancelled operation', () =>
            executeOp(ctx, 'toCancel', complianceTimelock, executor, { gasLimit: 600_000 }),
          );
        },
      },
      {
        id: 'b5-emergency-toolbox',
        title: 'pause() stays instant for TRANSFER_AGENT while unpause() is MASTER-only',
        run: async (ctx) => {
          await ctx.send('pause (TRANSFER_AGENT)', token.connect(transferAgent).pause());
          ctx.check('token is paused', (await token.isPaused()) === true, 'isPaused=true');
          await ctx.expectRevert('unpause from TRANSFER_AGENT', () =>
            token.connect(transferAgent).unpause({ gasLimit: 200_000 }),
          );
          // Pre-handover MASTER is still the EOA, so it can lift the pause directly. Post-handover
          // this same call has to go through the master timelock (step b8).
          await ctx.send('unpause (MASTER EOA, pre-handover)', token.connect(master).unpause());
          ctx.check('token is unpaused', (await token.isPaused()) === false, 'isPaused=false');
        },
      },
      {
        id: 'b6-handover',
        title: 'Irreversible: hand MASTER and every owner() to the master timelock',
        run: async (ctx) => {
          if (!args.handover) {
            return {
              stop:
                'steps b0-b5 passed. Re-run the same command with --handover to continue into the ' +
                'irreversible handover phase (b6-b9). Everything before this point is reversible; ' +
                'nothing after it is.',
            };
          }
          await hre.run('setup-governance', {
            token: args.token,
            masterTimelock: args.masterTimelock,
            complianceTimelock: args.complianceTimelock,
            rolesTimelock: args.rolesTimelock,
            handover: true,
          });
          ctx.note('setup-governance --handover', 'completed, verify-governance ran at the end');
          ctx.check(
            'master timelock now holds MASTER',
            (await trustService.getRole(args.masterTimelock)) === BigInt(DSConstants.roles.MASTER),
            (await trustService.getRole(args.masterTimelock)).toString(),
          );
        },
      },
      {
        id: 'b7-no-way-back',
        title: 'The original MASTER EOA has no path back to authority',
        run: async (ctx) => {
          ctx.check(
            'old MASTER EOA holds no role',
            (await trustService.getRole(master.address)) === 0n,
            (await trustService.getRole(master.address)).toString(),
          );
          await ctx.expectRevert('old MASTER EOA calling setOverCapDelay directly', () =>
            token.connect(master).setOverCapDelay(1, { gasLimit: 200_000 }),
          );
          await ctx.expectRevert('old MASTER EOA calling setDSService directly', () =>
            token.connect(master).setDSService(DSConstants.services.MASTER_TIMELOCK, master.address, { gasLimit: 300_000 }),
          );
          await ctx.expectRevert('old MASTER EOA calling setServiceOwner directly', () =>
            trustService.connect(master).setServiceOwner(master.address, { gasLimit: 200_000 }),
          );

          // Losing the MASTER role is not the whole story: while the old EOA still holds
          // DEFAULT_ADMIN_ROLE on a timelock it can grant itself PROPOSER_ROLE and push anything
          // through after the delay. "No way back" only holds once that is renounced too.
          for (const [label, timelock] of [
            ['master', masterTimelock],
            ['compliance', complianceTimelock],
            ['roles', rolesTimelock],
          ] as const) {
            const adminRole = await timelock.DEFAULT_ADMIN_ROLE();
            ctx.check(
              `old MASTER EOA is not DEFAULT_ADMIN on the ${label} timelock`,
              !(await timelock.hasRole(adminRole, master.address)),
              `still admin would leave a delayed path back to authority`,
            );
          }
        },
      },
      {
        id: 'b8-schedule-master-gated',
        title: 'Schedule the Master-gated batch through the master timelock: unpause plus a config change',
        run: async (ctx) => {
          await ctx.send('pause (TRANSFER_AGENT, post-handover)', token.connect(transferAgent).pause());
          ctx.check('pause() is still instant after handover', (await token.isPaused()) === true, 'isPaused=true');

          await scheduleOp(
            ctx,
            'unpause',
            masterTimelock,
            args.token,
            token.interface.encodeFunctionData('unpause'),
            `bc2329-unpause-${Date.now()}`,
          );
          await scheduleOp(
            ctx,
            'masterGated',
            masterTimelock,
            args.token,
            token.interface.encodeFunctionData('setOverCapDelay', [1234]),
            `bc2329-master-gated-${Date.now()}`,
          );
          ctx.note(
            'operational consequence',
            `the token stays paused until the master timelock delay elapses — ` +
              `this is the real cost of routing unpause() through governance`,
          );
        },
      },
      {
        id: 'b9-execute-master-gated',
        title: 'Wait out the master minDelay, then execute the Master-gated batch',
        run: async (ctx) => {
          const eta = maxEta(ctx, ['unpause', 'masterGated']);
          const now = await ctx.blockTimestamp();
          if (now < eta) {
            return {
              waitUntil: eta,
              reason: `master timelock minDelay must elapse — the token remains paused until then (eta ${eta})`,
            };
          }
          await ctx.send('execute unpause via master timelock', executeOp(ctx, 'unpause', masterTimelock, executor));
          ctx.check('token unpaused through governance', (await token.isPaused()) === false, 'isPaused=false');

          await ctx.send('execute Master-gated config change', executeOp(ctx, 'masterGated', masterTimelock, executor));
          ctx.check(
            'Master-gated call took effect through the timelock',
            (await token.overCapDelay()) === 1234n,
            (await token.overCapDelay()).toString(),
          );

          await hre.run('verify-governance', {
            token: args.token,
            masterTimelock: args.masterTimelock,
            complianceTimelock: args.complianceTimelock,
            rolesTimelock: args.rolesTimelock,
            handedOver: true,
          });
          ctx.note('verify-governance (handed over)', 'passed');
        },
      },
    ];

    return runScenario(hre, {
      file: args.state,
      scenario: 'B (BC-2133 governance timelocks)',
      steps,
      allowUnknownChain: args.allowUnknownChain,
    });
  });
