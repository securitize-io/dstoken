/* eslint-disable camelcase */
require('dotenv').config();

const argv = require('minimist')(process.argv.slice(2), {
  string: [
    'private_key',
  ],
});

const HDWalletProvider = require('truffle-hdwallet-provider');

const timeoutBlocks = 10000000;

const privateKey =
  process.env.PRIVATE_KEY ||
  argv.private_key ||
  '28650A9B011C98C6F2D789F22CB7D7FE04CD45BA91260EF6193BBFAFC66BEA51';

module.exports = {
  networks: {
    development: {
      host: 'localhost',
      port: 7545,
      network_id: '*', // eslint-disable-line camelcase
    },
    ropsten: {
      provider: new HDWalletProvider(
        privateKey,
        `https://ropsten.infura.io/v3/${process.env.INFURA_API_KEY}`
      ),
      network_id: 3, // eslint-disable-line camelcase
      timeoutBlocks,
    },
    coverage: {
      host: 'localhost',
      network_id: '*', // eslint-disable-line camelcase
      port: 8555,
      gas: 0xfffffffffff,
      gasPrice: 0x01,
    },
    ganache: {
      host: 'localhost',
      port: 7545,
      network_id: '*', // eslint-disable-line camelcase
    },
    rinkeby: {
      gasPrice: 4000000000,
      provider: new HDWalletProvider(
        privateKey,
        `https://rinkeby.infura.io/v3/${process.env.INFURA_API_KEY}`
      ),
      network_id: '4',
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
    useColors: true,
    bail: false,
    enableTimeouts: false,
  },
  compilers: {
    solc: {
      version: '^0.5.0',
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
  ],
};
