import { subtask } from 'hardhat/config';
import { printContractAddresses } from './utils/task.helper';

subtask('deploy-stub-registry-service', 'Deploy StubRegistryService')
  .setAction(async (_, hre) => {
    const Service = await hre.ethers.getContractFactory('StubRegistryService');
    const service = await hre.upgrades.deployProxy(Service);
    await service.waitForDeployment();

    await printContractAddresses('Stub Registry Service', service, hre);
    return service;
  });
