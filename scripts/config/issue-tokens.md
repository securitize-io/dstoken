# issue-tokens.json & token-issuances.json

Issues tokens to investor wallets. Accepts two formats: detailed issuance data or simple investor/amount pairs.

## Format 1: issue-tokens.json (Detailed)
```json
{
  "issuances": [
    {
      "id": "investor_id",
      "collisionHash": "unique_hash",
      "wallets": ["0x..."],
      "pk": "0x...",
      "tokens": 5,
      "fund-wallet": true,
      "description": "Optional description"
    }
  ]
}
```

## Format 2: token-issuances.json (Simple)
```json
{
  "issuances": [
    {
      "investorId": "investor_id",
      "walletAddress": "0x...",
      "tokens": 5,
      "description": "Optional description"
    }
  ]
}
```

## Usage
```bash
npx hardhat issue-tokens scripts/config/issue-tokens.json --network sepolia
npx hardhat issue-tokens scripts/output/create-investor+timestamp.json --network sepolia
```

## Parameters
- `file` - Path to JSON file (required)
- `--tokenaddress` - Token contract address (overrides default)
- `--dryrun` - Show what would be executed without sending transactions
- `--forceonchain` - Force issuance on-chain even if expected to fail
- `--skipfunding` - Skip automatic wallet funding
- `--fundamount` - Amount of ETH to fund wallets (default: 0.001)
- `--gaslimit` - Gas limit for transactions (default: 1000000)
- `--gasprice` - Gas price in gwei
- `--output-dir` - Directory to save output files (default: "./scripts")

## Notes
- Uses `TokenIssuer` contract for proper compliance checking
- Auto-funds wallets when `fund-wallet: true` (Format 1 only)
- Requires investors to be registered and comply with minimum token rules
