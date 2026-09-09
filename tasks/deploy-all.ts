import { task, types } from "hardhat/config";


task('deploy-all', 'Deploy DS Protocol')
  .addParam('name', 'DS Token name', 'Token Example', types.string)
  .addParam('symbol', 'DS Token symbol', 'EXA', types.string)
  .addParam('decimals', 'DS Token decimals', 2, types.int)
  .addParam('compliance', 'Compliance Type', 'REGULATED', types.string)
  .addOptionalParam('multiplier', 'Rebasing Multiplier', '1000000000000000000', types.string)
  .addOptionalParam('globalRegistryService', 'Global Registry Service Address', undefined, types.string)
  .addOptionalParam('registryType', 'Registry type: REGULATED or STUB', 'REGULATED', types.string)
  .addOptionalParam('globalDenylistManagerAddress', 'Address of a pre-existing shared Global Denylist Manager to wire in (deployment lives outside this repo)', undefined, types.string)
  .setAction(async (args, { run, ethers }) => {
    await run("compile");

    // Only ComplianceServicePermissionless (wired for both PERMISSIONLESS and BLACKLISTED,
    // see getComplianceContractName) ever calls isGloballyDenylisted. Every other
    // compliance type would accept the address, report success, and never consult it —
    // silently deploying an unenforced denylist. Fail fast, before deploying anything.
    const DENYLIST_COMPLIANCE_TYPES = ['PERMISSIONLESS', 'BLACKLISTED'];
    if (args.globalDenylistManagerAddress && !DENYLIST_COMPLIANCE_TYPES.includes(args.compliance)) {
      throw new Error(
        `--global-denylist-manager-address is only supported with --compliance PERMISSIONLESS or BLACKLISTED, got ${args.compliance}`,
      );
    }

    if (args.compliance === 'PERMISSIONLESS' && args.registryType === 'REGULATED') {
      args.registryType = 'STUB';
    }

    const dsToken = await run('deploy-token', args);
    const trustService = await run('deploy-trust-service');

    let registryService;
    if (args.globalRegistryService) {
      console.log(`Using global registry service at address: ${args.globalRegistryService}`);
      registryService = await ethers.getContractAt('RegistryService', args.globalRegistryService);
    } else if (args.registryType === 'STUB') {
      console.log('Deploying stub registry service');
      registryService = await run('deploy-stub-registry-service');
    } else {
      console.log('Deploying new registry service');
      registryService = await run('deploy-registry-service');
    }

    const complianceService = await run('deploy-compliance-service', args);
    const walletManager = await run('deploy-wallet-manager');
    const lockManager = await run('deploy-lock-manager', args);
    const complianceConfigurationService = await run('deploy-compliance-configuration-service');
    const tokenIssuer = await run('deploy-token-issuer');
    const walletRegistrar = await run('deploy-wallet-registrar');
    const transactionRelayer = await run('deploy-transaction-relayer');
    const bulkOperator = await run('deploy-bulk-operator', { dsToken: dsToken.target });
    const navProviderMock = await ethers.deployContract('SecuritizeInternalNavProviderMock', [1]);
    const rebasingProvider = await run('deploy-rebasing-provider', { multiplier: args.multiplier, decimals: args.decimals });
    const blacklistManager = await run('deploy-blacklist-manager');

    // GlobalDenyListManager is deployed and administered outside this repo — deploy-all
    // only wires an already-existing instance in, if one is given. Left undefined, the
    // GLOBAL_DENYLIST_MANAGER service stays unset (address(0)), which
    // ComplianceServicePermissionless treats as fail-open (see docs/runbooks/global-denylist-admin.md).
    let globalDenylistManager;
    if (args.globalDenylistManagerAddress) {
      console.log(`Using existing shared Global Denylist Manager at address: ${args.globalDenylistManagerAddress}`);
      // ethers.getContractAt only validates address format/checksum client-side — it
      // never queries the chain for code. A typo or a pasted EOA would otherwise pass
      // straight through to set-services and wire a codeless address into
      // GLOBAL_DENYLIST_MANAGER, which halts every transfer and issuance on the token
      // (ComplianceServicePermissionless always calls through to it for a non-zero
      // address, and Solidity's extcodesize check reverts on a target with no code).
      if ((await ethers.provider.getCode(args.globalDenylistManagerAddress)) === '0x') {
        throw new Error(`No contract at ${args.globalDenylistManagerAddress}`);
      }
      // Typed against the local interface only — the concrete contract (with its own
      // AccessControl/admin API) lives in bc-global-denylist-manager-sc, not this repo.
      globalDenylistManager = await ethers.getContractAt('IDSGlobalDenyListManager', args.globalDenylistManagerAddress);
      // Catch interface drift: the address has code, but confirm it's actually wired up
      // to answer isGloballyDenylisted before we trust it — a wrong contract at that
      // address would otherwise surface only much later, mid-transfer.
      await globalDenylistManager.isGloballyDenylisted(ethers.ZeroAddress);
    }

    const usdcMock = await run('deploy-erc20',
      {
        name: 'USDC',
        symbol: 'USDC',
        initialSupply: '100000000000000000000000000000',
        decimals: 6,
      });

    const dsContracts = {
      dsToken,
      trustService,
      registryService,
      complianceService,
      walletManager,
      lockManager,
      complianceConfigurationService,
      tokenIssuer,
      walletRegistrar,
      transactionRelayer,
      bulkOperator,
      usdcMock,
      navProviderMock,
      rebasingProvider,
      blacklistManager,
      globalDenylistManager
    };

    await run("set-roles", { dsContracts });
    await run("set-services", { dsContracts, isGRS: !!args.globalRegistryService });

    return dsContracts;
  });
