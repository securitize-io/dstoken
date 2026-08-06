import fs from 'fs';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { assertKnownTestnet } from '../utils/network.helper';
import { resolveSigner } from '../utils/task.helper';

/**
 * Resumable step runner for the BC-2329 testnet QA scenarios.
 *
 * The scenarios wait out real delays (mint-cap windows, over-cap delays, timelock minDelays),
 * so they cannot run as one long-lived process. Each invocation advances as far as it can,
 * persists everything it learned to a JSON run-state file, and when it hits a wait it prints
 * when to come back and exits cleanly. Re-running the same command resumes from that point,
 * so a scenario can span hours or days and still produce one auditable record.
 *
 * Every transaction is recorded with its hash, gas used and an explorer link, which is what
 * gets pasted into the ticket.
 */

export interface TxRecord {
  label: string;
  hash: string;
  gasUsed: string;
  status: 'success' | 'reverted';
  reason?: string;
  url: string;
}

interface StepState {
  status: 'done';
  at: string;
  txs: TxRecord[];
  notes: Record<string, string>;
}

export interface RunState {
  scenario: string;
  network: string;
  chainId: string;
  createdAt: string;
  updatedAt: string;
  vars: Record<string, string>;
  steps: Record<string, StepState>;
  pendingWait?: { stepId: string; until: number; reason: string };
}

export interface StepContext {
  hre: HardhatRuntimeEnvironment;
  /** Sends a tx, waits for it, records hash/gas/explorer link. Throws if it reverts. */
  send(label: string, tx: Promise<any>): Promise<any>;
  /**
   * Sends a tx that is expected to revert, with an explicit gasLimit so it is actually mined
   * instead of failing gas estimation off-chain. Records the reverted tx. Throws if it succeeds.
   */
  expectRevert(label: string, send: () => Promise<any>, gasLimit?: number): Promise<void>;
  /** Records a named value in the run state so later steps (and later runs) can read it. */
  set(key: string, value: string): void;
  get(key: string): string | undefined;
  /** Attaches an observation to this step's record. */
  note(key: string, value: unknown): void;
  /** Fails the step with a clear message. */
  check(label: string, ok: boolean, detail: string): void;
  /** Latest block timestamp, which is what the contracts compare against. */
  blockTimestamp(): Promise<number>;
}

export interface Step {
  id: string;
  title: string;
  /**
   * Return a wait instruction to pause until a chain timestamp is reached, or a stop instruction
   * to end the run cleanly at a deliberate boundary (e.g. before an irreversible phase). A stop is
   * a successful outcome, not a failure — everything before it passed.
   */
  run: (ctx: StepContext) => Promise<void | { waitUntil: number; reason: string } | { stop: string }>;
}

const EXPLORERS: Record<string, string> = {
  '11155111': 'https://sepolia.etherscan.io',
  '421614': 'https://sepolia.arbiscan.io',
  '11155420': 'https://sepolia-optimism.etherscan.io',
  '43113': 'https://testnet.snowtrace.io',
};

export function explorerTx(chainId: string, hash: string): string {
  const base = EXPLORERS[chainId];
  return base ? `${base}/tx/${hash}` : `(no explorer configured for chainId ${chainId}) ${hash}`;
}

export function explorerAddress(chainId: string, address: string): string {
  const base = EXPLORERS[chainId];
  return base ? `${base}/address/${address}` : `(no explorer configured for chainId ${chainId}) ${address}`;
}

function load(file: string, scenario: string, network: string, chainId: string): RunState {
  if (fs.existsSync(file)) {
    const state: RunState = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (state.chainId !== chainId) {
      throw new Error(`Run state ${file} was recorded on chainId ${state.chainId}, but you are on ${chainId}`);
    }
    return state;
  }
  const now = new Date().toISOString();
  return { scenario, network, chainId, createdAt: now, updatedAt: now, vars: {}, steps: {} };
}

function save(file: string, state: RunState) {
  state.updatedAt = new Date().toISOString();
  fs.writeFileSync(file, JSON.stringify(state, null, 2));
}

/**
 * Runs the steps in order, skipping ones already recorded as done. Returns true when the whole
 * scenario is complete, false when it stopped on a wait.
 */
