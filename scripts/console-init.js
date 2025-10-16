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
    dsToken: "0x758460444e70c9e15d069862BD21D7e6461405c0",
    regService: "0xF965F511856e8F963F6F455F4d48EE4d4c0f6cC1",
    trustService: "0x24C631eD5Ef434CE93bc2476358d732321d7F9e3",
    compService: "0xA20D6b350427Ac5864bE23d87CFc8eDe1A9eDC8d",
    walletManager: "0xD2B2dA929fdc903879158c84C4fCF28504E3d15e",
    lockManager: "0xFFc82f2D4ac645EE08ed1075287f0CA4FF083900",
    compConfigService: "0xC551dfbEea024F536Da48b3a0F4D671D70813C36",
    tokenIssuer: "0x2A643c33a57F7F54dc79611666123F9470cc75D8",
    walletRegistrar: "0xD4Eb8F12f4cD1718966B2fe613D8f17C3230b7b9",
    transactionRelayer: "0x7985E2be5Fe02E84De5BBF266367eae927f32c94",
    bulkOperator: "0x8A9428f1C31F96B5A75C320501e5f514abE9e93A",
    rebasingProvider: "0x3c75e059Ad038fdB8C11d35CdF12dC770E4cC0A5",
    mockToken: "0x6BF95b896fCdE7A961900e17ccd3AE68bB7D7297"
  };
  
  (async () => {
    // Default signer (first account from your provider or injected wallet)
    const [signer] = await ethers.getSigners();
    global.signer = signer;
  
                                                                                                                                        // Attach contracts and expose as globals
    global.dsToken = await ethers.getContractAt("IDSToken", ADDR.dsToken, signer);
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
  