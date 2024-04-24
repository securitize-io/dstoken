import { subtask, types } from 'hardhat/config';
import { printContractAddresses } from './utils/task.helper';

subtask('deploy-token', 'Deploy DS Token')
  .addParam('name', 'DS Token name', 'Token Example', types.string)
  .addParam('symbol', 'DS Token symbol', 'EXA', types.string)
  .addParam('decimals', 'DS Token decimals', 2, types.int)
  .setAction(
  async (args, hre, run) => {
      const TokenLib = await hre.ethers.getContractFactory('TokenLibrary');
      const tokenLib = await TokenLib.deploy();

      const DSToken = await hre.ethers.getContractFactory('DSToken', {
          libraries: {
              TokenLibrary: tokenLib,
          }
      });

      const dsToken = await hre.upgrades.deployProxy(
        DSToken,
        [ args.name, args.symbol, args.decimals ],
        { kind: 'uups', unsafeAllow: ['external-library-linking'] }
      );

      await dsToken.waitForDeployment();

    return printContractAddresses('DS Token', dsToken, hre);
  }
);
