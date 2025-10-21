# Compliance Rules Test Configuration

This directory contains configuration files for focused compliance rule testing.

## Purpose

Each test focuses on a specific set of related compliance rules to ensure:
- ✅ Configuration is applied correctly
- ✅ Validation logic enforces the rules
- ✅ Expected failures are blocked
- ✅ Valid scenarios are allowed

## Test Structure

### Minimum Token Requirements Test

**Files:**
- `min-tokens-config.json` - Compliance configuration with 3-token minimums
- `min-tokens-investors-below.json` - Investors with 2 tokens (should fail)
- `min-tokens-investors-above.json` - Investors with 5 tokens (should pass)

**Rules Tested:**
- **Index 1**: `minUSTokens` = 3,000,000 (3 tokens with 6 decimals)
- **Index 2**: `minEUTokens` = 3,000,000 (3 tokens with 6 decimals)
- **Index 10**: `minimumHoldingsPerInvestor` = 3,000,000 (3 tokens global minimum)

**Test Logic:**
- US investors must meet both `minUSTokens` AND `minimumHoldingsPerInvestor`
- EU investors must meet both `minEUTokens` AND `minimumHoldingsPerInvestor`
- JP investors must meet only `minimumHoldingsPerInvestor` (no regional minimum)

## Usage

### Run the Test
```bash
npx hardhat test qa/tests/compliance-rules/min-tokens.test.ts --network arbitrum
```

### Manual Testing Steps
```bash
# 1. Set compliance rules
npx hardhat set-compliance-rules qa/tests/compliance-rules/min-tokens-config.json --network arbitrum

# 2. Verify rules
npx hardhat get-compliance-rules --network arbitrum

# 3. Test below minimum (should fail)
npx hardhat create-investor qa/tests/compliance-rules/min-tokens-investors-below.json --generatewallets --generateuniqueids --forceonchain --network arbitrum

# 4. Test above minimum (should pass)
npx hardhat create-investor qa/tests/compliance-rules/min-tokens-investors-above.json --generatewallets --generateuniqueids --forceonchain --network arbitrum
```

## Expected Results

### Below Minimum Test (2 tokens):
- ❌ US investor: Fails `minUSTokens` + `minimumHoldingsPerInvestor`
- ❌ EU investor: Fails `minEUTokens` + `minimumHoldingsPerInvestor`
- ❌ JP investor: Fails `minimumHoldingsPerInvestor`

### Above Minimum Test (5 tokens):
- ✅ US investor: Passes both requirements
- ✅ EU investor: Passes both requirements
- ✅ JP investor: Passes global requirement

## Extending This Pattern

To add new compliance rule tests:

1. Create new config files following the naming pattern:
   - `{rule-name}-config.json`
   - `{rule-name}-investors-{scenario}.json`

2. Create corresponding test file:
   - `test/compliance-rules/{rule-name}.test.ts`

3. Follow the same 4-step pattern:
   - Step 1: Set configuration
   - Step 2: Test failure scenarios
   - Step 3: Test success scenarios
   - Step 4: Console-based validation
