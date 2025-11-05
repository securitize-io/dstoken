import { task, types } from "hardhat/config";
import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";

// Contract addresses (auto-updated from deployment)
const CONTRACT_ADDRESSES = {
  regService: "0x65A4DFB4d27462118E2044916B776DDEfFd54e7d",
  trustService: "0xD13F9A8be57432a6C7bB4E7D7351D2192139995F",
  compConfigService: "0xBe27CafcE28E91048B9F5fD06b6756B75b24223E",
  compService: "0x1B1eA586261fD2343C8979BD125c25FeE8D68818",
  walletManager: "0xC116ca3A929D787F55bd94CC5280dE7719CE2FBF",
  lockManager: "0x1b71363Ed7C444A46413cb7E47FF9CBf5d9C1CaE",
  tokenIssuer: "0x00eF3496B86AB81497e84706082eDbF4a61B1D4b",
  walletRegistrar: "0xEE4ce6faD4c2Ff09b426b68861339C2214C64CeE",
  transactionRelayer: "0x77fBfB85848D6aDddb3142fE7dD0f74B722f9028",
  bulkOperator: "0x7c8140B825E3Dc0Da6f23e320e5E591501D4F02a",
  rebasingProvider: "0xFa642C8D2053a54e71bACbDec215bf3b497B99AD",
  mockToken: "0xB39619F934a4ABEA17c83e91192C17D73c380c79",
  dsToken: "0x696636c032cCBb81932d9aeB176992CfAf264d32"
};;;;;;;;;;;;;;;;

// Interface for token issuance data
interface TokenIssuanceData {
  investorId: string;
  walletAddress: string;
  tokens: number;
  description?: string;
}

// Interface for enhanced issuance data with investor details
interface EnhancedIssuanceData {
  id: string;
  collisionHash: string;
  wallets: string[];
  pk: string;
  tokens: number;
  description?: string;
}

// Interface for create-investor output (primary input format)
interface CreateInvestorOutput {
  metadata: any;
  generatedWallets: Array<{
    investorId: string;
    address: string;
    privateKey: string;
    tokens: number;
  }>;
}

