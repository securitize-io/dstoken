# Configuration Files

JSON configuration files for QA tasks with corresponding documentation.

## Files & Documentation

| JSON File | Documentation | Task | Purpose |
|-----------|---------------|------|---------|
| `create-investor.json` | [📖](create-investor.md) | `create-investor` | Create investors with wallets & attributes |
| `create-investor.example.json` | [📖](create-investor.example.md) | `create-investor` | Example template for investor creation |
| `issue-tokens.json` | [📖](issue-tokens.md) | `issue-tokens` | Issue tokens with detailed config |
| `token-issuances.json` | [📖](issue-tokens.md) | `issue-tokens` | Issue tokens with simple config |
| `set-compliance-rules.json` | [📖](set-compliance-rules.md) | `set-compliance-rules` | Configure compliance parameters |
| `fund-investor-wallets.json` | [📖](fund-investor-wallets.md) | `fund-investor-wallets` | Fund wallets with ETH for gas |
| `transfer-from-investors.json` | [📖](transfer-from-investors.md) | `transfer-from-investors` | Test transfers between investors |

## Quick Start

1. **Setup Compliance**: `npx hardhat set-compliance-rules scripts/config/set-compliance-rules.json --network sepolia`
2. **Create Investors**: `npx hardhat create-investor scripts/config/create-investor.json --generatewallets --network sepolia`
3. **Fund Wallets**: `npx hardhat fund-investor-wallets --createinvestorfile scripts/output/create-investor+timestamp.json --network sepolia`
4. **Issue Tokens**: `npx hardhat issue-tokens scripts/output/create-investor+timestamp.json --network sepolia`
5. **Test Transfers**: `npx hardhat transfer-from-investors --file scripts/config/transfer-from-investors.json --network sepolia`

## Notes
- All tasks support `--dryrun` for testing
- Output files saved to `scripts/output/` with timestamps
- Use `npx hardhat help <task-name>` for full parameter lists