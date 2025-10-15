# transfer-from-investors.json

Executes `transferFrom` between two investor wallets for compliance testing.

## Structure
```json
[
  {
    "investorId": "from_investor",
    "address": "0x...",
    "privateKey": "0x...",
    "mnemonic": "wallet recovery phrase",
    "fund-wallet": false,
    "tokens": 5
  },
  {
    "investorId": "to_investor",
    "address": "0x...", 
    "privateKey": "0x...",
    "mnemonic": "wallet recovery phrase",
    "fund-wallet": false,
    "tokens": 0
  }
]
```

## Usage
```bash
npx hardhat transfer-from-investors --file scripts/config/transfer-from-investors.json --network sepolia
npx hardhat transfer-from-investors --file scripts/output/my-investors.json --amount 2.5 --network sepolia
```

## Parameters
- `--file` - Path to JSON file with 2 investor objects (required)
- `--tokenaddress` - Token contract address (overrides default)
- `--spender` - Spender address (defaults to first signer)
- `--amount` - Amount to transfer (default: 1)
- `--dryrun` - Show what would be executed without sending
- `--noapproval` - Skip approval (for testing failures)
- `--forceonchain` - Force on-chain execution for QA evidence
- `--gaslimit` - Gas limit for transactions (default: 1000000)
- `--gasprice` - Gas price in gwei
- `--output-dir` - Directory to save output files (default: "./scripts")

## Notes
- First object = FROM investor, Second object = TO investor
- Private key from FROM investor used for automatic approval
- Tests compliance rules and transfer restrictions
- Use `--noapproval` to demonstrate expected failures