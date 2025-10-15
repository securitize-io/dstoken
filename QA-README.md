# QA Testing Guide - DSToken

This guide provides the essential commands for deploying and testing DSToken contracts on any network.

## Prerequisites

- Node.js and npm installed
- Hardhat configured for your target network
- Private keys/wallet configuration set up
- Network configuration in `hardhat.config.ts`

## Pre-Deployment Setup

⚠️ **IMPORTANT**: Always ensure you have the latest dependencies and compiled contracts before deployment:

```bash
# Install/update dependencies
npm install

# Compile contracts to ensure latest version
npm run compile
# or alternatively
npx hardhat compile
```

This ensures you're deploying the most recent version of DSToken and all related contracts with any recent changes or fixes.

## 1. Initial Deployment

Deploy all contracts with your token parameters:

```bash
npx hardhat deploy-all --name <TOKEN_NAME> --symbol <TOKEN_SYMBOL> --decimals <DECIMALS> --network <NETWORK_NAME>
```

Example:
```bash
npx hardhat deploy-all --name limitsB --symbol lib --decimals 6 --network arbitrum
```

After deployment, update all scripts to use the new contract addresses:

```bash
node scripts/update/update-all.js
```

## 2. Configure Compliance Rules

Set the compliance parameters for your token:

```bash
npx hardhat set-compliance-rules scripts/set-compliance-rules.json --network <NETWORK_NAME>
```

Verify the rules were set correctly:

```bash
npx hardhat get-compliance-rules --network <NETWORK_NAME>
```

## 3. Create Test Investors

Create investors with auto-generated wallets and unique IDs:

```bash
# Standard creation
npx hardhat create-investor scripts/create-investor.json --generatewallets --generateuniqueids --network <NETWORK_NAME>

# Force on-chain (for QA evidence of expected failures)
npx hardhat create-investor scripts/create-investor.json --generatewallets --generateuniqueids --forceonchain --network <NETWORK_NAME>
```

## 4. Interactive Console Testing

Launch Hardhat console with pre-loaded contracts:

```bash
npx hardhat console --network <NETWORK_NAME>
```

Load the initialization script to get all contracts as global variables:

```javascript
.load scripts/console-init.js
```

### Available Global Contracts
- `dsToken` - Main DSToken contract
- `compService` - Compliance service
- `regService` - Registry service
- `walletManager` - Wallet manager
- `lockManager` - Lock manager
- `tokenIssuer` - Token issuer
- `trustService` - Trust service
- `bulkOperator` - Bulk operations

### Useful Console Commands

```javascript
// Quick token info
await t()

// Check current network and signer
await me()

// Get compliance counters
await compService.getTotalInvestorsCount()
await compService.getUSInvestorsCount()
await compService.getJPInvestorsCount()
await compService.getUSAccreditedInvestorsCount()
await compService.getAccreditedInvestorsCount()
await compService.getEURetailInvestorsCount('ES')

// Check investor details
await regService.getInvestorDetailsFull("lau_143957")
await regService.getInvestor("0x702aB830fBd2E833fB588dF38c359f225aAe495f")

// Check balances and issue tokens
await dsToken.balanceOf("0x702aB830fBd2E833fB588dF38c359f225aAe495f")
await dsToken.issueTokens("0x8Bf0F56ae821b70e46731864bA49884823e0b886", "10000000")
```

## 5. Token Transfer Testing

### Fund Test Wallets

Before testing transfers, fund the source wallets with native currency for gas:

```bash
npx hardhat fund-investor-wallets --file scripts/fund-investor-wallets.json --network <NETWORK_NAME>
```

### Execute Transfers

Test token transfers with automatic approvals:

```bash
npx hardhat transfer-from-investors scripts/transfer-from-investors.json --autoapprove --network <NETWORK_NAME>
```

## Configuration Files

### scripts/set-compliance-rules.json
Contains compliance parameters (limits, minimums, etc.)

### scripts/create-investor.json
Template for creating test investors with attributes

### scripts/fund-investor-wallets.json
List of wallets to fund with native currency for gas

### scripts/transfer-from-investors.json
Transfer scenarios for testing compliance rules

## Network Configuration

Ensure your `hardhat.config.ts` includes the target network configuration:

```typescript
networks: {
  arbitrum: {
    url: "https://arb1.arbitrum.io/rpc",
    accounts: [process.env.PRIVATE_KEY]
  },
  sepolia: {
    url: "https://sepolia.infura.io/v3/" + process.env.INFURA_KEY,
    accounts: [process.env.PRIVATE_KEY]
  },
  // Add other networks as needed
}
```

## Common Networks

| Network | Command Example |
|---------|-----------------|
| Arbitrum One | `--network arbitrum` |
| Ethereum Mainnet | `--network mainnet` |
| Sepolia Testnet | `--network sepolia` |
| Polygon | `--network polygon` |
| Local Hardhat | `--network localhost` |

## Important Notes

⚠️ **Token Decimals**: DSToken uses configurable decimal places. For amounts:
- With 6 decimals: 1 token = `"1000000"`, 3 tokens = `"3000000"`
- With 18 decimals: 1 token = `"1000000000000000000"`

📋 **Compliance Testing**: Use `--forceonchain` flag when creating investors to capture transaction hashes for compliance failures (useful for QA evidence).

🔄 **Script Updates**: Always run `node scripts/update/update-all.js` after redeployment to update contract addresses in all scripts.

🔧 **Development Workflow**: Always run `npm install` and `npm run compile` before deployment to ensure you're using the latest contract versions.

💰 **Gas Considerations**: Different networks have different gas costs and native currencies:
- Ethereum: ETH for gas
- Arbitrum: ETH for gas (lower costs)
- Polygon: MATIC for gas
- Consider network-specific gas price settings

## Quick Reference

| Task | Command Template |
|------|------------------|
| **Install dependencies** | `npm install` |
| **Compile contracts** | `npm run compile` or `npx hardhat compile` |
| Deploy all contracts | `npx hardhat deploy-all --name <NAME> --symbol <SYMBOL> --decimals <DECIMALS> --network <NETWORK>` |
| Update scripts | `node scripts/update/update-all.js` |
| Set compliance | `npx hardhat set-compliance-rules scripts/set-compliance-rules.json --network <NETWORK>` |
| Get compliance | `npx hardhat get-compliance-rules --network <NETWORK>` |
| Create investors | `npx hardhat create-investor scripts/create-investor.json --generatewallets --generateuniqueids --network <NETWORK>` |
| Fund wallets | `npx hardhat fund-investor-wallets --file scripts/fund-investor-wallets.json --network <NETWORK>` |
| Test transfers | `npx hardhat transfer-from-investors scripts/transfer-from-investors.json --autoapprove --network <NETWORK>` |
| Interactive console | `npx hardhat console --network <NETWORK>` then `.load scripts/console-init.js` |

## Network-Specific Considerations

### Testnets vs Mainnet
- **Testnets**: Use for development and testing (Sepolia, Goerli, Arbitrum Sepolia)
- **Mainnet**: Production deployments only after thorough testing

### Gas Optimization
- **Layer 2 networks** (Arbitrum, Polygon): Lower gas costs, faster transactions
- **Ethereum mainnet**: Higher gas costs, consider gas price optimization

### Faucets for Testnets
- **Sepolia**: Use Sepolia faucets for test ETH
- **Arbitrum Sepolia**: Bridge test ETH from Sepolia
- **Polygon Mumbai**: Use Polygon faucets for test MATIC
