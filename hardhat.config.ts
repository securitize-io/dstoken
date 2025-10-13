import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "./tasks/tasks.index";
import "dotenv/config";

const config: HardhatUserConfig = {
  mocha: {
    parallel: false,
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
      accounts: [process.env.DEPLOYER_PRIV_KEY!].filter((x) => x),
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
    apiKey: {
      mainnet: process.env.API_KEY_ETHERSCAN || "",
      sepolia: process.env.API_KEY_ETHERSCAN || "",
      arbitrumOne: process.env.API_KEY_ARBISCAN || "",
      arbitrumSepolia: process.env.API_KEY_ARBISCAN || "",
      optimisticEthereum: process.env.API_KEY_OPTIMISTIC || "",
      optimisticSepolia: process.env.API_KEY_OPTIMISTIC || "",
      avalanche: process.env.API_KEY_AVALANCHE || "",
      avalancheFujiTestnet: process.env.API_KEY_AVALANCHE || "",
    },
  },
};

export default config;
