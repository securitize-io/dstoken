import { task, types } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { resolveSigner, upgradeUupsProxy } from './utils/upgrade.helper';

/**
 * In-place UUPS upgrade of any deployed DS service proxy (BC-2329).
 *
 * Every DS contract is UUPS, and BC-2132/BC-2133 changed more than the token:
 *
 *   TrustService                    new `rolesGovernor` storage (__gap 44 -> 43) plus
 *                                   setRolesGovernor/getRolesGovernor — REQUIRED before
 *                                   setup-governance can wire the roles timelock
 *   ComplianceConfigurationService  new onlyComplianceAdmin gating — REQUIRED before the
 *                                   compliance rules timelock has any enforcement
 *
 * So moving an existing suite onto BC-2133 governance means upgrading three proxies, not one.
 * Use `upgrade-token` for the DSToken proxy (it adds token-specific safe-by-default checks) and
 * this task for the rest.
 *
 *   npx hardhat upgrade-ds-contract --network sepolia --contract TrustService --proxy 0x...
 *   npx hardhat upgrade-ds-contract --network sepolia --contract ComplianceConfigurationService --proxy 0x...
 */
task('upgrade-ds-contract', 'Upgrade a deployed DS service proxy in place (TrustService, CCS, ...)')
  .addParam('contract', 'Contract name to upgrade to, e.g. TrustService', undefined, types.string)
  .addParam('proxy', 'Proxy address to upgrade', undefined, types.string)
  .addOptionalParam(
    'baseline',
    'Contract name matching the CURRENTLY deployed implementation, for a real layout diff',
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

    const result = await upgradeUupsProxy(hre, {
      proxy: args.proxy,
      contractName: args.contract,
      baseline: args.baseline,
      validateOnly: args.validateOnly,
      call: args.initFn ? { fn: args.initFn, args: JSON.parse(args.initArgs) } : undefined,
      allowUnknownChain: args.allowUnknownChain,
      signer: await resolveSigner(hre, args.signer),
    });

    if (result.validatedOnly) return result;

    await reportPostUpgradeDefaults(hre, args.contract, args.proxy);

    console.log(
      `\nGas total: ${result.implDeployGas + result.upgradeGas} ` +
        `(implementation ${result.implDeployGas} + upgrade ${result.upgradeGas})`,
    );
    return result;
  });

/**
 * Same safe-by-default principle as upgrade-token: picking up the new implementation must not
 * enable governance on its own. Legacy behaviour holds while the enforcement slot is address(0).
 */
async function reportPostUpgradeDefaults(hre: HardhatRuntimeEnvironment, contractName: string, proxy: string) {
  if (contractName !== 'TrustService') return;

  const trustService = await hre.ethers.getContractAt('TrustService', proxy);
  const rolesGovernor = await trustService.getRolesGovernor();

  console.log('\nSafe-by-default check');
  const ok = rolesGovernor === hre.ethers.ZeroAddress;
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] roles governor unset (legacy role management preserved): ${rolesGovernor}`);
  if (!ok) {
    throw new Error(`Upgrade left a roles governor configured (${rolesGovernor}); expected address(0)`);
  }
}
