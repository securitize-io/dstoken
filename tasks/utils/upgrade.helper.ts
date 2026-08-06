import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { assertKnownTestnet } from './network.helper';
import { resolveSigner } from './task.helper';

/**
 * Shared mechanics for in-place UUPS upgrades of already-deployed DS proxies.
 *
 * Every DS contract inherits BaseDSContract (or declares UUPSUpgradeable directly), so the same
 * flow applies to DSToken, TrustService and ComplianceConfigurationService: resolve the factory,
 * make sure the proxy is known to the OZ manifest, validate the storage layout, deploy the
 * implementation, upgrade, and report gas for both transactions.
 */

export interface UpgradeResult {
  proxy: string;
  contractName: string;
  implBefore: string;
  implAfter: string;
  implDeployGas: bigint;
  upgradeGas: bigint;
  validatedOnly: boolean;
}

export interface UpgradeOptions {
  proxy: string;
  contractName: string;
  /** Libraries to link, e.g. { TokenLibrary } for DSToken. */
  libraries?: Record<string, string>;
  /** Contract name matching the CURRENTLY deployed implementation, for a real layout diff. */
  baseline?: string;
  /** Validate and stop without sending the upgrade transaction. */
  validateOnly?: boolean;
  /** Reinitializer to invoke atomically via upgradeToAndCall. */
  call?: { fn: string; args: unknown[] };
  /** Bypass the testnet chain-id guard. Only for a chain you have verified yourself. */
  allowUnknownChain?: boolean;
  /**
   * Signer to send the upgrade from. _authorizeUpgrade is onlyMaster, which accepts either
   * owner() or the MASTER role — on a pre-existing token that is often not the deployer.
   */
  signer?: any;
}

export async function upgradeUupsProxy(
  hre: HardhatRuntimeEnvironment,
  options: UpgradeOptions,
): Promise<UpgradeResult> {
  const { proxy, contractName, libraries, baseline, validateOnly, call } = options;
  await assertKnownTestnet(hre, options.allowUnknownChain);

  const unsafeAllow = libraries ? (['external-library-linking'] as const) : ([] as const);
  const opts = { kind: 'uups' as const, unsafeAllow: [...unsafeAllow] };

  const implBefore = await hre.upgrades.erc1967.getImplementationAddress(proxy);
  console.log(`\n${contractName} @ ${proxy}`);
  console.log(`  implementation before: ${implBefore}`);

  const signer = options.signer ?? (await hre.ethers.getSigners())[0];
  console.log(`  signing as: ${signer.address}`);
  await assertCanAuthorizeUpgrade(hre, proxy, signer);

  const factoryOptions: any = {};
  if (libraries) factoryOptions.libraries = libraries;
  factoryOptions.signer = signer;
  const NewFactory = await hre.ethers.getContractFactory(contractName, factoryOptions);
  const baselineName = baseline ?? contractName;
  const BaselineFactory =
    baselineName === contractName ? NewFactory : await hre.ethers.getContractFactory(baselineName, factoryOptions);

  if (await needsForceImport(hre, proxy, NewFactory, opts)) {
    console.log(`  proxy not in the local manifest, running forceImport as ${baselineName}`);
    await hre.upgrades.forceImport(proxy, BaselineFactory, { kind: 'uups' });
    if (!baseline) {
      console.log(
        '  WARNING: imported using the new implementation, so the OZ layout diff below is vacuous.\n' +
          '           Pass --baseline <OldContractName> for a real check, and diff state independently.',
      );
    }
  }

  if (baseline) {
    console.log(`  validating layout ${baselineName} -> ${contractName}`);
    await hre.upgrades.validateUpgrade(BaselineFactory, NewFactory, opts);
  } else {
    await hre.upgrades.validateUpgrade(proxy, NewFactory, opts);
  }
  console.log('  layout validation passed');

  if (validateOnly) {
    console.log('  --validate-only: no upgrade tx sent');
    return {
      proxy,
      contractName,
      implBefore,
      implAfter: implBefore,
      implDeployGas: 0n,
      upgradeGas: 0n,
      validatedOnly: true,
    };
  }

  const prepared = await hre.upgrades.prepareUpgrade(proxy, NewFactory, { ...opts, getTxResponse: true });
  const implDeployGas = await reportGas(hre, 'implementation deploy', prepared);

  if (call) console.log(`  upgradeToAndCall: ${call.fn}(${call.args.join(', ')})`);
  const upgraded = await hre.upgrades.upgradeProxy(proxy, NewFactory, {
    ...opts,
    redeployImplementation: 'never',
    call,
  });
  await upgraded.waitForDeployment();
  const upgradeGas = await reportGas(hre, 'proxy upgrade', (upgraded as any).deployTransaction);

  const implAfter = await hre.upgrades.erc1967.getImplementationAddress(proxy);
  console.log(`  implementation after: ${implAfter}`);
  if (implAfter.toLowerCase() === implBefore.toLowerCase()) {
    console.log('  NOTE: implementation unchanged — the proxy already ran this bytecode (no-op upgrade)');
  }

  return { proxy, contractName, implBefore, implAfter, implDeployGas, upgradeGas, validatedOnly: false };
}

