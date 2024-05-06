import { subtask, types } from 'hardhat/config';
import { getTBEControllerContractName, isPartitioned, printContractAddresses } from './utils/task.helper';

subtask('deploy-omnibus-tbe-controller', 'Deploy Omnibus TBE Controller')
  .addParam('compliance', 'Compliance Type', 'REGULATED', types.string)
  .addParam('tbe', 'Omnibus TBE address', undefined, types.string, false)
  .setAction(
    async (args, hre, run) => {

      const serviceName = getTBEControllerContractName(args.compliance);

      const Service = await hre.ethers.getContractFactory(serviceName);
      const service = await hre.upgrades.deployProxy(Service, [ args.tbe, isPartitioned(args.compliance) ]);
      await service.waitForDeployment();

      await printContractAddresses('Omnibus TBE Controller', service, hre);
      return service;
    }
  );
