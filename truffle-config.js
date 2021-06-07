/* eslint-disable camelcase */
require('dotenv').config();

const HDWalletProvider = require('truffle-hdwallet-provider');

const timeoutBlocks = 10000000;

const privateKey = 'c9b67cb69fa6ab37c3d31a3f992678fa4bee54d4843789ea9d37efc86ca07966';
//const privateKey = '8e7eeed64735dffb28e69ca23bf6006b26804191674c6147838e4a8de3253e66';

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
        `https://ropsten.infura.io/${process.env.INFURA_API_KEY}`
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
        'https://rinkeby.infura.io/v3/508df243d4a74a41a813ee8607efa79d'
      ),
      network_id: '4',
      timeoutBlocks,
      skipDryRun: true,
    },
    quorum: {
      host: '127.0.0.1',
      port: 22000, // was 8545
      network_id: '*', // Match any network id
      gasPrice: 0,
      type: 'quorum', // needed for Truffle to support Quorum
    },
    live: {
      gasPrice: 4000000000,
      provider: new HDWalletProvider(
        privateKey,
        `https://mainnet.infura.io/${process.env.INFURA_API_KEY}`
      ),
      network_id: '1',
      timeoutBlocks,
    },
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
};
