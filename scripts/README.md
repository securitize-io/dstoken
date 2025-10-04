# Deployment Address Management

This directory contains scripts to manage contract addresses from deployment output.

## Workflow

1. **Paste deployment output**: Copy your deployment output and paste it into `deployment-output.txt`

2. **Update init.js**: Run the parser script to extract addresses and update `init.js`:
   ```bash
   node scripts/update-init.js
   ```

3. **Use in Hardhat console**: Load the updated init.js in your Hardhat console:
   ```bash
   npx hardhat console --network arbitrum
   > .load scripts/init.js
   ```

## Files

- `deployment-output.txt` - Placeholder file where you paste deployment output
- `update-init.js` - Script that parses deployment output and updates init.js
- `init.js` - Hardhat console initialization script with contract instances

## Supported Contracts

The parser automatically detects and maps these contract types:
- DSToken
- Registry Service
- Wallet Manager
- Compliance Service
- Compliance Configuration Service
- Trust Service
- Lock Manager
- Token Issuer
- Wallet Registrar
- Transaction Relayer
- Bulk Operator
- Rebasing Provider
- Mock Token

## Example Usage

1. After running `npx hardhat deploy-all`, copy the entire output
2. Paste it into `scripts/deployment-output.txt`
3. Run `node scripts/update-init.js`
4. Use `npx hardhat console --network arbitrum` and `.load scripts/init.js`

## Available Global Variables

After loading `init.js` in the Hardhat console, you'll have access to:

### Contract Instances
- `dsToken` - DSToken contract
- `regService` - Registry Service contract
- `walletManager` - Wallet Manager contract
- `compService` - Compliance Service contract
- `compConfigService` - Compliance Configuration Service contract
- `trustService` - Trust Service contract
- `lockManager` - Lock Manager contract
- `tokenIssuer` - Token Issuer contract
- `walletRegistrar` - Wallet Registrar contract
- `transactionRelayer` - Transaction Relayer contract
- `bulkOperator` - Bulk Operator contract
- `rebasingProvider` - Rebasing Provider contract
- `mockToken` - Mock Token contract

### Helper Functions
- `me()` - Shows your address and network info
- `t()` - Shows token symbol and name
- `addr` - Quick access to all contract addresses

### Example Console Session
```bash
$ npx hardhat console --network arbitrum
> .load scripts/init.js
✅ Contracts loaded to globals:
- dsToken, trustService, regService, compService, walletManager, lockManager, compConfigService, tokenIssuer, walletRegistrar, transactionRelayer, bulkOperator, rebasingProvider, mockToken
Helpers: me(), t(), addr

> await me()
{ address: '0x...', chainId: 42161, name: 'arbitrum' }

> await t()
{ symbol: 'AJI', name: 'AuditJI' }

> addr.dsToken
'0x98526b90Dd2A609e7AF17Dcc7733dfce35fFcF0a'
```
