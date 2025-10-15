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
    dsToken: "0xc1A5333f5668280506802fd7be291a9A60960B60",
    trustService: "0x21c2A2D08bF7ad46137950bb5BfFd077DB7b8dC4",
    regService: "0x193f890709A2005355460964fa31a3DF0c507802",
    compService: "0xe0625E49720bC93Efe9927F9cC50B658d6708156",
    walletManager: "0x619Fec23873cc6850671EE405cB7f3480C1D6775",
    lockManager: "0x191B40369C87F2F664F945ce6dCe7fB4d28f2BC6",
    compConfigService: "0x61393fdA654F00D771822436e64091eCA64e4042",
    tokenIssuer: "0x7e9f4a2f4FF3C8438aD90b99cEC7d21E35a8ff0C",
    walletRegistrar: "0x456357A72DD81D7AA04AdA9cC5fff36E8fF36875",
    transactionRelayer: "0x906B6070d1C1070Cb5d8a12e51974CD38b885C31",
    bulkOperator: "0x5Bc0e6225d87Ea16A47B7Ae1d9EFF201C1003F2A",
    rebasingProvider: "0x7D17B28db440Dc6193b9a4a37C90289bD311588E",
    mockToken: "0x1928ee97f02Ac0197cD8901c4e61afb2101cE1dC"
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
  