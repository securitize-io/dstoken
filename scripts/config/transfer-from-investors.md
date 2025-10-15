# Transfer From Investors Task Guide

## Overview

The `transfer-from-investors` task executes `transferFrom` operations between wallet addresses using a JSON configuration file.

**Important**: This task uses **wallet addresses** (like `0x1234...`), not investor IDs (like `lau__123456`).

## Usage

```bash
npx hardhat transfer-from-investors <path-to-json-file> [options] --network <network>
```

**Important**: Always specify the network where your token contract is deployed:
- `--network arbitrum` for Arbitrum mainnet
- `--network hardhat` for local testing
- `--network <other>` for other networks

## Token Contract Address

The task automatically uses the token contract address from the task file (which is auto-updated when you run the update scripts). You no longer need to specify `tokenAddress` in the JSON file.

**Address Priority (highest to lowest):**
1. `--tokenaddress` command line parameter
2. Task file address (auto-updated from deployment)
3. `tokenAddress` in JSON file (fallback)

## JSON File Structure

### `transfer-from-investors.json` Format

```json
{
  "transfers": [
    {
      "from": "0xD5553b31302ABB184c3Fb12585Fc363ae4549635",
      "fromPrivateKey": "0xce8074fd3e6e4db9fcdfd346cc7fe8fa649ae8aecec6991b08bbe56818884d05",
      "to": "0x68aF0c73F5c9509f546a80A35B7D63BC40DC9613",
      "amount": "1",
      "description": "transfer 1 token should fail"
    }
  ]
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `transfers` | array | **Yes** | Array of transfer objects |
| `transfers[].from` | string | **Yes** | **Wallet address** that owns tokens |
| `transfers[].fromPrivateKey` | string | No | **Private key** for auto-approval |
| `transfers[].to` | string | **Yes** | **Wallet address** that receives tokens |
| `transfers[].amount` | string | **Yes** | Amount in tokens (converted to wei using 6 decimals) |
| `transfers[].description` | string | No | Optional description |

## Available Parameters and Flags

### Required Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `file` | string | Path to transfers JSON file (positional parameter) |

### Optional Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `--tokenaddress` | string | - | Token contract address (overrides task file and JSON file) |
| `--spender` | string | First signer | Spender address (if not specified, uses first signer) |
| `--gaslimit` | string | 500000 | Gas limit for transactions |
| `--gasprice` | string | - | Gas price in gwei |

### Flags
| Flag | Description |
|------|-------------|
| `--dryrun` | Show what would be executed without sending transactions |
| `--autoapprove` | Auto-approve transfers when private keys are provided |
| `--noapproval` | Execute transfers without checking approvals (will fail if insufficient allowance) |
| `--forceonchain` | Force transfer transactions on-chain even if expected to fail (for QA evidence) |

## Examples

### Basic Usage with Auto-Approval (Recommended)
```bash
# Auto-approve and execute transfer
npx hardhat transfer-from-investors scripts/transfer-from-investors.json --autoapprove --network arbitrum
```

### Dry Run Testing
```bash
# Test the full flow without executing transactions
npx hardhat transfer-from-investors scripts/transfer-from-investors.json --autoapprove --dryrun --network arbitrum
```

### Test Without Approvals (QA Testing)
```bash
# Test what happens when approvals fail - useful for QA evidence
npx hardhat transfer-from-investors scripts/transfer-from-investors.json --noapproval --network arbitrum
```

### Force On-Chain Execution (QA Evidence)
```bash
# Force transactions on-chain even if they will fail - captures transaction hashes for evidence
npx hardhat transfer-from-investors scripts/transfer-from-investors.json --forceonchain --network arbitrum
```

### Custom Parameters
```bash
# Use custom token address and spender
npx hardhat transfer-from-investors scripts/transfer-from-investors.json \
  --tokenaddress 0xYourTokenAddress \
  --spender 0xYourSpenderAddress \
  --autoapprove \
  --network arbitrum