export async function runScenario(
  hre: HardhatRuntimeEnvironment,
  opts: { file: string; scenario: string; steps: Step[]; allowUnknownChain?: boolean },
): Promise<boolean> {
  const chainId = await assertKnownTestnet(hre, opts.allowUnknownChain);
  const state = load(opts.file, opts.scenario, hre.network.name, chainId);

  console.log(`\nScenario ${opts.scenario} on ${hre.network.name} (chainId ${chainId})`);
  console.log(`Run state: ${opts.file}\n`);

  for (const step of opts.steps) {
    if (state.steps[step.id]) {
      console.log(`[skip] ${step.id} — ${step.title} (done ${state.steps[step.id].at})`);
      continue;
    }

    console.log(`[run ] ${step.id} — ${step.title}`);
    const txs: TxRecord[] = [];
    const notes: Record<string, string> = {};
    const failures: string[] = [];

    const ctx: StepContext = {
      hre,
      async send(label, txPromise) {
        const tx = await txPromise;
        const receipt = await tx.wait();
        const record: TxRecord = {
          label,
          hash: tx.hash,
          gasUsed: receipt.gasUsed.toString(),
          status: 'success',
          url: explorerTx(chainId, tx.hash),
        };
        txs.push(record);
        console.log(`       tx ${label}: ${record.url} (gas ${record.gasUsed})`);
        return receipt;
      },
      async expectRevert(label, send, gasLimit = 500_000) {
        let hash = '';
        try {
          const tx = await send();
          hash = tx.hash;
          await tx.wait();
        } catch (error: any) {
          const receipt = error?.receipt;
          hash = receipt?.hash ?? hash;
          const reason = error?.reason ?? error?.shortMessage ?? String(error?.message ?? error).slice(0, 160);
          const record: TxRecord = {
            label,
            hash: hash || '(rejected before broadcast)',
            gasUsed: receipt?.gasUsed?.toString() ?? '0',
            status: 'reverted',
            reason,
            url: hash ? explorerTx(chainId, hash) : '(not mined)',
            };
          txs.push(record);
          console.log(`       reverted as expected ${label}: ${reason}`);
          if (!hash) {
            console.log(
              `       NOTE: no tx hash — the node rejected this before mining it, so there is no on-chain\n` +
                `       revert to link in the ticket. The Hardhat network always behaves this way; public\n` +
                `       testnets mine a failed tx when a gasLimit is supplied (this call used ${gasLimit}).\n` +
                `       This is precisely why BC-2329 requires a public testnet.`,
            );
          }
          return;
        }
        failures.push(`${label} was expected to revert but succeeded (tx ${hash})`);
      },
      set(key, value) {
        state.vars[key] = value;
      },
      get(key) {
        return state.vars[key];
      },
      note(key, value) {
        notes[key] = String(value);
        console.log(`       ${key}: ${value}`);
      },
      check(label, ok, detail) {
        console.log(`       [${ok ? 'PASS' : 'FAIL'}] ${label}: ${detail}`);
        notes[label] = `${ok ? 'PASS' : 'FAIL'} ${detail}`;
        if (!ok) failures.push(`${label}: ${detail}`);
      },
      async blockTimestamp() {
        return (await hre.ethers.provider.getBlock('latest'))!.timestamp;
      },
    };

    let outcome: void | { waitUntil: number; reason: string } | { stop: string };
    try {
      outcome = await step.run(ctx);
    } catch (error) {
      // The step is left un-done so a re-run retries it, but vars and any txs it already
      // broadcast are persisted — those are on-chain and belong in the audit trail.
      save(opts.file, state);
      if (txs.length > 0) {
        console.log(`       txs broadcast before the failure:`);
        for (const tx of txs) console.log(`         ${tx.label}: ${tx.url}`);
      }
      console.log(`\nStep ${step.id} failed. Fix the cause and re-run the same command to retry this step.`);
      throw error;
    }

    if (outcome && 'stop' in outcome) {
      save(opts.file, state);
      console.log(`\nStopping here by design: ${outcome.stop}`);
      console.log(`\nEverything up to this point passed. Gas so far:`);
      printGas(state);
      return false;
    }

    if (outcome && 'waitUntil' in outcome) {
      const now = await ctx.blockTimestamp();
      const seconds = outcome.waitUntil - now;
      state.pendingWait = { stepId: step.id, until: outcome.waitUntil, reason: outcome.reason };
      save(opts.file, state);
      console.log(
        `\nWaiting on real time: ${outcome.reason}\n` +
          `  chain timestamp now: ${now} (${new Date(now * 1000).toISOString()})\n` +
          `  resume after:        ${outcome.waitUntil} (${new Date(outcome.waitUntil * 1000).toISOString()}, ~${Math.max(0, Math.ceil(seconds / 60))} min)\n` +
          `Re-run the same command after that to continue from step ${step.id}.`,
      );
      return false;
    }

    if (failures.length > 0) {
      save(opts.file, state);
      throw new Error(`Step ${step.id} failed:\n  - ${failures.join('\n  - ')}`);
    }

    state.steps[step.id] = { status: 'done', at: new Date().toISOString(), txs, notes };
    delete state.pendingWait;
    save(opts.file, state);
  }

  console.log(`\nScenario ${opts.scenario} complete. Gas summary:`);
  printGas(state);
  return true;
}

