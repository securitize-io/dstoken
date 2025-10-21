# QA Directory

This directory contains all QA-related tools, scripts, and tests for the DSToken project.

## Directory Structure

```
qa/
├── tasks/              # Hardhat tasks for QA operations
│   ├── config/         # Configuration files for QA tasks
│   └── output/         # Task execution output files with timestamps
├── update-contracts-scripts/  # Scripts to update contract addresses after deployment
│   ├── console-init.js        # Hardhat console initialization script
│   ├── update-all.js          # Orchestrator for all update scripts
│   ├── update-console-init.js # Updates console-init.js with new addresses
│   ├── update-tasks.js        # Updates task files with new addresses
│   └── update-tests.js        # Updates test files with new addresses
└── tests/              # QA-specific test files
    ├── compliance-rules/         # Compliance rule configurations and tests
    │   ├── min-tokens.test.ts    # Minimum token compliance testing
    │   ├── min-tokens-config.json
    │   ├── min-tokens-investors.json
    │   └── README.md
    └── fuzz-tests/              # Fuzz/property-based testing
        ├── fuzz-invariants.test.ts    # 31 comprehensive fuzz tests
        └── FUZZ_TESTING_SUMMARY.md    # Complete fuzz testing documentation
```

## QA Tasks

The `tasks/` directory contains Hardhat tasks for common QA operations:

- **create-investor** - Register new investors with wallets
- **fund-investor-wallets** - Send ETH to investor wallets for gas
- **issue-tokens** - Issue tokens to registered investors
- **set-compliance-rules** - Configure compliance rules
- **get-compliance-rules** - Retrieve and verify current compliance rules
- **transfer-from-investors** - Test token transfers between investors
- **deploy-all-and-update** - Deploy all contracts and update references

### Usage Examples

```bash
# Create investors with generated wallets
npx hardhat create-investor qa/tasks/config/create-investor.json --network sepolia --generatewallets

# Set compliance rules
npx hardhat set-compliance-rules --file qa/tests/compliance-rules/min-tokens-config.json --network sepolia

# Issue tokens to investors
npx hardhat issue-tokens --file qa/tasks/output/create-investor+timestamp.json --tokens 5 --network sepolia

# Get current compliance rules
npx hardhat get-compliance-rules --network sepolia
```

## Scripts

### Configuration Files (`scripts/config/`)

Configuration files for QA tasks. Each task has a corresponding JSON configuration file and markdown documentation.

### Compliance Rules (`tests/compliance-rules/`)

Compliance rule configurations for testing different regulatory scenarios:
- `min-tokens-config.json` - Minimum token requirements test configuration
- `min-tokens-investors.json` - Test investor data

### Update Scripts (`update-contracts-scripts/`)

Scripts to automatically update contract addresses after deployment:
- `update-all.js` - Orchestrator that runs all update scripts
- `update-console-init.js` - Updates the Hardhat console initialization script
- `update-tasks.js` - Updates contract addresses in task files
- `update-tests.js` - Updates contract addresses in test files

```bash
# Run all update scripts
node qa/update-contracts-scripts/update-all.js
```

### Console Initialization (`update-contracts-scripts/console-init.js`)

Hardhat console initialization script with pre-configured contract instances:

```bash
# Start Hardhat console
npx hardhat console --network sepolia

# Load contracts
.load qa/update-contracts-scripts/console-init.js

# Now you can use: dsToken, regService, compService, etc.
```

## Tests

### Compliance Rules Tests (`tests/compliance-rules/min-tokens.test.ts`)

Integration tests for compliance rules, specifically testing minimum token requirements:
- Tests below-minimum issuance (should fail)
- Tests above-minimum issuance (should succeed)
- Validates compliance enforcement across different investor types

```bash
npx hardhat test qa/tests/compliance-rules/min-tokens.test.ts --network sepolia
```

### Fuzz Invariant Tests (`tests/fuzz-tests/fuzz-invariants.test.ts`)

Property-based fuzz testing to verify critical system invariants:
- **31 comprehensive fuzz tests** covering all critical paths
- Total supply conservation
- Non-negative balances
- Transfer conservation
- Lock management
- Investor count consistency
- Compliance rules enforcement
- Access control security
- Rebasing provider scenarios
- Complex lock scenarios
- Multi-wallet investors
- Stateful fuzzing with 100+ operations
- Time-based behavior

```bash
# Run all fuzz tests
npx hardhat test qa/tests/fuzz-tests/fuzz-invariants.test.ts

# Run with coverage
npx hardhat coverage --testfiles "qa/tests/fuzz-tests/fuzz-invariants.test.ts"
```

See `qa/tests/fuzz-tests/FUZZ_TESTING_SUMMARY.md` for complete documentation.

## Workflow

1. **Deploy contracts**: Use `deploy-all-and-update` task
2. **Update references**: Automatically runs update scripts
3. **Create investors**: Use `create-investor` task
4. **Configure compliance**: Use `set-compliance-rules` task
5. **Issue tokens**: Use `issue-tokens` task
6. **Run tests**: Execute QA test files
7. **Test transfers**: Use `transfer-from-investors` task

## Output Files

Task executions save structured output to `qa/tasks/output/` with timestamps:
- `create-investor+{timestamp}.json` - Created investor data with wallets
- `issue-tokens+{timestamp}.json` - Token issuance results
- `set-compliance-rules+{timestamp}.json` - Compliance configuration results
- `deploy-all-and-update.json` - Deployed contract addresses

These output files can be used as input for subsequent tasks, creating a pipeline of operations.

## Notes

- All paths in this documentation are relative to the project root
- Task configuration files are reusable templates
- Output files contain metadata for traceability
- Update scripts automatically synchronize contract addresses across all files