/**
 * Fails before spending anything when the signer cannot authorise the upgrade.
 *
 * The DS contracts do not share one authority model, so all three shapes are probed:
 *
 *  - ServiceConsumer (DSToken, CCS, ...): `onlyMaster` is
 *    `if (owner() != msg.sender) require(getTrustService().getRole(msg.sender) == MASTER)`,
 *    so being `owner()` is enough even with no role at all.
 *  - TrustService: not Ownable and not a ServiceConsumer. Its own `onlyMaster` is
 *    `roles[msg.sender] == MASTER`, read from itself — there is no owner() bypass here.
 *
 * Checking all of them up front turns a confusing mid-flight revert into an actionable message
 * naming the wallet that actually has authority.
 */
export async function assertCanAuthorizeUpgrade(hre: HardhatRuntimeEnvironment, proxy: string, signer: any) {
  const OWNABLE = ['function owner() view returns (address)'];
  const CONSUMER = ['function getDSService(uint256) view returns (address)'];
  const TRUST = ['function getRole(address) view returns (uint8)'];
  const MASTER_ROLE = 1;
  const reasons: string[] = [];

  // 1. owner() on the proxy itself.
  let owner: string | null = null;
  try {
    owner = await (await hre.ethers.getContractAt(OWNABLE, proxy)).owner();
  } catch {
    reasons.push('proxy is not Ownable');
  }
  if (owner) {
    if (owner.toLowerCase() === signer.address.toLowerCase()) {
      console.log('  authority: signer is owner() — upgrade authorised');
      return;
    }
    reasons.push(`owner() is ${owner}`);
  }

  // 2. The proxy may itself be the TrustService, which resolves MASTER against its own storage.
  try {
    const role = await (await hre.ethers.getContractAt(TRUST, proxy)).getRole(signer.address);
    if (Number(role) === MASTER_ROLE) {
      console.log('  authority: signer holds MASTER in this contract itself — upgrade authorised');
      return;
    }
    reasons.push(`getRole(signer) on the proxy itself is ${role}, not MASTER`);
  } catch {
    /* not a TrustService */
  }

  // 3. ServiceConsumer: resolve the TrustService through the service registry.
  try {
    const trustAddress = await (await hre.ethers.getContractAt(CONSUMER, proxy)).getDSService(1);
    const role = await (await hre.ethers.getContractAt(TRUST, trustAddress)).getRole(signer.address);
    if (Number(role) === MASTER_ROLE) {
      console.log('  authority: signer holds MASTER — upgrade authorised');
      return;
    }
    reasons.push(`role in the TrustService (${trustAddress}) is ${role}, not MASTER`);
  } catch {
    /* not a ServiceConsumer */
  }

  throw new Error(
    `${signer.address} cannot authorise an upgrade of ${proxy}: _authorizeUpgrade is onlyMaster. ` +
      `${reasons.join('; ')}.\nSign with the wallet that has authority (set LEGACY_MASTER_PRIV_KEY and ` +
      `pass --signer 6, or --signer <address>), or have that wallet grant MASTER to this one first.`,
  );
}

/** True when the proxy has no manifest entry, which is what forceImport exists to fix. */
async function needsForceImport(
  hre: HardhatRuntimeEnvironment,
  proxy: string,
  factory: any,
  opts: object,
): Promise<boolean> {
  try {
    await hre.upgrades.validateUpgrade(proxy, factory, opts);
    return false;
  } catch (error: any) {
    const message = String(error?.message ?? error);
    if (/manifest|not found|Deployment at address/i.test(message)) return true;
    throw error; // a genuine layout incompatibility must not be swallowed
  }
}

/**
 * Waits for the transaction to be mined, then reports gas. Waiting is the point: on a public
 * testnet the receipt does not exist for ~one block, and reading the proxy's implementation before
 * the upgrade tx lands reports the OLD address and makes a successful upgrade look like a no-op.
 */
async function reportGas(hre: HardhatRuntimeEnvironment, label: string, tx: any): Promise<bigint> {
  if (!tx?.hash) {
    console.log(`  ${label}: no tx (reused an existing deployment)`);
    return 0n;
  }
  const receipt = typeof tx.wait === 'function' ? await tx.wait() : await hre.ethers.provider.getTransactionReceipt(tx.hash);
  if (!receipt) throw new Error(`${label}: tx ${tx.hash} produced no receipt`);
  if (receipt.status !== 1) throw new Error(`${label}: tx ${tx.hash} reverted on-chain`);
  console.log(`  ${label}: tx ${tx.hash} gasUsed ${receipt.gasUsed} (block ${receipt.blockNumber})`);
  return receipt.gasUsed;
}

export { resolveSigner };

/** Deploys a fresh TokenLibrary, or echoes the address to reuse. */
export async function resolveTokenLibrary(hre: HardhatRuntimeEnvironment, provided?: string): Promise<string> {
  if (provided) {
    console.log(`  linking existing TokenLibrary at ${provided}`);
    return provided;
  }
  const tokenLib = await hre.ethers.deployContract('TokenLibrary');
  await tokenLib.waitForDeployment();
  const address = await tokenLib.getAddress();
  console.log(`  deployed a fresh TokenLibrary at ${address}`);
  return address;
}
