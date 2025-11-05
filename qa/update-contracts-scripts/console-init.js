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
    dsToken: "0x696636c032cCBb81932d9aeB176992CfAf264d32",
    regService: "0x65A4DFB4d27462118E2044916B776DDEfFd54e7d",
    trustService: "0xD13F9A8be57432a6C7bB4E7D7351D2192139995F",
    compService: "0x1B1eA586261fD2343C8979BD125c25FeE8D68818",
    walletManager: "0xC116ca3A929D787F55bd94CC5280dE7719CE2FBF",
    lockManager: "0x1b71363Ed7C444A46413cb7E47FF9CBf5d9C1CaE",
    compConfigService: "0xBe27CafcE28E91048B9F5fD06b6756B75b24223E",
    tokenIssuer: "0x00eF3496B86AB81497e84706082eDbF4a61B1D4b",
    walletRegistrar: "0xEE4ce6faD4c2Ff09b426b68861339C2214C64CeE",
    transactionRelayer: "0x77fBfB85848D6aDddb3142fE7dD0f74B722f9028",
    bulkOperator: "0x7c8140B825E3Dc0Da6f23e320e5E591501D4F02a",
    rebasingProvider: "0xFa642C8D2053a54e71bACbDec215bf3b497B99AD",
    mockToken: "0xB39619F934a4ABEA17c83e91192C17D73c380c79"
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
  