```

### Custom Gas Settings
```bash
# Set custom gas limit and price
npx hardhat transfer-from-investors scripts/transfer-from-investors.json \
  --autoapprove \
  --gaslimit 600000 \
  --gasprice 2 \
  --network arbitrum
```

## Key Features

### 🔐 Auto-Approval Feature

**How It Works:**
1. **Add `fromPrivateKey`** to your transfer object in the JSON file
2. **Use `--autoapprove` flag** when running the task
3. **Task automatically approves** the required allowance before executing transferFrom

**Benefits:**
- **No manual approval steps needed**
- **Fully automated transfer flow**
- **Secure private key handling (keys are used locally)**

**Example with Auto-Approval:**
```json
{
  "transfers": [
    {
      "from": "0xD5553b31302ABB184c3Fb12585Fc363ae4549635",
      "fromPrivateKey": "0xce8074fd3e6e4db9fcdfd346cc7fe8fa649ae8aecec6991b08bbe56818884d05",
      "to": "0x68aF0c73F5c9509f546a80A35B7D63BC40DC9613",
      "amount": "1",
      "description": "Automated transfer with approval"
    }
  ]
}
```

### 🧪 QA Testing Features

**No Approval Testing (`--noapproval`):**
- Skips approval checks entirely
- Useful for testing what happens when allowances are insufficient
- Transfers will fail but provide evidence of the failure behavior

**Force On-Chain Execution (`--forceonchain`):**
- Forces transactions to be submitted on-chain even if they're expected to fail
- Captures transaction hashes for QA evidence
- Useful for compliance testing and failure analysis

### 🔄 Transfer Execution Logic

The task follows this workflow for each transfer:

1. **Validation**: Checks that wallet addresses are valid
2. **Balance Check**: Verifies the sender has sufficient tokens
3. **Allowance Check**: Checks if spender has sufficient allowance
4. **Auto-Approval** (if enabled): Automatically approves tokens using private key
5. **Transfer Execution**: Executes the `transferFrom` operation
6. **Confirmation**: Waits for transaction confirmation and reports results

## Important Notes

### ⚠️ Wallet Addresses vs Investor IDs

- **✅ Correct**: `0xD5553b31302ABB184c3Fb12585Fc363ae4549635` (wallet address)
- **❌ Wrong**: `lau__123456` (investor ID)

Get wallet addresses from the private keys file generated by the `create-investor` task.

### ⚠️ Token Decimals

The task uses **6 decimals** for token amounts. For example:
- `"amount": "1"` = 1 token = 1,000,000 wei (1 × 10^6)
- `"amount": "0.5"` = 0.5 tokens = 500,000 wei

### ⚠️ Gas Payment

The **spender** (the account executing transferFrom) pays for all gas costs, not the token owner.

### ⚠️ Private Key Security

- **✅ Keep private keys secure and never commit them to version control**
- **✅ Use test networks for development**  
- **✅ Consider using environment variables for sensitive data**

### ⚠️ Approval Logic Summary

| Scenario | Behavior |
|----------|----------|
| `--autoapprove` + `fromPrivateKey` | ✅ Automatic approval then transfer |
| No flags + sufficient allowance | ✅ Direct transfer (manual approval assumed) |
| `--noapproval` | ⚠️ Skip approval checks (will fail if insufficient allowance) |
| `--forceonchain` | 🔗 Force on-chain submission for QA evidence |

## Troubleshooting

### Common Issues

**"Not enough allowance" error:**
- Use `--autoapprove` flag with `fromPrivateKey` in JSON
- Or manually approve tokens before running the task

**"Insufficient balance" error:**
- Check that the `from` wallet has enough tokens
- Verify the token decimals (task uses 6 decimals)

**Gas estimation failed:**
- Use `--forceonchain` to bypass gas estimation
- Check compliance rules that might be blocking the transfer