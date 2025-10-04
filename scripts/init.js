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
    dsToken: "0x983C179e1ABA7cE0f974b7165Caa05967577DF5A",
    trustService: "0x46f96fb48baE945Ee95Feb5F4dc4B2fB9dd7079A",
    regService: "0xa1efAf2BF27881f5F6e9005B46A53ca979C7bC37",
    compService: "0xe4EF689D188c4f5D5b558FAB3D8bc9468d8ED8f0",
    walletManager: "0xde37F2aC59b0e966322ba8d53a56E551095C7cf6",
    lockManager: "0xBad6A9c308b3fc6381833656265083179DdAD4Bf",
    compConfigService: "0x5EFae3f89f57c28Ccbf19366d161D44630D91873",
    tokenIssuer: "0x3dd98E85aF4cFf9bF2433a9A538a42E2dB1C79Eb",
    walletRegistrar: "0xf989251A96A8A3de26B89110646B56893Bd961f0",
    transactionRelayer: "0x0a9468bD7f7bDe737a037B095fF9376Adc884c9E",
    bulkOperator: "0xA14d18cBB5d1e2C81998C64f333BDBEfBfE9FeDE",
    rebasingProvider: "0xafECe6B8B16cFc3f4bD49Ac641868bf081317EDd",
    mockToken: "0x5D051165B60d4d1fE94201635fC5BCceC4D6a2D6"
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
  