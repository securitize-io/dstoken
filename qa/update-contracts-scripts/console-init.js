// qa/update-contracts-scripts/console-init.js
// Usage inside HH console:
// $ npx hardhat console --network arbitrum
// > .load qa/update-contracts-scripts/console-init.js

// Ensure ethers exists (works both in console and when run via node)
if (!global.ethers) {
    global.hre = require("hardhat");
    global.ethers = hre.ethers;
  }
  
  // === Addresses (edit if they change) ===
  const ADDR = {
    dsToken: "0x73D0b1CD6439578882FC30fe658c87D8927C79aF",
    regService: "0x48B659E52082f59150fF7C04d56bdaA10096e06a",
    trustService: "0x81828Ee6D5cf26E6608d514c0eBE772CCF060A2c",
    compService: "0x3B1685D38BCA0D99e62deCe68b399A6C42eA45b8",
    walletManager: "0x5Ba6C13F47e11beF5392d0cB8025b6967173bDbb",
    lockManager: "0x940Db9941e17e2229f03ebD28e1A672b1f1e425b",
    compConfigService: "0x23B54eC18110f325079D83d8BF72Ca5524dD9f92",
    tokenIssuer: "0x03725C73A7B958d6df41C57A8226bA18a9D78D5b",
    walletRegistrar: "0x871dB8005F86F7733645910A421aFb9f39C1D366",
    transactionRelayer: "0x4D0EB693957Fd0db4a6817c26E5eD5F1AFE1f790",
    bulkOperator: "0x3cAf3a0e7656015b9D50A694a4c60aEF0AC395DE",
    rebasingProvider: "0xe920FCFcae40ff8F25e6ACfF1ddcF7E38D02cd74",
    mockToken: "0x712d7d168Da017Fe46759B60B6a347EE2DdDEA92"
  };
  
  (async () => {
    // Default signer (first account from your provider or injected wallet)
    const [signer] = await ethers.getSigners();
    global.signer = signer;
  
                                                                                                                                                                    // Attach contracts and expose as globals
    global.dsToken = await ethers.getContractAt("DSToken", ADDR.dsToken, signer);
    global.regService = await ethers.getContractAt("IDSRegistryService", ADDR.regService, signer);
    global.trustService = await ethers.getContractAt("IDSTrustService", ADDR.trustService, signer);
    global.compService = await ethers.getContractAt("ComplianceServiceRegulated", ADDR.compService, signer);
    global.walletManager = await ethers.getContractAt("IDSWalletManager", ADDR.walletManager, signer);
    global.lockManager = await ethers.getContractAt("IDSLockManager", ADDR.lockManager, signer);
    global.compConfigService = await ethers.getContractAt("IDSComplianceConfigurationService", ADDR.compConfigService, signer);
    global.tokenIssuer = await ethers.getContractAt("IDSTokenIssuer", ADDR.tokenIssuer, signer);
    global.walletRegistrar = await ethers.getContractAt("IDSWalletRegistrar", ADDR.walletRegistrar, signer);
    global.transactionRelayer = await ethers.getContractAt("TransactionRelayer", ADDR.transactionRelayer, signer);
    global.bulkOperator = await ethers.getContractAt("IBulkOperator", ADDR.bulkOperator, signer);
    global.rebasingProvider = await ethers.getContractAt("ISecuritizeRebasingProvider", ADDR.rebasingProvider, signer);
    global.mockToken = await ethers.getContractAt("StandardTokenMock", ADDR.mockToken, signer);
// Handy helpers (optional)
    global.addr = ADDR; // quick access to addresses
  
    global.me = async () => {
      const a = await signer.getAddress();
      const n = await ethers.provider.getNetwork();
      console.log({ address: a, chainId: Number(n.chainId), name: n.name });
    };
  
    // Example quick checks you can call after loading:
    // await t() → prints symbol/name of the token
    global.t = async () => {
      try {
        const [sym, name] = await Promise.all([dsToken.symbol(), dsToken.name()]);
        console.log({ symbol: sym, name });
      } catch (e) {
        console.error("Token read failed:", e.message || e);
      }
    };
  
    console.log("✅ Contracts loaded to globals:");
    console.log("- dsToken, regService, trustService, compService, walletManager, lockManager, compConfigService, tokenIssuer, walletRegistrar, transactionRelayer, bulkOperator, rebasingProvider, mockToken");
    console.log("Helpers: me(), t(), addr");
  })();
  