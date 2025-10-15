# fund-investor-wallets.json

Sends ETH to investor wallets to cover gas fees for transactions.

## Structure
```json
{
  "defaultAmount": "0.001",
  "network": "sepolia",
  "wallets": [
    {
      "address": "0x...",
      "description": "Wallet description"
    }
  ]
}
```

## Usage
```bash
npx hardhat fund-investor-wallets --network sepolia
npx hardhat fund-investor-wallets --createinvestorfile scripts/output/create-investor+timestamp.json --network sepolia
npx hardhat fund-investor-wallets --addresses 0x123...,0x456... --amount 0.002 --network sepolia
```

## Parameters
- `--file` - Path to wallets JSON file (default: scripts/config/fund-investor-wallets.json)
- `--createinvestorfile` - Extract addresses from create-investor output
- `--transfersfile` - Extract addresses from transfers file
- `--addresses` - Comma-separated wallet addresses
- `--amount` - Amount of ETH per wallet (default: 0.001)
- `--minbalance` - Skip if wallet has more ETH (default: 0.0005)
- `--force` - Fund even if balance is sufficient
- `--dryrun` - Show what would be executed without sending
- `--gaslimit` - Gas limit for funding (default: 21000)
- `--gasprice` - Gas price in gwei
- `--output-dir` - Directory to save output files (default: "./scripts")

## Notes
- Multiple input sources: JSON file, create-investor output, transfers file, or direct addresses
- Automatically skips wallets with sufficient balance unless `--force` is used
- Essential before token operations that require gas fees
