import { task, types } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import fs from 'fs';
import { DSConstants } from '../utils/globals';

/**
 * On-chain state snapshot / diff for a DSToken suite (BC-2329 scenario C).
 *
 * Scenario C requires proving that an in-place upgrade left balances, investor data, locks and
 * roles untouched. Reading that by hand off a block explorer does not scale, so:
 *
 *   token-state --token <proxy> --wallets a,b --investors idA,idB --out before.json   # pre-upgrade
 *   upgrade-token --proxy <proxy>
 *   token-state --token <proxy> --wallets a,b --investors idA,idB --compare before.json
 *
 * The comparison ignores the implementation address (it is expected to change) and treats every
 * other difference as a failure. Throttle getters are read defensively so the same command works
 * against a pre-BC-2132 implementation, where they do not exist yet.
 */
task('token-state', 'Snapshot or diff the on-chain state of a DSToken suite')
  .addParam('token', 'DSToken proxy address', undefined, types.string)
  .addOptionalParam('wallets', 'Comma-separated wallet addresses to record balances and roles for', '', types.string)
  .addOptionalParam('investors', 'Comma-separated investor ids to record balances and lock counts for', '', types.string)
  .addOptionalParam('out', 'Write the snapshot to this file', undefined, types.string)
  .addOptionalParam('compare', 'Compare against a snapshot file and fail on any difference', undefined, types.string)
  .setAction(async (args, hre) => {
    const snapshot = await readTokenState(
      hre,
      args.token,
      splitCsv(args.wallets),
      splitCsv(args.investors),
    );

    console.log(JSON.stringify(snapshot, null, 2));

    if (args.out) {
      fs.writeFileSync(args.out, JSON.stringify(snapshot, null, 2));
      console.log(`\nsnapshot written to ${args.out}`);
    }

    if (args.compare) {
      const before = JSON.parse(fs.readFileSync(args.compare, 'utf8'));
      const all = diff(before, snapshot, IGNORED_ON_COMPARE);
      // Storage appended by the upgrade reads as null before and "0" after. That is the
      // safe-by-default outcome, so it is reported but not treated as drift. A new field
      // arriving non-zero means the upgrade enabled something and must still fail.
      const appeared = all.filter((d) => d.before === null && d.after === '0');
      const differences = all.filter((d) => !appeared.includes(d));

      console.log(`\nDiff against ${args.compare}`);
      for (const path of IGNORED_ON_COMPARE) {
        console.log(`  [ignored]  ${path}: ${get(before, path)} -> ${get(snapshot, path)}`);
      }
      for (const d of appeared) {
        console.log(`  [new]      ${d.path}: absent -> 0 (zero-initialised, nothing enabled)`);
      }
      if (differences.length === 0) {
        console.log('  no unexpected differences: balances, investor data, locks, roles and services all preserved');
      } else {
        for (const d of differences) console.log(`  [DIFF]     ${d.path}: ${d.before} -> ${d.after}`);
        throw new Error(`Token state changed in ${differences.length} field(s): ${differences.map((d) => d.path).join(', ')}`);
      }
    }

    return snapshot;
  });

/** Fields whose change across an upgrade is expected and must not fail the diff. */
const IGNORED_ON_COMPARE = ['implementation'];

function splitCsv(value: string): string[] {
  return value ? value.split(',').map((v) => v.trim()).filter(Boolean) : [];
}

async function readTokenState(hre: HardhatRuntimeEnvironment, proxy: string, wallets: string[], investors: string[]) {
  const token = await hre.ethers.getContractAt('DSToken', proxy);
  const trustService = await hre.ethers.getContractAt('TrustService', await token.getDSService(DSConstants.services.TRUST_SERVICE));
  const lockManagerAddress = await token.getDSService(DSConstants.services.LOCK_MANAGER);
  const lockManager = await hre.ethers.getContractAt('InvestorLockManager', lockManagerAddress);

  const services: Record<string, string> = {};
  for (const [name, id] of Object.entries(DSConstants.services)) {
    if (name.startsWith('DEPRECATED_')) continue;
    services[name] = await token.getDSService(id);
  }

  const walletState: Record<string, { balance: string; role: string }> = {};
  for (const wallet of wallets) {
    walletState[wallet] = {
      balance: (await token.balanceOf(wallet)).toString(),
      role: (await trustService.getRole(wallet)).toString(),
    };
  }

  const investorState: Record<string, { balance: string; lockCount: string }> = {};
  for (const investor of investors) {
    investorState[investor] = {
      balance: (await token.balanceOfInvestor(investor)).toString(),
      lockCount: (await lockManager.lockCountForInvestor(investor)).toString(),
    };
  }

  return {
    token: proxy,
    implementation: await hre.upgrades.erc1967.getImplementationAddress(proxy),
    name: await token.name(),
    symbol: await token.symbol(),
    decimals: (await token.decimals()).toString(),
    totalSupply: (await token.totalSupply()).toString(),
    totalIssued: (await token.totalIssued()).toString(),
    walletCount: (await token.walletCount()).toString(),
    paused: await token.isPaused(),
    supportedFeatures: String(await token.supportedFeatures()),
    // Absent before BC-2132; null keeps the snapshot comparable across the upgrade boundary.
    throttle: {
      mintCapAmount: await optional(() => token.mintCapAmount()),
      mintCapWindow: await optional(() => token.mintCapWindow()),
      windowStart: await optional(() => token.windowStart()),
      mintedInWindow: await optional(() => token.mintedInWindow()),
      overCapDelay: await optional(() => token.overCapDelay()),
      overCapGracePeriod: await optional(() => token.overCapGracePeriod()),
    },
    services,
    wallets: walletState,
    investors: investorState,
  };
}

/** Returns null instead of throwing when a getter is absent from the deployed implementation. */
async function optional(read: () => Promise<bigint>): Promise<string | null> {
  try {
    return (await read()).toString();
  } catch {
    return null;
  }
}

function get(object: any, path: string): unknown {
  return path.split('.').reduce((acc, key) => acc?.[key], object);
}

function diff(before: any, after: any, ignored: string[], prefix = ''): { path: string; before: any; after: any }[] {
  const out: { path: string; before: any; after: any }[] = [];
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);

  for (const key of keys) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (ignored.includes(path)) continue;

    const a = before?.[key];
    const b = after?.[key];
    if (a !== null && b !== null && typeof a === 'object' && typeof b === 'object') {
      out.push(...diff(a, b, ignored, path));
    } else if (a !== b) {
      out.push({ path, before: a, after: b });
    }
  }
  return out;
}
