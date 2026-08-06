import { task, types } from 'hardhat/config';
import { DSConstants } from '../utils/globals';
import { Step, runScenario, resolveRoleSigners, parseRoleOverrides, explorerAddress } from './qa/runner';
import { assertKnownTestnet } from './utils/network.helper';

/**
 * BC-2329 scenario A: mint cap and over-cap timelock, with real testnet timing.
 *
 * Resumable — the window rollover, the over-cap delay and the grace-period expiry are waited out
 * in wall-clock time. Run the command, come back when it tells you to, run it again.
 *
 *   npx hardhat qa-scenario-a --network sepolia --token 0x... --state qa-a-sepolia.json \
 *     --cap 1000 --window 600 --delay 900 --grace 600
 *
 * No evm_increaseTime anywhere: everything advances on the chain's own clock.
 */
task('qa-scenario-a', 'BC-2329 scenario A: mint cap and over-cap timelock on a live network')
  .addParam('token', 'DSToken proxy address', undefined, types.string)
  .addParam('state', 'Run-state JSON file (created on first run, resumed afterwards)', undefined, types.string)
  .addOptionalParam('cap', 'Mint cap amount, in token base units', '1000', types.string)
  .addOptionalParam('window', 'Mint cap window in seconds', 600, types.int)
  .addOptionalParam('delay', 'Over-cap delay in seconds', 900, types.int)
  .addOptionalParam('grace', 'Over-cap grace period in seconds', 600, types.int)
  .addOptionalParam('recipient', 'Issuance recipient (defaults to the issuer wallet)', undefined, types.string)
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

    const cap = BigInt(args.cap);
    const overCapAmount = cap * 10n; // deliberately over the cap, so it needs the timelock

    console.log('Role wallets:');
    const { master, issuer } = await resolveRoleSigners(hre, ['master', 'issuer'], parseRoleOverrides(args.roles));
    const token: any = await hre.ethers.getContractAt('DSToken', args.token);
    const recipient: string = args.recipient ?? issuer.address;

    const steps: Step[] = [
      {
        id: 'a0-preflight',
        title: 'Confirm roles and that the recipient can receive issuance',
        run: async (ctx) => {
          const trustService: any = await hre.ethers.getContractAt(
            'TrustService',
            await token.getDSService(DSConstants.services.TRUST_SERVICE),
          );
          const masterRole = await trustService.getRole(master.address);
          const issuerRole = await trustService.getRole(issuer.address);
          const chainId = (await hre.ethers.provider.getNetwork()).chainId.toString();
          ctx.note('token', explorerAddress(chainId, args.token));
          ctx.check('master wallet holds MASTER', masterRole === BigInt(DSConstants.roles.MASTER), `getRole=${masterRole}`);
          ctx.check(
            'issuer wallet holds ISSUER or above',
            issuerRole === BigInt(DSConstants.roles.ISSUER) || issuerRole === BigInt(DSConstants.roles.MASTER),
            `getRole=${issuerRole}`,
          );
          ctx.note('recipient', recipient);
          ctx.note('totalIssued before the scenario', (await token.totalIssued()).toString());
        },
      },
      {
        id: 'a1-set-mint-cap',
        title: `setMintCap(${cap}, ${args.window}s) from MASTER`,
        run: async (ctx) => {
          await ctx.send('setMintCap', token.connect(master).setMintCap(cap, args.window));
          const [amount, window, windowStart, minted] = await Promise.all([
            token.mintCapAmount(),
            token.mintCapWindow(),
            token.windowStart(),
            token.mintedInWindow(),
          ]);
          ctx.check('mintCapAmount on-chain', amount === cap, amount.toString());
          ctx.check('mintCapWindow on-chain', window === BigInt(args.window), window.toString());
          ctx.check('window counter reset', minted === 0n, `mintedInWindow=${minted}`);
          ctx.note('windowStart', windowStart.toString());
          ctx.set('windowStart', windowStart.toString());
        },
      },
      {
        id: 'a2-issue-to-cap',
        title: 'Issue exactly up to the cap from ISSUER',
        run: async (ctx) => {
          await ctx.send('issueTokens (fills the cap)', token.connect(issuer).issueTokens(recipient, cap));
          const minted = await token.mintedInWindow();
          ctx.check('mintedInWindow equals the cap', minted === cap, minted.toString());
        },
      },
      {
        id: 'a3-over-cap-reverts',
        title: 'Next issuance must revert on-chain, not just in a static call',
        run: async (ctx) => {
          await ctx.expectRevert('issueTokens beyond the cap', () =>
            token.connect(issuer).issueTokens(recipient, 1, { gasLimit: 600_000 }),
          );
        },
      },
      {
        id: 'a4-window-rollover',
        title: 'Wait out the real window, then confirm minting resumes with no extra tx',
        run: async (ctx) => {
          const windowStart = BigInt(ctx.get('windowStart')!);
          const resumeAt = Number(windowStart) + Number(args.window);
          const now = await ctx.blockTimestamp();
          if (now < resumeAt) {
            return { waitUntil: resumeAt, reason: `mint cap window of ${args.window}s must elapse (tumbling window)` };
          }
          await ctx.send('issueTokens (after rollover)', token.connect(issuer).issueTokens(recipient, cap));
          const minted = await token.mintedInWindow();
          ctx.check(
            'window reset itself with no administrative tx',
            minted === cap,
            `mintedInWindow=${minted} after a fresh full-cap issuance`,
          );
          ctx.set('windowStart', (await token.windowStart()).toString());
        },
      },
      {
        id: 'a5-set-over-cap-delay',
        title: `setOverCapDelay(${args.delay}s) from MASTER, grace left at 0`,
        run: async (ctx) => {
          await ctx.send('setOverCapDelay', token.connect(master).setOverCapDelay(args.delay));
          await ctx.send('setOverCapGracePeriod (0 = no expiry)', token.connect(master).setOverCapGracePeriod(0));
          ctx.check('overCapDelay on-chain', (await token.overCapDelay()) === BigInt(args.delay), args.delay);
          // The grace period is deliberately enabled later, only for the operation that is meant
          // to expire (a10). Scheduling the executable operation while grace is 0 gives it
          // expiresAt = 0 (never expires), so a slow resume cycle cannot make step a8 miss its
          // execution window and destroy the run.
          ctx.check('overCapGracePeriod on-chain', (await token.overCapGracePeriod()) === 0n, 'grace disabled for now');
        },
      },
      {
        id: 'a6-schedule-over-cap',
        title: `Schedule an over-cap issuance of ${overCapAmount} from ISSUER`,
        run: async (ctx) => {
          const salt = hre.ethers.id(`bc-2329-execute-${Date.now()}`);
          const receipt = await ctx.send(
            'scheduleOverCapIssuance',
            token.connect(issuer).scheduleOverCapIssuance(recipient, overCapAmount, salt),
          );
          const operationId = findOperationId(token, receipt);
          const pending = await token.pendingMints(operationId);
          ctx.set('executeOpId', operationId);
          ctx.set('executeReadyAt', pending.readyAt.toString());
          ctx.note('operationId', operationId);
          ctx.note('readyAt', `${pending.readyAt} (${new Date(Number(pending.readyAt) * 1000).toISOString()})`);
          ctx.check('scheduled amount matches', pending.amount === overCapAmount, pending.amount.toString());
          ctx.check(
            'grace period of 0 stores expiresAt = 0 (never expires)',
            pending.expiresAt === 0n,
            pending.expiresAt.toString(),
          );
        },
      },
      {
        id: 'a7-execute-too-early',
        title: 'executeOverCapMint before readyAt must revert on-chain',
        run: async (ctx) => {
          await ctx.expectRevert('executeOverCapMint (too early)', () =>
            token.connect(issuer).executeOverCapMint(ctx.get('executeOpId')!, { gasLimit: 600_000 }),
          );
        },
      },
      {
        id: 'a8-execute-after-delay',
        title: 'Wait out the real over-cap delay, then execute',
        run: async (ctx) => {
          const readyAt = Number(ctx.get('executeReadyAt')!);
          const now = await ctx.blockTimestamp();
          if (now < readyAt) {
            return { waitUntil: readyAt, reason: `over-cap delay of ${args.delay}s must elapse` };
          }
          const pendingBefore = await token.pendingMints(ctx.get('executeOpId')!);
          if (pendingBefore.expiresAt !== 0n && BigInt(now) >= pendingBefore.expiresAt) {
            throw new Error(
              `Operation ${ctx.get('executeOpId')} expired at ${pendingBefore.expiresAt} before it could be executed ` +
                `(chain time ${now}). Re-run with a larger --grace, or 0, so the executable operation has room; ` +
                `expiry is exercised separately in step a11.`,
            );
          }
          const mintedBefore = await token.mintedInWindow();
          const balanceBefore = await token.balanceOf(recipient);
          await ctx.send('executeOverCapMint', token.connect(issuer).executeOverCapMint(ctx.get('executeOpId')!));
          ctx.check(
            'recipient credited the full over-cap amount',
            (await token.balanceOf(recipient)) === balanceBefore + overCapAmount,
            (await token.balanceOf(recipient)).toString(),
          );
          ctx.check(
            'over-cap execution does not consume the window budget',
            (await token.mintedInWindow()) === mintedBefore,
            `mintedInWindow ${mintedBefore} -> ${await token.mintedInWindow()}`,
          );
          const pending = await token.pendingMints(ctx.get('executeOpId')!);
          ctx.check('operation marked executed', pending.executed === true, `executed=${pending.executed}`);
        },
      },
      {
        id: 'a9-cancel-mid-delay',
        title: 'Schedule another operation and cancel it mid-delay from MASTER',
        run: async (ctx) => {
          const salt = hre.ethers.id(`bc-2329-cancel-${Date.now()}`);
          const receipt = await ctx.send(
            'scheduleOverCapIssuance (to cancel)',
            token.connect(issuer).scheduleOverCapIssuance(recipient, overCapAmount, salt),
          );
          const operationId = findOperationId(token, receipt);
          ctx.note('operationId', operationId);
          await ctx.send('cancelOverCapMint', token.connect(master).cancelOverCapMint(operationId));
          const pending = await token.pendingMints(operationId);
          ctx.check('operation marked cancelled', pending.cancelled === true, `cancelled=${pending.cancelled}`);
          await ctx.expectRevert('executeOverCapMint on a cancelled operation', () =>
            token.connect(issuer).executeOverCapMint(operationId, { gasLimit: 600_000 }),
          );
        },
      },
      {
        id: 'a10-schedule-to-expire',
        title: `Enable a ${args.grace}s grace period, then schedule an operation to leave expiring`,
        run: async (ctx) => {
          await ctx.send('setOverCapGracePeriod', token.connect(master).setOverCapGracePeriod(args.grace));
          ctx.check('overCapGracePeriod on-chain', (await token.overCapGracePeriod()) === BigInt(args.grace), args.grace);
          const salt = hre.ethers.id(`bc-2329-expire-${Date.now()}`);
          const receipt = await ctx.send(
            'scheduleOverCapIssuance (to expire)',
            token.connect(issuer).scheduleOverCapIssuance(recipient, overCapAmount, salt),
          );
          const operationId = findOperationId(token, receipt);
          const pending = await token.pendingMints(operationId);
          ctx.set('expireOpId', operationId);
          ctx.set('expireExpiresAt', pending.expiresAt.toString());
          ctx.note('operationId', operationId);
          ctx.note('expiresAt', `${pending.expiresAt} (${new Date(Number(pending.expiresAt) * 1000).toISOString()})`);
          ctx.check('grace period produced a finite expiry', pending.expiresAt > 0n, pending.expiresAt.toString());
        },
      },
      {
        id: 'a11-expired-reverts',
        title: 'Wait past the real grace period, then confirm execution reverts as expired',
        run: async (ctx) => {
          const expiresAt = Number(ctx.get('expireExpiresAt')!);
          const now = await ctx.blockTimestamp();
          if (now < expiresAt) {
            return { waitUntil: expiresAt, reason: `over-cap grace period must elapse (expiresAt ${expiresAt})` };
          }
          await ctx.expectRevert('executeOverCapMint on an expired operation', () =>
            token.connect(issuer).executeOverCapMint(ctx.get('expireOpId')!, { gasLimit: 600_000 }),
          );
        },
      },
    ];

    return runScenario(hre, {
      file: args.state,
      scenario: 'A (BC-2132 mint cap and over-cap timelock)',
      steps,
      allowUnknownChain: args.allowUnknownChain,
    });
  });

function findOperationId(token: any, receipt: any): string {
  for (const log of receipt.logs) {
    try {
      const parsed = token.interface.parseLog(log);
      if (parsed?.name === 'OverCapMintScheduled') return parsed.args.operationId;
    } catch {
      /* not a DSToken event */
    }
  }
  throw new Error('OverCapMintScheduled event not found in the schedule receipt');
}
