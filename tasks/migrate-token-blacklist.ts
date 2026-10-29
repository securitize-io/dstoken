import { task, types } from 'hardhat/config';
import { DSConstants } from '../utils/globals';
import { assertAddress } from './utils/task.helper';

interface PlannedCall {
  description: string;
  target: string;
  data: string;
  send: () => Promise<any>;
}

/**
 * BC-2643: moves a GlobalWhitelisted token from its local BlackListManager to the shared one.
 * Service 8197 is read from two maps, the DSToken (TSV checker) and the ComplianceService
 * (compliance), so both are repointed. Entries are copied first so the token is never left
 * pointing at a list that is missing wallets it used to block.
 *
 * Default is a dry run that prints target + calldata for each call (mainnet masters are
 * Fireblocks wallets). --execute sends them from the signer and stops on the first failure.
 * Idempotent: wallets already on the global list and maps already repointed are skipped.
 */
task('migrate-token-blacklist', 'Migrate a token to a shared global BlackListManager (dry run by default)')
  .addParam('token', 'DSToken proxy address', undefined, types.string)
  .addParam('global', 'Global BlackListManager address', undefined, types.string)
  .addOptionalParam('execute', 'Send the transactions from the signer instead of printing them', false, types.boolean)
  .setAction(async (args, hre) => {
    const { ethers } = hre;
    const tokenAddress = assertAddress('--token', args.token, hre);
    const globalAddress = assertAddress('--global', args.global, hre);

    if ((await ethers.provider.getCode(globalAddress)) === '0x') {
      throw new Error(`No contract at --global ${globalAddress}`);
    }
    if ((await ethers.provider.getCode(tokenAddress)) === '0x') {
      throw new Error(`No contract at --token ${tokenAddress}`);
    }

    const token = await ethers.getContractAt('DSToken', tokenAddress);
    const globalBlm = await ethers.getContractAt('BlackListManager', globalAddress);
    // Catch a wrong contract at the address before planning anything.
    try {
      await globalBlm.isBlacklisted(ethers.ZeroAddress);
    } catch {
      throw new Error(`--global ${globalAddress} does not answer isBlacklisted(address)`);
    }

    const complianceAddress = await token.getDSService(DSConstants.services.COMPLIANCE_SERVICE);
    if (complianceAddress === ethers.ZeroAddress || (await ethers.provider.getCode(complianceAddress)) === '0x') {
      throw new Error(`Compliance service (8) of token ${tokenAddress} is not reachable (${complianceAddress})`);
    }
    const compliance = await ethers.getContractAt('ComplianceServiceGlobalWhitelisted', complianceAddress);

    const tokenBlm = await token.getDSService(DSConstants.services.BLACKLIST_MANAGER);
    const complianceBlm = await compliance.getDSService(DSConstants.services.BLACKLIST_MANAGER);
    console.log(`Token ${tokenAddress}`);
    console.log(`  compliance service (8): ${complianceAddress}`);
    console.log(`  token 8197:             ${tokenBlm}`);
    console.log(`  compliance 8197:        ${complianceBlm}`);
    console.log(`  global:                 ${globalAddress}`);

    // Collect entries from the token's current list, and from the compliance list if it differs.
    const sources = new Set<string>();
    for (const source of [tokenBlm, complianceBlm]) {
      if (source !== ethers.ZeroAddress && source !== globalAddress) sources.add(source);
    }
    const entries = new Map<string, string>();
    for (const source of sources) {
      if ((await ethers.provider.getCode(source)) === '0x') {
        throw new Error(`Current blacklist manager ${source} has no code`);
      }
      const local = await ethers.getContractAt('BlackListManager', source);
      for (const wallet of await local.getBlacklistedWallets()) {
        if (!entries.has(wallet)) entries.set(wallet, await local.getBlacklistReason(wallet));
      }
    }

    const missing: Array<[string, string]> = [];
    for (const [wallet, reason] of entries) {
      if (!(await globalBlm.isBlacklisted(wallet))) missing.push([wallet, reason]);
    }
    console.log(`Blacklisted wallets on current list(s): ${entries.size}, missing on global: ${missing.length}`);

    const calls: PlannedCall[] = [];
    for (const [wallet, reason] of missing) {
      calls.push({
        description: `global.addToBlacklist(${wallet}, "${reason}")`,
        target: globalAddress,
        data: globalBlm.interface.encodeFunctionData('addToBlacklist', [wallet, reason]),
        send: () => globalBlm.addToBlacklist(wallet, reason),
      });
    }
    if (tokenBlm !== globalAddress) {
      calls.push({
        description: `token.setDSService(${DSConstants.services.BLACKLIST_MANAGER}, ${globalAddress})`,
        target: tokenAddress,
        data: token.interface.encodeFunctionData('setDSService', [DSConstants.services.BLACKLIST_MANAGER, globalAddress]),
        send: () => token.setDSService(DSConstants.services.BLACKLIST_MANAGER, globalAddress),
      });
    }
    if (complianceBlm !== globalAddress) {
      calls.push({
        description: `compliance.setDSService(${DSConstants.services.BLACKLIST_MANAGER}, ${globalAddress})`,
        target: complianceAddress,
        data: compliance.interface.encodeFunctionData('setDSService', [DSConstants.services.BLACKLIST_MANAGER, globalAddress]),
        send: () => compliance.setDSService(DSConstants.services.BLACKLIST_MANAGER, globalAddress),
      });
    }

    if (calls.length === 0) {
      console.log('Nothing to do: token and compliance already use the global blacklist and no entries are missing');
      return { executed: false, calls: [] };
    }

    const summary = calls.map(({ description, target, data }) => ({ description, target, data }));
    if (!args.execute) {
      console.log(`\nDRY RUN: ${calls.length} call(s), nothing was sent. Re-run with --execute to send them from the signer.`);
      calls.forEach((call, index) => {
        console.log(`\n#${index + 1} ${call.description}\n  target:   ${call.target}\n  calldata: ${call.data}`);
      });
      return { executed: false, calls: summary };
    }

    for (const [index, call] of calls.entries()) {
      console.log(`\n[${index + 1}/${calls.length}] ${call.description}`);
      const tx = await call.send();
      await tx.wait();
      console.log(`  tx: ${tx.hash}`);
    }
    console.log('\nMigration complete');
    return { executed: true, calls: summary };
  });
