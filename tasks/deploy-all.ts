import { task, types } from 'hardhat/config';

task('deploy-all', 'Deploy DS Protocol')
  .addParam('name', 'DS Token name', 'Token Example', types.string)
  .addParam('symbol', 'DS Token symbol', 'EXA', types.string)
  .addParam('decimals', 'DS Token decimals', 2, types.int)
  .addParam('compliance', 'Compliance Type', 'REGULATED', types.string)
  .setAction(async (args, { run }) => {
    await run('compile');
    await run('deploy-token', args);
    await run('deploy-trust-service');
    await run('deploy-registry-service');
    await run('deploy-compliance-service', args);
  });
