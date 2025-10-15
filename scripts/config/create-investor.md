# create-investor.json

Creates investors with wallets and attributes for compliance testing.

## Structure
```json
{
  "investors": [
    {
      "id": "investor_prefix_",
      "collisionHash": "unique_hash",
      "country": "US|EU|JP",
      "wallets": [],
      "attributeIds": [1, 2, 4, 8],
      "attributeValues": [1, 1, 1, 1],
      "attributeExpirations": [0, 0, 0, 0]
    }
  ]
}
```

## Usage
```bash
npx hardhat create-investor scripts/config/create-investor.json --generatewallets --generateuniqueids --network sepolia
```

## Parameters
- `file` - Path to investors JSON file (required)
- `--generatewallets` - Generate new wallets for empty wallet arrays
- `--generateuniqueids` - Generate unique IDs for all investors
- `--dryrun` - Show what would be created without executing
- `--keys-dir` - Directory to save output files (default: "./scripts")

## Notes
- Empty `wallets` arrays will be populated when using `--generatewallets`
- `attributeIds` define compliance attributes (1=accredited, 2=kyc, 4=country, 8=security)
- Country must match `countryCompliance` settings in compliance rules