task('issue-tokens', 'Issue tokens to investor wallets from create-investor output')
  .addPositionalParam('file', 'Path to create-investor output JSON file', undefined, types.string)
  .addOptionalParam('tokenaddress', 'Token contract address (overrides task default)', undefined, types.string)
  .addOptionalParam('tokens', 'Number of tokens to issue to each wallet (overrides JSON file tokens field)', undefined, types.string)
  .addFlag('dryrun', 'Show what would be executed without sending transactions')
  .addFlag('forceonchain', 'Force token issuance on-chain even if expected to fail (for QA evidence)')
  .addOptionalParam('gaslimit', 'Gas limit for transactions', '1000000', types.string)
  .addOptionalParam('gasprice', 'Gas price in gwei', undefined, types.string)
  .addOptionalParam('outputDir', 'Directory to save output files', './qa/tasks', types.string)
  .setAction(async (args, hre) => {
    const { file, tokenaddress, tokens, dryrun, forceonchain, gaslimit, gasprice, outputDir } = args;
    
    // Load create-investor output file
    if (!fs.existsSync(file)) {
      console.error(`❌ Create-investor file not found: ${file}`);
      process.exit(1);
    }
    
    console.log(`📋 Loading create-investor output: ${file}`);
    const createInvestorData: CreateInvestorOutput = JSON.parse(fs.readFileSync(file, 'utf8'));
    
    if (!createInvestorData.generatedWallets || !Array.isArray(createInvestorData.generatedWallets)) {
      console.error('❌ Invalid create-investor file format. Expected: { "generatedWallets": [...] }');
      process.exit(1);
    }
    
    // Analyze the input data and show statistics
    console.log('📊 Analyzing create-investor output...');
    console.log(`👥 Total investors found: ${createInvestorData.generatedWallets.length}`);
    
    const walletsNeedingTokens = createInvestorData.generatedWallets.filter(wallet => wallet.tokens > 0);
    
    console.log(`🪙 Investors needing token issuance: ${walletsNeedingTokens.length}`);
    
    // Convert create-investor format to processing formats
    const enhancedData = createInvestorData.generatedWallets.map(wallet => ({
      id: wallet.investorId,
      collisionHash: wallet.investorId, // Use investorId as collisionHash for compatibility
      wallets: [wallet.address],
      pk: wallet.privateKey,
      tokens: tokens ? parseInt(tokens) : (wallet.tokens || 0), // Use --tokens parameter if provided, otherwise use JSON file value
      description: `Process wallet for ${wallet.investorId}`
    }));
    
    // Convert to standard issuance format (only wallets with tokens > 0)
    const issuanceData = enhancedData
      .filter(item => item.tokens > 0)
      .map(item => ({
        investorId: item.id,
        walletAddress: item.wallets[0],
        tokens: item.tokens,
        description: `Issue ${item.tokens} tokens to ${item.id}`
      }));
    
    console.log(`🌐 Network: ${hre.network.name}`);
    console.log(`🔗 Chain ID: ${hre.network.config.chainId}`);
    console.log(`📥 Input source: create-investor output`);
    
    if (tokens) {
      console.log(`🪙 TOKENS PARAMETER: Overriding JSON file tokens with ${tokens} tokens for ALL wallets`);
    }
    
    if (dryrun) {
      console.log('\n🔍 DRY RUN - No transactions will be executed\n');
    }
    
    if (forceonchain) {
      console.log('\n🔗 FORCE ON-CHAIN ENABLED - Will capture transaction hashes even for failed issuances\n');
    }
    
    // Get signer
    const [signer] = await hre.ethers.getSigners();
    console.log(`👤 Using signer: ${await signer.getAddress()}`);
    
    // Determine token contract address
    const finalTokenAddress = tokenaddress || CONTRACT_ADDRESSES.dsToken;
    
    if (tokenaddress) {
      console.log(`🪙 Token contract: ${finalTokenAddress} (from --tokenaddress parameter)`);
    } else {
      console.log(`🪙 Token contract: ${finalTokenAddress} (from task file - auto-updated)`);
    }
    
    // Load token contract
    const dsToken = await hre.ethers.getContractAt("DSToken", finalTokenAddress, signer);
    
    // Load Token Issuer contract (for proper token issuance)
    const tokenIssuer = await hre.ethers.getContractAt("IDSTokenIssuer", CONTRACT_ADDRESSES.tokenIssuer, signer);
    console.log(`🏭 Token Issuer: ${CONTRACT_ADDRESSES.tokenIssuer} (proper issuance method)`);
    
    // Get token info
    try {
      const [name, symbol, decimals] = await Promise.all([
        dsToken.name(),
        dsToken.symbol(),
        dsToken.decimals()
      ]);
      console.log(`📝 Token: ${name} (${symbol}) - ${decimals} decimals`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`⚠️  Could not fetch token info: ${errorMessage}`);
    }
    
    // Track execution metadata
    const executionMetadata = {
      executedAt: new Date().toISOString(),
      network: hre.network.name,
      chainId: hre.network.config.chainId,
      signer: await signer.getAddress(),
      tokenContract: finalTokenAddress,
      inputSource: 'create-investor output',
      flags: {
        dryrun,
        forceonchain
      },
      inputFile: file,
      gasSettings: {
        gasLimit: gaslimit,
        gasPrice: gasprice
      }
    };
    
    let successCount = 0;
    let failCount = 0;
    let totalIssued = BigInt(0);
    let evidenceTransactions: any[] = [];
    let issuanceResults: Array<{issuanceNumber: number, investorId: string, walletAddress: string, tokens: number, description: string, txHash?: string}> = [];
    
    // Generate timestamp for consistent file naming
    const executionTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // STEP 1: TOKEN ISSUANCE
    if (issuanceData.length > 0) {
      console.log('\n🪙 Step 1: Issuing tokens...');
      console.log('='.repeat(80));
      
      for (let i = 0; i < issuanceData.length; i++) {
      const issuance = issuanceData[i];
      
      try {
        console.log(`\n📋 Issuance ${i + 1}/${issuanceData.length}`);
        if (issuance.description) {
          console.log(`   📝 Description: ${issuance.description}`);
        }
        
        console.log(`   👤 Investor ID: ${issuance.investorId}`);
        console.log(`   💼 Wallet: ${issuance.walletAddress}`);
        console.log(`   🪙 Tokens: ${issuance.tokens}`);
        
        // Validate wallet address
        if (!ethers.isAddress(issuance.walletAddress)) {
          throw new Error(`Invalid wallet address: ${issuance.walletAddress}`);
        }
        
        if (dryrun) {
          console.log(`   ✅ [DRY RUN] Would issue ${issuance.tokens} tokens to ${issuance.walletAddress}`);
          successCount++;
          totalIssued += ethers.parseUnits(issuance.tokens.toString(), 6);
          
          // Add to results without tx hash for dry run
          issuanceResults.push({
            issuanceNumber: i + 1,
            investorId: issuance.investorId,
            walletAddress: issuance.walletAddress,
            tokens: issuance.tokens,
            description: issuance.description || `Issue ${issuance.tokens} tokens to ${issuance.investorId}`,
            txHash: undefined
          });
        } else {
          // Execute token issuance and capture transaction hash
          const txHash = await handleTokenIssuance(
            tokenIssuer,
            issuance,
            forceonchain,
            evidenceTransactions,
            gaslimit,
            gasprice,
            i + 1
          );
          
          successCount++;
          totalIssued += ethers.parseUnits(issuance.tokens.toString(), 6);
          
          // Add to results with tx hash
          issuanceResults.push({
            issuanceNumber: i + 1,
            investorId: issuance.investorId,
            walletAddress: issuance.walletAddress,
            tokens: issuance.tokens,
            description: issuance.description || `Issue ${issuance.tokens} tokens to ${issuance.investorId}`,
            txHash: txHash
          });
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`   ❌ Error issuing tokens to ${issuance.investorId}:`, errorMessage);
        failCount++;
        
        // Add failed issuance to results without tx hash
        issuanceResults.push({
          issuanceNumber: i + 1,
          investorId: issuance.investorId,
          walletAddress: issuance.walletAddress,
          tokens: issuance.tokens,
          description: issuance.description || `Issue ${issuance.tokens} tokens to ${issuance.investorId}`,
          txHash: undefined
        });
      }
      }
      
      console.log('\n' + '='.repeat(80));
      console.log(`📊 Token Issuance Summary: ${successCount} successful, ${failCount} failed`);
      console.log(`🪙 Total issued: ${ethers.formatUnits(totalIssued, 6)} tokens`);
      
      if (failCount > 0) {
        console.log('⚠️  Some token issuances failed. Check the error messages above.');
      }
    } else {
      console.log('\nℹ️  No token issuances to process (tokens: 0 for all investors)');
    }
    
    // Show evidence transactions if any were captured
    if (evidenceTransactions.length > 0) {
      console.log('\n🧾 QA EVIDENCE TRANSACTIONS:');
      console.log('='.repeat(60));
      evidenceTransactions.forEach((tx, index) => {
        console.log(`${index + 1}. ${tx.investorId}: ${tx.hash} (${tx.status})`);
        if (tx.error) {
          console.log(`   Error: ${tx.error}`);
        }
        if (tx.additionalInfo) {
          console.log(`   Info: ${tx.additionalInfo}`);
        }
      });
    }
    
    // Final Summary
    console.log('\n' + '='.repeat(80));
    console.log('📋 FINAL SUMMARY');
    console.log('='.repeat(80));
    console.log(`👥 Total investors processed: ${createInvestorData.generatedWallets.length}`);
    console.log(`🪙 Token issuances: ${issuanceData.length} (${successCount} successful, ${failCount} failed)`);
    
    if (dryrun) {
      console.log('\n💡 This was a DRY RUN - to execute for real, run without --dryrun flag');
    }
    
    // Prepare comprehensive output data
    const outputData = {
      metadata: executionMetadata,
      summary: {
        totalInvestors: createInvestorData.generatedWallets.length,
        tokenIssuance: {
          totalProcessed: issuanceData.length,
          successCount,
          failCount,
          totalIssued: ethers.formatUnits(totalIssued, 6)
        }
      },
      evidenceTransactions,
      issuanceDetails: issuanceResults
    };
    
    // Save comprehensive execution output
    console.log('\n📊 Saving execution output...');
    const outputFile = saveExecutionOutput(outputData, outputDir, executionTimestamp);
    console.log(`   📁 Output saved to: ${outputFile}`);
    
    console.log('\n📖 For more information, see the task help: npx hardhat help issue-tokens');
  });

