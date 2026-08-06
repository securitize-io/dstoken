import { task, types } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DSConstants } from '../utils/globals';
import { getTokenContractName } from './utils/task.helper';
import {
  assertCanAuthorizeUpgrade,
  resolveSigner,
  resolveTokenLibrary,
  upgradeUupsProxy,
} from './utils/upgrade.helper';
import { assertKnownTestnet } from './utils/network.helper';

/**
 * In-place UUPS upgrade of an already-deployed DSToken proxy (BC-2329 section 0).
 *
 * deploy-token only ever does a fresh deployProxy, so there was no way to move an existing
 * customer token onto a new implementation. This task closes that gap and additionally asserts
 * the BC-2132/BC-2133 safe-by-default outcome, so a silent enablement fails the command that
 * caused it rather than being discovered later on a block explorer.
 *
 * BC-2132/BC-2133 also change TrustService (new `rolesGovernor` storage) and
 * ComplianceConfigurationService (new `onlyComplianceAdmin` gating). Upgrading the token alone is
 * not enough to enable governance — use `upgrade-ds-contract` for those two proxies.
 *
 * Storage-layout caveat: OZ can only diff against the layout recorded in the manifest. When the
 * manifest entry had to be created by forceImport using the *new* factory, that diff compares the
 * new layout against itself and proves nothing. Pass --baseline with the contract name of the
 * currently deployed implementation for a real check, and diff state with `token-state`
 * before/after regardless.
 */
task('upgrade-token', 'Upgrade an already-deployed DSToken proxy in place')
  .addParam('proxy', 'DSToken proxy address to upgrade', undefined, types.string)
  .addOptionalParam('compliance', 'Compliance type, selects the token contract', 'REGULATED', types.string)
  .addOptionalParam('library', 'Existing TokenLibrary address to link (deploys a fresh one when omitted)', undefined, types.string)
  .addOptionalParam(
    'baseline',
    'Contract name matching the CURRENTLY deployed implementation. Used for forceImport and for a real layout diff.',
    undefined,
    types.string,
  )
  .addOptionalParam('initFn', 'Reinitializer to call atomically via upgradeToAndCall', undefined, types.string)
  .addOptionalParam('initArgs', 'JSON array of arguments for --init-fn', '[]', types.string)
  .addFlag('validateOnly', 'Validate the upgrade and exit without sending the upgrade tx')
  .addFlag('allowUnknownChain', 'Bypass the testnet chain-id guard (only for a chain you verified yourself)')
  .addOptionalParam('signer', 'Signer index or address to upgrade from (must be owner() or MASTER)', undefined, types.string)
  .setAction(async (args, hre) => {
    await hre.run('compile');

    // Everything that can fail without spending gas happens first: deploying a TokenLibrary only
    // to abort on an authority check would burn real funds for nothing.
    await assertKnownTestnet(hre, args.allowUnknownChain);
    const signer = await resolveSigner(hre, args.signer);
    await assertCanAuthorizeUpgrade(hre, args.proxy, signer);

    const contractName = getTokenContractName(args.compliance);
    // Layout validation does not care which library address is linked, so --validate-only must not
    // pay to deploy one. Only a real upgrade needs a real TokenLibrary.
    const libraries = {
      TokenLibrary:
        args.validateOnly && !args.library
          ? '0x0000000000000000000000000000000000000001'
          : await resolveTokenLibrary(hre, args.library),
    };

    const result = await upgradeUupsProxy(hre, {
      proxy: args.proxy,
      contractName,
      libraries,
      baseline: args.baseline,
      validateOnly: args.validateOnly,
      call: args.initFn ? { fn: args.initFn, args: JSON.parse(args.initArgs) } : undefined,
      allowUnknownChain: args.allowUnknownChain,
      signer,
    });

    if (result.validatedOnly) return result;

    await reportPostUpgradeDefaults(hre, args.proxy);

    console.log(
      `\nGas total: ${result.implDeployGas + result.upgradeGas} ` +
        `(implementation ${result.implDeployGas} + upgrade ${result.upgradeGas}, excludes the TokenLibrary deploy)`,
    );
    return result;
  });

/**
 * BC-2329 scenario C: nothing may be silently enabled by the upgrade. Reads the new storage
 * straight from the upgraded proxy so a failure is visible in the same command that upgraded.
 */
async function reportPostUpgradeDefaults(hre: HardhatRuntimeEnvironment, proxy: string) {
  const token = await hre.ethers.getContractAt('DSToken', proxy);
  const [mintCapAmount, mintCapWindow, overCapDelay, overCapGracePeriod] = await Promise.all([
    token.mintCapAmount(),
    token.mintCapWindow(),
    token.overCapDelay(),
    token.overCapGracePeriod(),
  ]);
  const timelocks = {
    MASTER_TIMELOCK: await token.getDSService(DSConstants.services.MASTER_TIMELOCK),
    COMPLIANCE_RULES_TIMELOCK: await token.getDSService(DSConstants.services.COMPLIANCE_RULES_TIMELOCK),
    ROLES_TIMELOCK: await token.getDSService(DSConstants.services.ROLES_TIMELOCK),
  };

  console.log('\nSafe-by-default check (BC-2329 scenario C)');
  const failures: string[] = [];
  const check = (label: string, ok: boolean, detail: string) => {
    console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${label}: ${detail}`);
    if (!ok) failures.push(label);
  };

  check('mint cap disabled', mintCapAmount === 0n, `mintCapAmount=${mintCapAmount} mintCapWindow=${mintCapWindow}`);
  check(
    'over-cap params unset',
    overCapDelay === 0n && overCapGracePeriod === 0n,
    `overCapDelay=${overCapDelay} overCapGracePeriod=${overCapGracePeriod}`,
  );
  for (const [name, address] of Object.entries(timelocks)) {
    check(`${name} not registered`, address === hre.ethers.ZeroAddress, address);
  }

  if (failures.length > 0) {
    throw new Error(`Upgrade did not leave the token safe-by-default: ${failures.join(' | ')}`);
  }
}
