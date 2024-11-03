import { task, types } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

task('deploy-erc20', 'Deploy an ERC20 Dummy Token')
  .addParam('name', 'Token name', 'Dummy Token', types.string)
  .addParam('symbol', 'Token symbol', 'DT', types.string)
  .addParam('initialSupply', 'Initial supply', '10000000', types.string, true)
  .addParam('decimals', 'Token decimals', 18, types.int, true)
  .setAction(async (args, hre:HardhatRuntimeEnvironment, run) => {
    const MockToken = await hre.ethers.getContractFactory('TokenERC20');
    const mockToken = await MockToken.deploy(args.name, args.symbol, args.initialSupply, args.decimals);
    await mockToken.waitForDeployment();

    console.log('Mock Token deployed to:', mockToken.target);
    return mockToken;
  });
