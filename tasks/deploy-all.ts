import { task, types } from 'hardhat/config';


task('deploy-all', 'Deploy DS Protocol')
  .addParam('name', 'DS Token name', 'Token Example', types.string)
  .addParam('symbol', 'DS Token symbol', 'EXA', types.string)
  .addParam('decimals', 'DS Token decimals', 2, types.int)
  .addParam('compliance', 'Compliance Type', 'REGULATED', types.string)
  .addParam('tbe', 'Omnibus TBE address', undefined, types.string, false)
  .setAction(async (args, { run }) => {
    await run('compile');
    const [owner, wallet] = await hre.ethers.getSigners();

    const dsToken = await run('deploy-token', args);
    const trustService = await run('deploy-trust-service');
    const registryService = await run('deploy-registry-service');
    const complianceService = await run('deploy-compliance-service', args);
    const walletManager = await run('deploy-wallet-manager');
    const lockManager = await run('deploy-lock-manager', args);
    const partitionsManager = await run('deploy-partitions-manager', args);
    const complianceConfigurationService = await run('deploy-compliance-configuration-service');
    const tokenIssuer = await run('deploy-token-issuer');
    const walletRegistrar = await run('deploy-wallet-registrar');
    const omnibusTBEController = await run('deploy-omnibus-tbe-controller', args);
    const transactionRelayer = await run('deploy-transaction-relayer');
    const tokenReallocator = await run('deploy-token-reallocator');
    const issuerMulticall = await run('deploy-issuer-multicall');
    const bulkOperator = await run('deploy-bulk-operator', { dsToken: dsToken.target });
    const navProviderMock = await hre.ethers.deployContract('SecuritizeInternalNavProviderMock', [1]);
    const usdcMock = await run('deploy-erc20',
      {
        name: 'USDC',
        symbol: 'USDC',
        initialSupply: '100000000000000000000000000000',
        decimals: 6,
      });

      const swap = await run('deploy-securitze-swap',
        {
          dsToken: dsToken.target,
          stableCoin: usdcMock.target,
          navProvider: navProviderMock.target,
          issuerWallet: wallet.address,
        });
    const dsContracts = {
      dsToken,
      trustService,
      registryService,
      complianceService,
      walletManager,
      lockManager,
      partitionsManager,
      complianceConfigurationService,
      tokenIssuer,
      walletRegistrar,
      omnibusTBEController,
      transactionRelayer,
      tokenReallocator,
      issuerMulticall,
      bulkOperator,
      usdcMock,
      swap,
      navProviderMock
    };

    await run('set-roles', { dsContracts });
    await run('set-services', { dsContracts });

    return dsContracts;
  });
