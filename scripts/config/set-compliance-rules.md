# Compliance Rules Mapping

## ⚠️ **CRITICAL: Token Decimal Places**

**The DSToken uses 6 decimal places.** When setting token amounts, you MUST multiply by 10^6:

- ❌ **Wrong:** `"3"` (equals 0.000003 tokens)
- ✅ **Correct:** `"3000000"` (equals 3.0 tokens)

### Examples:
- 1 token = `"1000000"`
- 3 tokens = `"3000000"`
- 100 tokens = `"100000000"`

## UInt Values (uintValues array - 16 values)

| Index | Parameter Name | Description | Example Values |
|-------|----------------|-------------|----------------|
| 0 | totalInvestorsLimit | Maximum total investors | `"0"` (unlimited) |
| 1 | minUSTokens | **Min tokens for US investors** | `"3000000"` (3 tokens) |
| 2 | minEUTokens | **Min tokens for EU investors** | `"3000000"` (3 tokens) |
| 3 | usInvestorsLimit | Max US investors | `"0"` (unlimited) |
| 4 | usAccreditedInvestorsLimit | Max US accredited investors | `"0"` (unlimited) |
| 5 | nonAccreditedInvestorsLimit | Max non-accredited investors | `"0"` (unlimited) |
| 6 | maxUSInvestorsPercentage | Max US investor percentage | `"0"` (no limit) |
| 7 | blockFlowbackEndTime | Block flowback end timestamp | `"0"` (disabled) |
| 8 | nonUSLockPeriod | Lock period for non-US | `"0"` (no lock) |
| 9 | minimumTotalInvestors | Min total investors required | `"0"` (no minimum) |
| 10 | minimumHoldingsPerInvestor | **Min tokens per investor** | `"3000000"` |
| 11 | maximumHoldingsPerInvestor | **Max tokens per investor** | `"0"` (unlimited) |
| 12 | euRetailInvestorsLimit | Max EU retail investors | `"0"` (unlimited) |
| 13 | usLockPeriod | US investor lock period | `"0"` (no lock) |
| 14 | jpInvestorsLimit | Max Japan investors | `"0"` (unlimited) |
| 15 | authorizedSecurities | **Max total token supply** | `"1000000000000000000"` |

## Bool Values (boolValues array - 5 values)

| Index | Parameter Name | Description | Typical Value |
|-------|----------------|-------------|---------------|
| 0 | forceFullTransfer | Force full transfer for US investors | `false` |
| 1 | forceAccredited | Only allow accredited investors | `false` |
| 2 | forceAccreditedUS | Only allow accredited US investors | `false` |
| 3 | worldWideForceFullTransfer | Force full transfer globally | `false` |
| 4 | disallowBackDating | Prevent backdated transactions | `false` |

## Country Compliance Mappings

These are set separately from the uintValues/boolValues arrays:

| Country Code | Compliance Value | Region |
|--------------|------------------|---------|
| `"US"` | `1` | United States |
| `"EU"` | `2` | European Union |
| `"JP"` | `8` | Japan |

## 🛠️ Troubleshooting Tips

### Token Amounts Not Enforcing
If minimum token requirements aren't working:
1. ✅ Check decimal places: Use `3000000` not `3` for 3 tokens
2. ✅ Verify country compliance mappings are set correctly
3. ✅ Confirm investors are registered with correct country codes
4. ✅ Ensure wallets are NOT marked as platform wallets

### Testing Compliance
```bash
# Set compliance rules
npx hardhat set-compliance-rules scripts/set-compliance-rules.json --network arbitrum

# Create test investors
npx hardhat create-investor scripts/create-investor.json --generatewallets --network arbitrum

# Test token issuance (should fail with amounts below minimum)
npx hardhat console --network arbitrum
```

### Common Mistakes
- ❌ Using raw token numbers instead of wei values
- ❌ Mixing up country codes (case-sensitive)
- ❌ Not accounting for existing investor balances
- ❌ Forgetting to set country compliance mappings