import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "./tasks/tasks.index";
import "dotenv/config";

/**
 * Signers available on every live network, in a fixed order so scripts can address roles by index:
 *   0 deployer/master, 1 issuer, 2 transfer agent, 3 proposer, 4 executor, 5 canceller.
 *
 * BC-2329 requires distinct funded EOAs per role — reusing one signer for everything hides
 * access-control bugs. Only DEPLOYER_PRIV_KEY is required; the rest are opt-in, so existing
 * single-key deploy flows are unaffected.
 */
const accounts = [
  process.env.DEPLOYER_PRIV_KEY,
  process.env.ISSUER_PRIV_KEY,
  process.env.TRANSFER_AGENT_PRIV_KEY,
  process.env.PROPOSER_PRIV_KEY,
  process.env.EXECUTOR_PRIV_KEY,
  process.env.CANCELLER_PRIV_KEY,
  // Index 6: the MASTER/owner() of a pre-existing token being upgraded, when that is not the
  // deployer. Address it with `--signer 6` (or by address) on the upgrade tasks. Kept last so it
  // never shifts the role indices above.
  process.env.LEGACY_MASTER_PRIV_KEY,
].filter((key): key is string => !!key);

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
      accounts,
    },
    arbitrum: {
      chainId: 421614,
      gas: "auto",
      url: process.env.ARBITRUM_RPC_URL ?? "",
      accounts,
      allowUnlimitedContractSize: true,
    },
    optimism: {
      chainId: 11155420,
      url: process.env.OPTIMISM_RPC_URL ?? "",
      accounts,
    },
    fuji: {
      chainId: 43113,
      // Public endpoint as a fallback so read-only audits work without a configured RPC.
      url: process.env.AVALANCHE_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc',
      accounts,
    },
    amoy: {
      chainId: 80002,
      url: process.env.POLYGON_RPC_URL || 'https://polygon-amoy-bor-rpc.publicnode.com',
      accounts,
    },
  },
  etherscan: {
    apiKey: process.env.API_KEY_ETHERSCAN,
  },
};

export default config;
