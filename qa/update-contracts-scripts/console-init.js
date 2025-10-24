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
    dsToken: "0xbA5a5EFDf79F63B5cD413AC88daf7251B29cA5EB",
    regService: "0x472c1AbE5e54e56480f78C96bF05436B3ACF4606",
    trustService: "0xDC06cdD538F4E5A08F6009011EBa941d1d16e869",
    compService: "0x389629Fd1f3BDDC051d9458E0B043606928D24D1",
    walletManager: "0xb1916a151Ad7ecEA8c62b8aF5a2505b0EFC9A6C3",
    lockManager: "0x9B79cf4F3D56e87837B9434b09EdF5972e82eB4b",
    compConfigService: "0xAB6257058319aeF98E19680DDFfc748F7a387313",
    tokenIssuer: "0x263b1B606C40bdA91966F5723CB8D9DdF26eA6C6",
    walletRegistrar: "0x36dfD20EAD02ed688a6Bf9e8F73F21932D1C321b",
    transactionRelayer: "0xa05474C1Bfd5006dAC55384b6E1dFFB9413FfdCB",
    bulkOperator: "0xe3F0B5a7c70B006D41c06f3F3f8735B8Fc15e73f",
    rebasingProvider: "0x15eaaC206Dfe731664Ef1dE25bCD139b7C01D52d",
    mockToken: "0x42b2c2bc9d97de30bCe0f06327655C5988D9c982"
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
  