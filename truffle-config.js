/* eslint-disable camelcase */
require("dotenv").config();

const WalletProvider = require("truffle-wallet-provider");
let privateKey = null;
if (process.env.PRIVATE_KEY) {
  privateKey = require("ethereumjs-wallet").fromPrivateKey(
    Buffer.from(process.env.PRIVATE_KEY, "hex")
  );
} else {
  privateKey = require("ethereumjs-wallet").fromPrivateKey(
    Buffer.from(
      "9de51fddb94bc44f2eeaa2fd346befdd2dd7a18945689f8ed42c041d8a9dd459",
      "hex"
    )
  ); // Fake private key
}
module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 7545,
      network_id: "*" // eslint-disable-line camelcase
    },
    ropsten: {
      provider: new WalletProvider(
        privateKey,
        `https://ropsten.infura.io/${process.env.INFURA_API_KEY}`
      ),
      network_id: 3 // eslint-disable-line camelcase
    },
    coverage: {
      host: "localhost",
      network_id: "*", // eslint-disable-line camelcase
      port: 8555,
      gas: 0xfffffffffff,
      gasPrice: 0x01
    },
    ganache: {
      host: "localhost",
      port: 8545,
      network_id: "*" // eslint-disable-line camelcase
    },
    rinkeby: {
      gasPrice: 20000000000,
      provider: new WalletProvider(
        privateKey,
        `https://rinkeby.infura.io/${process.env.INFURA_API_KEY}`
      ),
      network_id: "4"
    },
    quorum: {
      host: "127.0.0.1",
      port: 22000, // was 8545
      network_id: "*", // Match any network id
      gasPrice: 0,
      type: "quorum" // needed for Truffle to support Quorum
    },
    live: {
      //  "gas":      20000000,
      gasPrice: 22000000000,
      provider: new WalletProvider(
        privateKey,
        `https://mainnet.infura.io/${process.env.INFURA_API_KEY}`
      ),
      network_id: "1"
    }
  },
  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  }
};
