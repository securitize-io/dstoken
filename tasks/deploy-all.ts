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
      // Typed against the local interface only — the concrete contract (with its own
      // AccessControl/admin API) lives in bc-global-denylist-manager-sc, not this repo.
      globalDenylistManager = await ethers.getContractAt('IDSGlobalDenyListManager', args.globalDenylistManagerAddress);
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
