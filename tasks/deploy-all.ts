import { task, types } from 'hardhat/config';

task('deploy-all', 'Deploy DS Protocol')
  .addParam('name', 'DS Token name', 'Token Example', types.string)
  .addParam('symbol', 'DS Token symbol', 'EXA', types.string)
  .addParam('decimals', 'DS Token decimals', 2, types.int)
  .addParam('compliance', 'Compliance Type', 'REGULATED', types.string)
  .addParam('tbe', 'Omnibus TBE address', undefined, types.string, false)
  .setAction(async (args, { run }) => {
    await run('compile');
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
    };

    await run('set-roles', { dsContracts });

    await run('set-services', { dsContracts });

    return dsContracts;
  });
