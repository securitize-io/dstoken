import { task, types } from 'hardhat/config';

/**
 * Deploys the three governance TimelockControllers (BC-2133):
 *  - Master timelock: becomes MASTER + owner() of every DS contract (via setup-governance --handover)
 *  - Compliance Rules timelock: gates ComplianceConfigurationService setters
 *  - Roles timelock: gates TrustService setRole/setRoles/removeRole
 *
 * Per OZ TimelockController v5, every proposer is also granted CANCELLER automatically.
 * Cancellers must be direct wallets (never another timelock) so cancellation can outrun the delay.
 * Executors: pass 'permissionless' to allow anyone to execute after the delay (address(0) executor).
 * The admin keeps DEFAULT_ADMIN_ROLE for onboarding corrections and MUST renounce it after
 * verify-governance passes (see the governance runbook).
 */
task('deploy-timelocks', 'Deploy the three BC-2133 governance TimelockControllers')
  .addParam('proposers', 'Comma-separated proposer addresses (also granted CANCELLER)', undefined, types.string)
  .addOptionalParam('executors', "Comma-separated executor addresses, or 'permissionless'", undefined, types.string)
  .addOptionalParam(
    'cancellers',
    'Comma-separated extra canceller addresses, granted CANCELLER_ROLE on top of the proposers',
    undefined,
    types.string,
  )
  .addOptionalParam('admin', 'Temporary admin address (defaults to deployer, renounce after setup)', undefined, types.string)
  .addOptionalParam('masterDelay', 'Master timelock min delay in seconds', 172800, types.int)
  .addOptionalParam('complianceDelay', 'Compliance rules timelock min delay in seconds', 86400, types.int)
  .addOptionalParam('rolesDelay', 'Roles timelock min delay in seconds', 86400, types.int)
  .setAction(async (args, hre) => {
    const [deployer] = await hre.ethers.getSigners();
    const proposers = args.proposers.split(',').map((a: string) => a.trim());
    const executors = !args.executors
      ? proposers
      : args.executors === 'permissionless'
        ? [hre.ethers.ZeroAddress]
        : args.executors.split(',').map((a: string) => a.trim());
    const admin = args.admin ?? deployer.address;
    const extraCancellers: string[] = args.cancellers
      ? args.cancellers.split(',').map((a: string) => a.trim())
      : [];

    // BC-2329 requires the deployment gas for production budgeting.
    let totalGas = 0n;

    const deployOne = async (label: string, minDelay: number) => {
      const timelock = await hre.ethers.deployContract('TimelockController', [minDelay, proposers, executors, admin]);
      await timelock.waitForDeployment();
      const deployReceipt = await timelock.deploymentTransaction()?.wait();
      if (deployReceipt) totalGas += deployReceipt.gasUsed;
      console.log(
        `${label} timelock deployed at ${await timelock.getAddress()} (minDelay ${minDelay}s, gas ${deployReceipt?.gasUsed ?? 'unknown'})`,
      );

      // OZ v5 grants CANCELLER only to proposers. A canceller wallet that is not also a proposer
      // has to be granted explicitly, which needs the temporary admin — so it must happen here,
      // before DEFAULT_ADMIN_ROLE is renounced.
      if (extraCancellers.length > 0) {
        const cancellerRole = await timelock.CANCELLER_ROLE();
        for (const canceller of extraCancellers) {
          const tx = await timelock.grantRole(cancellerRole, canceller);
          const receipt = await tx.wait();
          totalGas += receipt.gasUsed;
          console.log(`  granted CANCELLER_ROLE to ${canceller} (gas ${receipt.gasUsed})`);
        }
      }
      return timelock;
    };

    const masterTimelock = await deployOne('Master', args.masterDelay);
    const complianceTimelock = await deployOne('Compliance Rules', args.complianceDelay);
    const rolesTimelock = await deployOne('Roles', args.rolesDelay);

    console.log(`Proposers/cancellers: ${proposers.join(', ')}`);
    if (extraCancellers.length > 0) console.log(`Additional cancellers: ${extraCancellers.join(', ')}`);
    console.log(`Executors: ${executors.join(', ')}`);
    console.log(`Temporary admin: ${admin} (renounce DEFAULT_ADMIN_ROLE after verify-governance passes)`);
    console.log(`Total gas for deploy-timelocks: ${totalGas}`);

    return { masterTimelock, complianceTimelock, rolesTimelock };
  });
