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

## Enhanced QA Task Usage
```bash
npx hardhat create-investor qa/tasks/config/create-investor.json --generatewallets --generateuniqueids --network arbitrum
```

## Parameters
- `file` - Path to investors JSON file (required)
- `--generatewallets` - Generate new wallets for empty wallet arrays
- `--generateuniqueids` - Generate unique IDs for all investors  
- `--dryrun` - Show what would be created without executing
- `--keys-dir` - Directory to save output files (default: "./qa/tasks")

## QA Task Output
The enhanced QA task generates structured output files:
- `create-investor+[timestamp].json` - Contains execution metadata and generated wallets

### Output Structure
```json
{
  "metadata": {
    "executedAt": "2023-10-15T10:30:00Z",
    "network": "arbitrum", 
    "chainId": 42161,
    "signer": "0x123...",
    "flags": { "dryrun": false, "generatewallets": true }
  },
  "summary": {
    "totalProcessed": 3,
    "successCount": 3,
    "failCount": 0,
    "generatedWalletsCount": 3
  },
  "generatedWallets": [
    {
      "investorId": "investor_us_123456",
      "address": "0x789...",
      "privateKey": "0xabc...",
      "mnemonic": "word1 word2 ...",
      "tokens": 0
    }
  ]
}
```

## Token Issuance Integration
After creating investors, use the enhanced `issue-tokens` task:

```bash
# Issue specific token amounts (overrides JSON file values)
npx hardhat issue-tokens qa/output/create-investor+timestamp.json --tokens 2
npx hardhat issue-tokens qa/output/create-investor+timestamp.json --tokens 5
```

## Key Features Removed
- **Wallet funding**: The `fund-wallet` feature has been removed from both create-investor and issue-tokens tasks
- **Simplified workflow**: Focus purely on investor creation and token issuance
- **Manual wallet funding**: Use external tools for wallet funding if needed

## Notes
- Empty `wallets` arrays will be populated when using `--generatewallets`
- `attributeIds` define compliance attributes:
  - 1 = KYC_APPROVED
  - 2 = ACCREDITED  
  - 4 = QUALIFIED
  - 8 = PROFESSIONAL
- Country must match `countryCompliance` settings in compliance rules
- Generated private keys are included in output - keep files secure!
- Use `tokens` field in output file or `--tokens` parameter for token issuance

