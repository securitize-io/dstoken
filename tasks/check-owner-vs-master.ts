import { task, types } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DSConstants } from '../utils/globals';

/**
 * Reports, for every contract in one or more DS suites, whether its Ownable `owner()` also holds the
 * MASTER role — and flags the ones where it does not.
 *
 * WHY THIS EXISTS
 *
 * `onlyMaster` is not "holds the MASTER role". In ServiceConsumer it is:
 *
 *     if (owner() != msg.sender) require(getTrustService().getRole(msg.sender) == ROLE_MASTER, ...)
 *
 * an OR. So a contract's `owner()` passes `onlyMaster` regardless of its role — including
 * `_authorizeUpgrade`, which means such a wallet can replace the implementation. `owner()` and the
 * MASTER role are separate storage in separate contracts: `TrustService.setServiceOwner` keeps the
 * TrustService's own internal `owner` in sync with the role, but never calls `transferOwnership` on
 * any ServiceConsumer. Nothing enforces the invariant, so it drifts — through ordinary operational
 * history, not only through mistakes.
 *
 * Reviewing "is this suite governed?" by the MASTER role alone therefore gives the wrong answer.
 * This task answers it properly.
 *
 * STRICTLY READ-ONLY. Every call is a view call; the task never builds, signs or sends a
 * transaction, and needs no private key configured for the target network. That makes it safe to
 * point at production. It also does not apply the testnet chain guard, precisely so it can be used
 * there.
 *
 *   npx hardhat check-owner-vs-master --network <net> --tokens 0xAAA,0xBBB
 */
task('check-owner-vs-master', 'Read-only audit: which owner() addresses do not hold the MASTER role')
  .addParam('tokens', 'Comma-separated DSToken proxy addresses', undefined, types.string)
  .addOptionalParam('json', 'Write the full result to this file', undefined, types.string)
  .setAction(async (args, hre) => {
    const chainId = (await hre.ethers.provider.getNetwork()).chainId.toString();
    console.log(`\nREAD-ONLY audit · ${hre.network.name} · chainId ${chainId}`);
    console.log('No transaction is built, signed or sent.\n');

    const tokens: string[] = args.tokens.split(',').map((t: string) => t.trim()).filter(Boolean);
    const results = [];
    let totalFlagged = 0;

    for (const proxy of tokens) {
      const result = await auditSuite(hre, proxy);
      results.push(result);
      totalFlagged += result.flagged.length;
    }

    console.log('\n══ Summary ══');
    for (const r of results) {
      if (r.error) {
        console.log(`  ${r.token}  ERROR: ${r.error}`);
        continue;
      }
      const verdict = r.flagged.length === 0
        ? 'every owner() holds MASTER'
        : `${r.flagged.length} contract(s) with an owner() that does NOT hold MASTER: ${r.flagged.map((f: any) => f.name).join(', ')}`;
      console.log(`  ${r.token}  ${r.name ?? ''}`);
      console.log(`    ${verdict}`);
    }
    console.log(`\n  ${totalFlagged} flagged across ${tokens.length} suite(s)`);
    if (totalFlagged > 0) {
      console.log('  Each flagged owner() can pass onlyMaster on its contract, including _authorizeUpgrade.');
      console.log('  Fix with transferOwnership from the current owner to the intended authority.');
    }

    if (args.json) {
      const fs = await import('fs');
      fs.writeFileSync(args.json, JSON.stringify({ chainId, network: hre.network.name, results }, null, 2));
      console.log(`\n  full result -> ${args.json}`);
    }
    return results;
  });

const ROLE_NAME: Record<string, string> = {
  '0': 'NONE', '1': 'MASTER', '2': 'ISSUER', '4': 'EXCHANGE', '8': 'TRANSFER_AGENT',
};

async function auditSuite(hre: HardhatRuntimeEnvironment, proxy: string) {
  const OWNABLE = ['function owner() view returns (address)'];
  const TOKEN = [
    'function getDSService(uint256) view returns (address)',
    'function name() view returns (string)',
  ];
  const TRUST = ['function getRole(address) view returns (uint8)'];

  const flagged: { name: string; address: string; owner: string; role: string }[] = [];
  const contracts: { name: string; address: string; owner: string | null; role: string | null }[] = [];

  try {
    const token = await hre.ethers.getContractAt(TOKEN, proxy);
    const name = await token.name().catch(() => '(name unavailable)');
    const trustAddress = await token.getDSService(DSConstants.services.TRUST_SERVICE);
    if (trustAddress === hre.ethers.ZeroAddress) {
      return { token: proxy, name, error: 'no TRUST_SERVICE registered — is this a DSToken proxy?', flagged, contracts };
    }
    const trust = await hre.ethers.getContractAt(TRUST, trustAddress);

    console.log(`── ${proxy}  ${name}`);
    console.log(`   TrustService ${trustAddress}`);

    const targets: [string, string][] = [['DS_TOKEN', proxy]];
    for (const [serviceName, id] of Object.entries(DSConstants.services)) {
      if (serviceName.startsWith('DEPRECATED_') || serviceName === 'DS_TOKEN') continue;
      const address = await token.getDSService(id);
      if (address !== hre.ethers.ZeroAddress) targets.push([serviceName, address]);
    }

    for (const [serviceName, address] of targets) {
      let owner: string;
      try {
        owner = await (await hre.ethers.getContractAt(OWNABLE, address)).owner();
      } catch {
        contracts.push({ name: serviceName, address, owner: null, role: null });
        console.log(`   ${serviceName.padEnd(34)} not Ownable`);
        continue;
      }
      const role = String(await trust.getRole(owner));
      contracts.push({ name: serviceName, address, owner, role });
      const isMaster = role === '1';
      if (!isMaster) flagged.push({ name: serviceName, address, owner, role });
      console.log(
        `   ${serviceName.padEnd(34)} owner ${owner} role ${role} (${ROLE_NAME[role] ?? '?'})` +
          (isMaster ? '' : '   <<< NOT MASTER'),
      );
    }
    return { token: proxy, name, error: null, flagged, contracts };
  } catch (error: any) {
    console.log(`── ${proxy}  ERROR: ${error?.shortMessage ?? error?.message ?? error}`);
    return { token: proxy, name: null, error: String(error?.shortMessage ?? error?.message ?? error), flagged, contracts };
  }
}
