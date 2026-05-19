import { task, types } from 'hardhat/config';

task('deploy-permissionless', 'Deploy DS Protocol with ComplianceServicePermissionless and StubRegistryService')
  .addParam('name', 'DS Token name', 'Token Example', types.string)
  .addParam('symbol', 'DS Token symbol', 'EXA', types.string)
  .addParam('decimals', 'DS Token decimals', 2, types.int)
  .addOptionalParam('multiplier', 'Rebasing Multiplier', '1000000000000000000', types.string)
  .setAction(async (args, { run }) => {
    await run('compile');

    return run('deploy-all', {
      ...args,
      compliance: 'PERMISSIONLESS',
      registryType: 'STUB',
    });
  });
