import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-tracer";
import "./tasks/tasks.index";
import "./qa/tasks/tasks.index";
import "dotenv/config";

const config: HardhatUserConfig = {
  tracer: {
    enabled: true,
    showAddresses: true,
    gasCost: true,
  },
  mocha: {
    parallel: false,
    timeout: 600000, // 10 minutes (600,000ms) for testnet deployments
  },
  solidity: {
    version: "0.8.22",
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
      gas: "auto",
      url: process.env.SEPOLIA_RPC_URL ?? "",
      accounts: [
        process.env.DEPLOYER_PRIV_KEY!,
        process.env.TEST_WALLET_1_PRIV_KEY!,
        process.env.TEST_WALLET_2_PRIV_KEY!,
      ].filter((x) => x),
    },
    arbitrum: {
      chainId: 421614,
      gas: "auto",
      url: process.env.ARBITRUM_RPC_URL ?? "",
      accounts: [process.env.DEPLOYER_PRIV_KEY!].filter((x) => x),
      allowUnlimitedContractSize: true,
    },
    optimism: {
      chainId: 11155420,
      url: process.env.OPTIMISM_RPC_URL ?? "",
      accounts: [process.env.DEPLOYER_PRIV_KEY!].filter((x) => x),
    },
    fuji: {
      chainId: 43113,
      url: process.env.AVALANCHE_RPC_URL ?? '',
      accounts: [process.env.DEPLOYER_PRIV_KEY!].filter((x) => x),
    },
  },
  etherscan: {
    apiKey: process.env.API_KEY_ETHERSCAN,
  },
};

export default config;
