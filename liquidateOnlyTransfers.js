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
    dsToken: "0x5864FC3020DED780285b3aE8dC04d6c3669fdC57",
    trustService: "0x01575eD4E8833E5227331010c2202Ce3f4c5DDAE",
    regService: "0xD60F031B2345f75955f21586Dc3dfCdf10ff6ef9",
    compService: "0xD248686dC53659AB080E434D6E80768D157f8d9a",
    walletManager: "0x87Bf0A18706A4Da48dF5E551115B178a13D7e53B",
    lockManager: "0x4cE15E1cFEDb2A82e1C3770350320bFDf477E595",
    compConfigService: "0x13C46eD3ee738D405854536E9fa888154aF653A7",
    tokenIssuer: "0x05580B9B71f0527542cFDFBFD1052376E994B28a",
    walletRegistrar: "0x836C970CC49e67F965efC707eb5391C915d6830f",
    transactionRelayer: "0x12c0B085F541c4e2404D7ee1d79e41B48389A1df",
    bulkOperator: "0x4405C462Faf5124a9F88082e2F191234b12B92A0",
    rebasingProvider: "0xF0e9A31890659E5135C2E4928d90C73eeAA7B320",
    mockToken: "0x97668fF4cc4bE98255a6B22c6753B103032aE5Ae"
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
  
await regService.registerInvestor("LiquidateOnlyInvestor","1")
await regService.setCountry("LiquidateOnlyInvestor", "US")
await regService.addWallet(
"0xb60ceE805b363c74399aFAc224812bF4789b3566","LiquidateOnlyInvestor"
)
await dsToken.issueTokens("0xb60ceE805b363c74399aFAc224812bF4789b3566","1")
await dsToken.balanceOf("0xb60ceE805b363c74399aFAc224812bF4789b3566");
await lockManager.setInvestorLiquidateOnly("0xb60ceE805b363c74399aFAc224812bF4789b3566", true);
await lockManager.isInvestorLiquidateOnly("0xb60ceE805b363c74399aFAc224812bF4789b3566");
await regService.registerInvestor("holder","1")
await regService.setCountry("holder", "US")
await regService.addWallet(
"0x56f7b817804AaCBd7dbd5d04b7aA6fEA227fC8a2","holder"
)
await dsToken.issueTokens("0x56f7b817804AaCBd7dbd5d04b7aA6fEA227fC8a2","100000")
lockManager.isInvestorLiquidateOnly("0xb60ceE805b363c74399aFAc224812bF4789b3566");
await lockManager.isInvestorLiquidateOnly("0xb60ceE805b363c74399aFAc224812bF4789b3566");
await dsToken.issueTokens("0xb60ceE805b363c74399aFAc224812bF4789b3566","100000")