// Function to handle token issuance using Token Issuer contract
async function handleTokenIssuance(
  tokenIssuer: any,
  issuance: TokenIssuanceData,
  forceOnChain: boolean,
  evidenceTransactions: any[],
  gaslimit: string,
  gasprice: string | undefined,
  issuanceNumber: number
): Promise<string | undefined> {
  console.log(`   🚀 Issuing ${issuance.tokens} tokens to wallet: ${issuance.walletAddress}`);
  
  // Convert tokens to wei (token has 6 decimals)
  const tokensWei = ethers.parseUnits(issuance.tokens.toString(), 6);
  
  // Extract country from investor ID (e.g., "lau_transfer_US_642374" -> "US")
  const countryMatch = issuance.investorId.match(/_([A-Z]{2})_/);
  const country = countryMatch ? countryMatch[1] : "US"; // Default to US
  
  // Prepare Token Issuer parameters
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const issuanceValues = [tokensWei, currentTimestamp]; // [amount, issuanceTime]
  const reason = issuance.description || `Token issuance for ${issuance.investorId}`;
  const locksValues: number[] = []; // No locks
  const lockReleaseTimes: number[] = []; // No locks
  const collisionHash = `${issuance.investorId}_${currentTimestamp}_${issuanceNumber}`;
  const attributeValues = [1, 1, 1]; // KYC_APPROVED, ACCREDITED, QUALIFIED
  const attributeExpirations = [0, 0, 0]; // No expirations
  
  console.log(`   📍 Country: ${country}, 🔗 Collision Hash: ${collisionHash}`);
  
  if (forceOnChain) {
    // FORCE ON-CHAIN MODE: Bypass gas estimation and force blockchain submission
    console.log(`   🔗 Forcing on-chain execution (bypassing simulation)...`);
    
    try {
      let issueTx;
      
      try {
        // Try with manual gas settings to force submission
        const provider = tokenIssuer.runner.provider;
        const gasPrice = await provider.getFeeData();
        issueTx = await tokenIssuer.issueTokens(
          issuance.investorId,
          issuance.walletAddress,
          issuanceValues,
          reason,
          locksValues,
          lockReleaseTimes,
          collisionHash,
          country,
          attributeValues,
          attributeExpirations,
          {
            gasLimit: parseInt(gaslimit),
            gasPrice: gasPrice.gasPrice,
          }
        );
      } catch (estimationError: any) {
        // If gas estimation still fails, try with populateTransaction
        console.log(`   🔄 Gas estimation failed, trying raw transaction...`);
        
        const populatedTx = await tokenIssuer.issueTokens.populateTransaction(
          issuance.investorId,
          issuance.walletAddress,
          issuanceValues,
          reason,
          locksValues,
          lockReleaseTimes,
          collisionHash,
          country,
          attributeValues,
          attributeExpirations
        );
        const provider = tokenIssuer.runner.provider;
        const gasPrice = await provider.getFeeData();
        populatedTx.gasLimit = parseInt(gaslimit);
        populatedTx.gasPrice = gasPrice.gasPrice;
        
        // Send the raw transaction
        issueTx = await tokenIssuer.runner.sendTransaction(populatedTx);
      }
      
      console.log(`   ⏳ Issuance transaction submitted: ${issueTx.hash}`);
      
      // Store transaction info for QA evidence before waiting
      evidenceTransactions.push({
        issuanceNumber,
        investorId: issuance.investorId,
        hash: issueTx.hash,
        status: 'SUBMITTED',
        walletAddress: issuance.walletAddress,
        tokens: issuance.tokens
      });
      console.log(`   📝 Evidence captured: ${issueTx.hash}`);
      
      // Wait for transaction - this might fail if it reverts on-chain
      try {
        await issueTx.wait();
        
        // Update status if successful
        const txRecord = evidenceTransactions.find(tx => tx.hash === issueTx.hash);
        if (txRecord) txRecord.status = 'SUCCESS';
        
        console.log(`   ✅ Issued ${issuance.tokens} tokens successfully!`);
      } catch (waitError: any) {
        // Transaction was submitted but reverted on-chain
        const txRecord = evidenceTransactions.find(tx => tx.hash === issueTx.hash);
        if (txRecord) {
          txRecord.status = 'REVERTED_ON_CHAIN';
          txRecord.error = waitError.message;
        }
        console.log(`   📝 Transaction reverted on-chain: ${issueTx.hash}`);
        console.error(`   ❌ Transaction reverted: ${waitError.message}`);
      }
      
      return issueTx.hash;
      
    } catch (error: any) {
      console.error(`   ❌ Error issuing tokens to ${issuance.investorId}: ${error.message}`);
      
      // Try to capture transaction hash from different error properties
      let txHash = 'N/A';
      let additionalInfo = '';
      
      if (error.transaction?.hash) {
        txHash = error.transaction.hash;
      } else if (error.transactionHash) {
        txHash = error.transactionHash;
      } else if (error.receipt?.transactionHash) {
        txHash = error.receipt.transactionHash;
      } else if (error.code) {
        additionalInfo = `Code: ${error.code}`;
      }
      
      // For reverted transactions, try to get the transaction data
      if (txHash === 'N/A' && error.data) {
        additionalInfo += additionalInfo ? `, Data: ${error.data}` : `Data: ${error.data}`;
      }
      
      // Capture failed transaction hash for QA evidence
      evidenceTransactions.push({
        issuanceNumber,
        investorId: issuance.investorId,
        hash: txHash,
        status: 'FAILED_BEFORE_SUBMISSION',
        walletAddress: issuance.walletAddress,
        tokens: issuance.tokens,
        error: error.message,
        additionalInfo: additionalInfo || undefined
      });
      console.log(`   📝 Evidence captured for failed transaction: ${txHash}${additionalInfo ? ` (${additionalInfo})` : ''}`);
      
      return txHash !== 'N/A' ? txHash : undefined;
    }
  } else {
    // NORMAL MODE: Standard behavior with gas estimation using Token Issuer
    try {
      const issueTx = await tokenIssuer.issueTokens(
        issuance.investorId,
        issuance.walletAddress,
        issuanceValues,
        reason,
        locksValues,
        lockReleaseTimes,
        collisionHash,
        country,
        attributeValues,
        attributeExpirations,
        {
          gasLimit: parseInt(gaslimit),
          ...(gasprice && { gasPrice: ethers.parseUnits(gasprice, 'gwei') })
        }
      );
      
      console.log(`   ⏳ Issuance transaction submitted: ${issueTx.hash}`);
      const receipt = await issueTx.wait();
      console.log(`   ✅ Issued ${issuance.tokens} tokens successfully!`);
      console.log(`   ⛽ Gas used: ${receipt.gasUsed.toString()}`);
      
      return issueTx.hash;
      
    } catch (error: any) {
      console.error(`   ❌ Error issuing tokens to ${issuance.investorId}: ${error.message}`);
      throw error; // Re-throw to be handled by outer catch
    }
  }
}

// Function to save comprehensive execution output
function saveExecutionOutput(
  outputData: any,
  outputDir: string,
  timestamp: string
) {
  const filename = `issue-tokens+${timestamp}.json`;
  const filepath = path.join(outputDir, 'output', filename);
  
  fs.writeFileSync(filepath, JSON.stringify(outputData, null, 2));
  console.log(`📊 Execution output saved to: ${filepath}`);
  return filepath;
}
