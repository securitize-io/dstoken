/* eslint-disable camelcase */
require('dotenv').config();

const argv = require('minimist')(process.argv.slice(2), {
  string: [
    'private_key',
  ],
});

const HDWalletProvider = require('@truffle/hdwallet-provider');
const Web3 = require('web3');

const timeoutBlocks = 10000000;

const privateKey =
  process.env.PRIVATE_KEY ||
  argv.private_key ||
  '28650A9B011C98C6F2D789F22CB7D7FE04CD45BA91260EF6193BBFAFC66BEA51';

module.exports = {
  networks: {
    development: {
      provider: () => new Web3.providers.HttpProvider("http://127.0.0.1:7545"),
      host: "localhost",
      port: 7545,
      network_id: "*",
    },
    // coverage: {
    //   host: 'localhost',
    //   network_id: '*', // eslint-disable-line camelcase
    //   port: 8555,
    //   gas: 0xfffffffffff,
    //   gasPrice: 0x01,
    // },
    // sepolia: {
    //   gasPrice: 65000000000,
    //   provider: new HDWalletProvider({
    //     privateKeys: [privateKey],
    //     providerOrUrl: `wss://sepolia.infura.io/ws/v3/${process.env.INFURA_API_KEY}`,
    //     chainId: 11155111,
    //   }),
    //   network_id: '11155111',
    //   skipDryRun: true,
    //   disableConfirmationListener: true
    // },
    // quorum: {
    //   host: '3.20.198.114',
    //   port: 22002, // was 8545
    //   network_id: '*', // Match any network id
    //   gasPrice: 0,
    //   type: 'quorum', // needed for Truffle to support Quorum
    // },
    // matic: {
    //   gasPrice: 100000000000,
    //   provider: () => new HDWalletProvider({
    //     privateKeys: [privateKey],
    //     providerOrUrl: `wss://polygon-mumbai.g.alchemy.com/v2/${process.env.API_KEY}`,
    //     chainId: 80001,
    //   }),
    //   network_id: 80001,
    //   timeoutBlocks: 10000000,
    //   skipDryRun: true,
    // },
    // avalanche: {
    //   provider: new HDWalletProvider({
    //     privateKeys: [privateKey],
    //     providerOrUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
    //     chainId: 43113,
    //   }),
    //   network_id: '43113',
    //   skipDryRun: true,
    // },
    // live: {
    //   gasPrice: 40000000000,
    //   provider: new HDWalletProvider({
    //     privateKeys: [privateKey],
    //     providerOrUrl: `wss://mainnet.infura.io/ws/v3/${process.env.INFURA_API_KEY}`,
    //     chainId: 1,
    //   }),
    //   network_id: '1',
    //   timeoutBlocks,
    // },
  },
  compilers: {
    solc: {
      version: "0.8.13",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
      },
    },
  },
  plugins: ["truffle-contract-size"],
};
