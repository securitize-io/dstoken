import { HardhatUserConfig, task } from "hardhat/config";
import '@nomicfoundation/hardhat-ignition-ethers';
import '@nomicfoundation/hardhat-toolbox';
import '@openzeppelin/hardhat-upgrades';
import './tasks/tasks.index';

const config: HardhatUserConfig = {
  mocha: {
    parallel: false,
  },
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    sepolia: {
      chainId: 11155111,
      url: process.env.SEPOLIA_RPC_URL ?? '',
      accounts: [process.env.DEPLOYER_PRIV_KEY!].filter((x) => x)
    },
    arbitrum: {
      chainId: 421614,
      gas: 'auto',
      url: process.env.ARBITRUM_RPC_URL ?? '',
      accounts: [process.env.DEPLOYER_PRIV_KEY!].filter((x) => x),
      allowUnlimitedContractSize: true
    },
    optimism: {
      chainId: 11155420,
      url: process.env.OPTIMISM_RPC_URL ?? '',
      accounts: [process.env.DEPLOYER_PRIV_KEY!].filter((x) => x)
    }
  },
};

export default config;