export function printGas(state: RunState) {
  let total = 0n;
  for (const [stepId, step] of Object.entries(state.steps)) {
    for (const tx of step.txs) {
      console.log(`  ${stepId.padEnd(28)} ${tx.label.padEnd(44)} ${tx.gasUsed.padStart(9)}  ${tx.status}`);
      total += BigInt(tx.gasUsed);
    }
  }
  console.log(`  ${''.padEnd(28)} ${'TOTAL'.padEnd(44)} ${total.toString().padStart(9)}`);
}

/**
 * Resolves the per-role signers the scenarios need, failing loudly when they are shared.
 *
 * Roles map to signer indices positionally by default, but a pre-existing token often does not
 * follow that layout — its MASTER may be a wallet configured at another index. `overrides` lets a
 * scenario be pointed at the right wallet per role without reshuffling the account list, which
 * would move every other role.
 */
export async function resolveRoleSigners(
  hre: HardhatRuntimeEnvironment,
  required: string[],
  overrides: Record<string, string> = {},
) {
  const signers = await hre.ethers.getSigners();
  for (const role of Object.keys(overrides)) {
    if (!required.includes(role)) {
      throw new Error(`--roles names "${role}", which this scenario does not use (expects: ${required.join(', ')})`);
    }
  }
  if (signers.length < required.length && Object.keys(overrides).length === 0) {
    throw new Error(
      `This scenario needs ${required.length} distinct signers (${required.join(', ')}) but the network is ` +
        `configured with ${signers.length}. Set the per-role private keys listed in .env.local — reusing one ` +
        `signer for every role hides access-control bugs, which is exactly what BC-2329 is meant to catch.`,
    );
  }
  const resolved: Record<string, any> = {};
  const unfunded: string[] = [];
  const duplicates = new Map<string, string>();

  for (const [index, role] of required.entries()) {
    const signer = overrides[role] ? await resolveSigner(hre, overrides[role]) : signers[index];
    resolved[role] = signer;

    const balance = await hre.ethers.provider.getBalance(signer.address);
    console.log(`  ${role}: ${signer.address} (${hre.ethers.formatEther(balance)} ETH)`);
    if (balance === 0n) unfunded.push(`${role} (${signer.address})`);

    const seen = duplicates.get(signer.address.toLowerCase());
    if (seen) {
      throw new Error(
        `${role} and ${seen} resolve to the same address ${signer.address}. The scenarios assert that ` +
          `one role cannot do another's job, and a shared signer turns those assertions into false passes. ` +
          `Give each role its own key (see .env.local).`,
      );
    }
    duplicates.set(signer.address.toLowerCase(), role);
  }

  // Running out of gas halfway through leaves a scenario half-applied on-chain, which is far more
  // annoying to unpick than failing up front.
  if (unfunded.length > 0) {
    throw new Error(`These wallets have a zero balance and cannot send transactions: ${unfunded.join(', ')}`);
  }
  return resolved;
}

/** Parses a --roles value like "master=6,issuer=0x1234..." into a role -> signer map. */
export function parseRoleOverrides(value?: string): Record<string, string> {
  if (!value) return {};
  const out: Record<string, string> = {};
  for (const part of value.split(',')) {
    const [role, signer] = part.split('=').map((v) => v.trim());
    if (!role || !signer) throw new Error(`--roles entry "${part}" is not of the form role=indexOrAddress`);
    out[role] = signer;
  }
  return out;
}
