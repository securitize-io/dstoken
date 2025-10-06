// scripts/init.js
// Usage inside HH console:
// $ npx hardhat console --network arbitrum
// > .load scripts/init.js

// Ensure ethers exists (works both in console and when run via node)
if (!global.ethers) {
    global.hre = require("hardhat");
    global.ethers = hre.ethers;
  }
  
  // === Addresses (edit if they change) ===
  const ADDR = {
    dsToken: "0x9Bb0af14a1Ad355EB77efefd52b312B97edbaB75",
    trustService: "0x8cc022Cdd08ba8B5835E6DFf2a9fDC8F0338dE0d",
    regService: "0x7B78eEaF5560E885ab6633D170505610c0cd477e",
    compService: "0x123b5A5bA168aE64a4Bf631493E9c998d01683e2",
    walletManager: "0x0cb2De0361cDBec63210F9287e528DeEa2EE47eA",
    lockManager: "0xE587078f88b3b7e4179da89fdb108F3627a7F22B",
    compConfigService: "0x17a3a58a849Da2996191758e43C9adaa0b7405E9",
    tokenIssuer: "0xd1bebB0B045cFD1cb4fDaeedb89d6e471155494d",
    walletRegistrar: "0x5443AF2732258C1047CCF6d61e2F48528E5D9283",
    transactionRelayer: "0x4980287aD31E8E2e579F35f3D113dE038132e006",
    bulkOperator: "0x2eBc60128ad4bDD2213334C7ce4912a17CAB52E4",
    rebasingProvider: "0xbFB6C24CAb83A0A62aF5D114662b626a918CD6de",
    mockToken: "0x5d58eB31c64657641eE75e630586FF5e8a4f831E"
  };
  
  (async () => {
    // Default signer (first account from your provider or injected wallet)
    const [signer] = await ethers.getSigners();
    global.signer = signer;
  
                                                                // Attach contracts and expose as globals
    global.dsToken = await ethers.getContractAt("IDSToken", ADDR.dsToken, signer);
    global.trustService = await ethers.getContractAt("IDSTrustService", ADDR.trustService, signer);
    global.regService = await ethers.getContractAt("IDSRegistryService", ADDR.regService, signer);
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
    console.log("- dsToken, trustService, regService, compService, walletManager, lockManager, compConfigService, tokenIssuer, walletRegistrar, transactionRelayer, bulkOperator, rebasingProvider, mockToken");
    console.log("Helpers: me(), t(), addr");
  })();
  