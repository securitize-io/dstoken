import type { HardhatUserConfig } from "hardhat/config";
import type {} from "@nomicfoundation/hardhat-toolbox";
import { join } from "path";

require("dotenv/config");

if (process.env.INJHOME && !process.env.MANIFEST_DEFAULT_DIR) {
  process.env.MANIFEST_DEFAULT_DIR = join(process.env.INJHOME, ".openzeppelin");
}

require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("./tasks/tasks.index");

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
    injectiveLocal: {
      chainId: 1776,
      gas: "auto",
      gasPrice: 160000000,
      url: process.env.INJECTIVE_LOCAL_RPC_URL ?? "http://127.0.0.1:8545",
      accounts: [
        process.env.INJECTIVE_LOCAL_DEPLOYER_PRIV_KEY ??
          "0xe9b1d63e8acd7fe676acb43afb390d4b0202dab61abec9cf2a561e4becb147de",
        "0x88cbead91aee890d27bf06e003ade3d4e952427e88f88d31d61d3ef5e5d54305",
        "0x741de4f8988ea941d3ff0287911ca4074e62b7d45c991a51186455366f10b544",
        "0x39a4c898dda351d54875d5ebb3e1c451189116faa556c3c04adc860dd1000608",
        "0x6c212553111b370a8ffdc682954495b7b90a73cedab7106323646a4f2c4e668f",
      ],
    },
  },
  etherscan: {
    apiKey: process.env.API_KEY_ETHERSCAN,
  },
};

export default config;
