# set-compliance-rules.json

Sets compliance rules for token transfers and issuance using the ComplianceConfigurationService.

## Structure
```json
{
  "complianceRules": {
    "uintValues": [
      "0",         // 0: Reserved
      "3000000",   // 1: MinUSTokens (3 tokens * 1e6)
      "3000000",   // 2: MinEUTokens
      "0",         // 3-9: Reserved
      "3000000",   // 10: MinimumHoldingsPerInvestor
      "0",         // 11-14: Reserved
      "1000000000000000000"  // 15: MaximumTotalSupply
    ],
    "boolValues": [
      false,       // 0-4: Reserved boolean flags
      false,
      false,
      false,
      false
    ]
  },
  "countryCompliance": {
    "US": 1,       // Attribute ID for US compliance
    "EU": 2,       // Attribute ID for EU compliance  
    "JP": 8        // Attribute ID for JP compliance
  }
}
```

## Usage
```bash
npx hardhat set-compliance-rules scripts/config/set-compliance-rules.json --network sepolia
```

## Parameters
- `file` - Path to compliance rules JSON file (required)
- `--dryrun` - Show what would be set without executing
- `--output-dir` - Directory to save output files (default: "./scripts")

## Key Rules
- **MinUSTokens/MinEUTokens**: Minimum tokens required for US/EU investors
- **MinimumHoldingsPerInvestor**: Minimum tokens any investor must hold
- **MaximumTotalSupply**: Total token supply limit
- **CountryCompliance**: Maps countries to attribute IDs for validation

## Notes
- Values are in token smallest units (1 token = 1,000,000 units for 6 decimals)
- Changes affect all future token issuances and transfers
- Use `get-compliance-rules` task to verify current settings