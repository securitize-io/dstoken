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
      provider: () => new Web3.providers.HttpProvider('http://127.0.0.1:7545'),
      host: 'localhost',
      port: 7545,
      network_id: '*', // eslint-disable-line camelcase
    },
    coverage: {
      host: 'localhost',
      network_id: '*', // eslint-disable-line camelcase
      port: 8555,
      gas: 0xfffffffffff,
      gasPrice: 0x01,
    },
    goerli: {
      gasPrice: 4000000000,
      provider: new HDWalletProvider(
        privateKey,
        `https://goerli.infura.io/v3/${process.env.INFURA_API_KEY}`
      ),
      network_id: '5',
      timeoutBlocks,
    },
    quorum: {
      host: '127.0.0.1',
      port: 22000, // was 8545
      network_id: '*', // Match any network id
      gasPrice: 0,
      type: 'quorum', // needed for Truffle to support Quorum
    },
    live: {
      gasPrice: 40000000000,
      provider: new HDWalletProvider(
        privateKey,
        `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`
      ),
      network_id: '1',
      timeoutBlocks,
    },
  },
  mocha: {
    reporter: 'eth-gas-reporter',
    useColors: true,
    bail: false,
    enableTimeouts: false,
  },
  compilers: {
    solc: {
      version: '^0.8.13',
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
      },
    },
  },
  plugins: [
    'truffle-contract-size',
    'eth-gas-reporter',
  ],
};
