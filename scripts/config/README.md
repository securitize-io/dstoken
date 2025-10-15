# QA Task Configuration Files

This folder contains all configuration files (JSON and MD) used by the QA tasks in the `tasks/qa/` folder.

## 📁 Folder Structure

```
scripts/config/
├── README.md                          # This documentation file
├── create-investor.json               # Configuration for create-investor task
├── create-investor.example.json       # Example configuration with all options
├── fund-investor-wallets.json         # Configuration for fund-investor-wallets task
├── transfer-from-investors.json       # Configuration for transfer-from-investors task
├── transfer-from-investors.md          # Documentation for transfer-from-investors task
├── set-compliance-rules.json          # Configuration for set-compliance-rules task
└── set-compliance-rules.md             # Documentation for set-compliance-rules task
```

## 🎯 Configuration Files by Task

### `create-investor` Task
- **Config**: `create-investor.json` - Main configuration
- **Example**: `create-investor.example.json` - Full example with all options

### `transfer-from-investors` Task  
- **Config**: `transfer-from-investors.json` - Transfer configurations
- **Docs**: `transfer-from-investors.md` - Detailed documentation

### `fund-investor-wallets` Task
- **Config**: `fund-investor-wallets.json` - Wallet funding configurations

### `set-compliance-rules` Task
- **Config**: `set-compliance-rules.json` - Compliance rules configuration
- **Docs**: `set-compliance-rules.md` - Detailed documentation

### `get-compliance-rules` Task
- **Note**: No config file needed - this task reads current on-chain state

## 📊 Output Files

All tasks save their execution results to: `scripts/output/`

Files are named with the pattern: `<taskName>+<timestamp>.json`

## 🔧 Usage

When running QA tasks, reference config files with the new paths:

```bash
# Examples using new config paths
npx hardhat create-investor scripts/config/create-investor.json
npx hardhat transfer-from-investors scripts/config/transfer-from-investors.json
npx hardhat fund-investor-wallets --file scripts/config/fund-investor-wallets.json
npx hardhat set-compliance-rules scripts/config/set-compliance-rules.json
```

## 📂 Related Folders

- `scripts/output/` - Execution results and output files
- `scripts/compliance-rules/` - Specific compliance test configurations
- `tasks/qa/` - The actual QA task implementations
