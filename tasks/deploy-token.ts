import { subtask, types } from 'hardhat/config';
import { getTokenContractName, printContractAddresses } from './utils/task.helper';

subtask('deploy-token', 'Deploy DS Token')
  .addParam('name', 'DS Token name', 'Token Example', types.string)
  .addParam('symbol', 'DS Token symbol', 'EXA', types.string)
  .addParam('decimals', 'DS Token decimals', 2, types.int)
  .addParam('compliance', 'Compliance Type', 'REGULATED', types.string)
  .setAction(
    async (args, hre, run) => {
      const TokenLib = await hre.ethers.getContractFactory('TokenLibrary');
      const tokenLib = await TokenLib.deploy();

      const libraries = { TokenLibrary: tokenLib};

      if (args.compliance === 'PARTITIONED') {
        const TokenPartitionsLibrary = await hre.ethers.getContractFactory('TokenPartitionsLibrary');
        const tokenPartitionedLib = await TokenPartitionsLibrary.deploy();
        libraries.TokenPartitionsLibrary = tokenPartitionedLib;
      }

      const tokenContractName = getTokenContractName(args.compliance);
      const DSToken = await hre.ethers.getContractFactory(tokenContractName, { libraries });

      const dsToken = await hre.upgrades.deployProxy(
        DSToken,
        [ args.name, args.symbol, args.decimals ],
        { kind: 'uups', unsafeAllow: [ 'external-library-linking' ] }
      );

      await dsToken.waitForDeployment();

      await printContractAddresses(tokenContractName, dsToken, hre);
      return dsToken;
    }
  );
