import { task, types } from 'hardhat/config';

task('deploy-all', 'Deploy DS Protocol')
  .addParam('name', 'DS Token name', 'Token Example', types.string)
  .addParam('symbol', 'DS Token symbol', 'EXA', types.string)
  .addParam('decimals', 'DS Token decimals', 2, types.int)
  .addParam('compliance', 'Compliance Type', 'REGULATED', types.string)
  .addParam('lock', 'Lock Type', 'INVESTOR', types.string)
  .addParam('tbe', 'Omnibus TBE address', undefined, types.string, false)
  .setAction(async (args, { run }) => {
    await run('compile');
    const dsTokenAddress = await run('deploy-token', args);
    const trustServiceAddress = await run('deploy-trust-service');
    const registryServiceAddress = await run('deploy-registry-service');
    const complianceServiceAddress = await run('deploy-compliance-service', args);
    const walletManagerAddress = await run('deploy-wallet-manager');
    const lockManagerAddress = await run('deploy-lock-manager', args);
    const partitionsManagerAddress = await run('deploy-partitions-manager', args);
    const complianceConfigurationServiceAddress = await run('deploy-compliance-configuration-service');
    const tokenIssuerAddress = await run('deploy-token-issuer');
    const walletRegistrarAddress = await run('deploy-wallet-registrar');
    const omnibusTBEControllerAddress = await run('deploy-omnibus-tbe-controller', args);
    const transactionRelayerAddress = await run('deploy-transaction-relayer');
    const tokenReallocatorAddress = await run('deploy-token-reallocator');
    await run('set-roles', {
      trustServiceAddress,
      tokenIssuerAddress,
      walletRegistrarAddress,
      omnibusTBEControllerAddress,
      transactionRelayerAddress,
      tokenReallocatorAddress
    });

    const dsContracts = {
      dsTokenAddress,
      trustServiceAddress,
      registryServiceAddress,
      complianceServiceAddress,
      walletManagerAddress,
      lockManagerAddress,
      partitionsManagerAddress,
      complianceConfigurationServiceAddress,
      tokenIssuerAddress,
      walletRegistrarAddress,
      omnibusTBEControllerAddress,
      transactionRelayerAddress,
      tokenReallocatorAddress
    };
    await run('set-services', { dsContracts });
  });
