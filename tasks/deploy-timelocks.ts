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

    const deployOne = async (label: string, minDelay: number) => {
      const timelock = await hre.ethers.deployContract('TimelockController', [minDelay, proposers, executors, admin]);
      await timelock.waitForDeployment();
      console.log(`${label} timelock deployed at ${await timelock.getAddress()} (minDelay ${minDelay}s)`);
      return timelock;
    };

    const masterTimelock = await deployOne('Master', args.masterDelay);
    const complianceTimelock = await deployOne('Compliance Rules', args.complianceDelay);
    const rolesTimelock = await deployOne('Roles', args.rolesDelay);

    console.log(`Proposers/cancellers: ${proposers.join(', ')}`);
    console.log(`Executors: ${executors.join(', ')}`);
    console.log(`Temporary admin: ${admin} (renounce DEFAULT_ADMIN_ROLE after verify-governance passes)`);

    return { masterTimelock, complianceTimelock, rolesTimelock };
  });
