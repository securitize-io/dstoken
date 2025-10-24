# ERC-2612 Permit QA Test Suite

This directory contains comprehensive QA tests for DSToken's ERC-2612 `permit()` and `transferWithPermit()` functionality.

## 📋 Overview

**18 comprehensive tests** covering:
- **permit() - Core Functionality** (12 tests)
  - Signature validation
  - Nonce management
  - Allowance setting
  - Replay protection
  - Domain binding (chainId, verifyingContract)
  - Edge cases (zero values, allowance overwrites)

- **transferWithPermit() - Single Transaction Flow** (6 tests)
  - Happy path: permit + transfer in one transaction
  - Event order verification (Approval before Transfer)
  - Error handling (expired deadlines, insufficient balance)
  - Replay protection
  - Zero value transfers

---

## 🚀 Quick Start

### Step 1: Prerequisites

1. **Environment Variables**
   Ensure your `.env` file has:
   ```bash
   SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
   DEPLOYER_PRIV_KEY=<your_private_key>
   TEST_WALLET_1_PRIV_KEY=<wallet_1_private_key>
   TEST_WALLET_2_PRIV_KEY=<wallet_2_private_key>  # Required!
   ```

2. **Testnet ETH**
   - Get Sepolia ETH from [Sepolia Faucet](https://sepoliafaucet.com/)
   - Fund all 3 wallet addresses

### Step 2: Deploy Contracts to Sepolia

```bash
npx hardhat deploy-all-and-update \
  --name "QA Token ERC2612" \
  --symbol "QAEX" \
  --decimals 2 \
  --compliance REGULATED \
  --network sepolia \
  2>&1 | tee qa/tasks/output/sepolia-deployment-$(date +%Y%m%d-%H%M%S).log
```

**This takes ~8 minutes** and deploys:
- DSToken (regulated)
- RegistryService
- ComplianceService
- TrustService
- WalletManager
- BulkOperator
- TokenIssuer
- And more...

✅ **Verify deployment:**
```bash
cat qa/tasks/output/deploy-all-and-update.json
```

Should show addresses like:
```json
{
  "dsToken": "0x9fe4673...",
  "registryService": "0x5fbdb2...",
  ...
}
```

---

## 🧪 Running Tests

### Run All 18 Tests

```bash
npx hardhat test qa/tests/erc2612-permit/erc2612-permit.test.ts --network sepolia
```

### Run Individual Tests

Use `--grep` to run specific tests:

#### permit() Core Functionality Tests (1-12):

```bash
# Test 1: Sets allowance via valid signature
npx hardhat test qa/tests/erc2612-permit/erc2612-permit.test.ts --network sepolia --grep "Test 1:"

# Test 2: Expired deadline
npx hardhat test qa/tests/erc2612-permit/erc2612-permit.test.ts --network sepolia --grep "Test 2:"

# Test 3: Replay protection
npx hardhat test qa/tests/erc2612-permit/erc2612-permit.test.ts --network sepolia --grep "Test 3:"

# Test 4: Wrong signer
npx hardhat test qa/tests/erc2612-permit/erc2612-permit.test.ts --network sepolia --grep "Test 4:"

# Test 5: Wrong chainId
npx hardhat test qa/tests/erc2612-permit/erc2612-permit.test.ts --network sepolia --grep "Test 5:"

# Test 6: Wrong verifyingContract
npx hardhat test qa/tests/erc2612-permit/erc2612-permit.test.ts --network sepolia --grep "Test 6:"

# Test 7: DOMAIN_SEPARATOR
npx hardhat test qa/tests/erc2612-permit/erc2612-permit.test.ts --network sepolia --grep "Test 7:"

# Test 8: Zero value permit
npx hardhat test qa/tests/erc2612-permit/erc2612-permit.test.ts --network sepolia --grep "Test 8:"

# Test 9: Overwrites allowance
npx hardhat test qa/tests/erc2612-permit/erc2612-permit.test.ts --network sepolia --grep "Test 9:"

# Test 10: Reduce allowance
npx hardhat test qa/tests/erc2612-permit/erc2612-permit.test.ts --network sepolia --grep "Test 10:"

# Test 11: Nonces increment monotonically
npx hardhat test qa/tests/erc2612-permit/erc2612-permit.test.ts --network sepolia --grep "Test 11:"

# Test 12: Wallet-specific nonces
npx hardhat test qa/tests/erc2612-permit/erc2612-permit.test.ts --network sepolia --grep "Test 12:"
```

#### transferWithPermit() Single Transaction Tests (13-18):

```bash
# Test 13: Happy path
npx hardhat test qa/tests/erc2612-permit/erc2612-permit.test.ts --network sepolia --grep "Test 13:"

# Test 14: Event order verification
npx hardhat test qa/tests/erc2612-permit/erc2612-permit.test.ts --network sepolia --grep "Test 14:"

# Test 15: Expired deadline
npx hardhat test qa/tests/erc2612-permit/erc2612-permit.test.ts --network sepolia --grep "Test 15:"

# Test 16: Insufficient balance
npx hardhat test qa/tests/erc2612-permit/erc2612-permit.test.ts --network sepolia --grep "Test 16:"

# Test 17: Replay attack prevention
npx hardhat test qa/tests/erc2612-permit/erc2612-permit.test.ts --network sepolia --grep "Test 17:"

# Test 18: Zero value transfer
npx hardhat test qa/tests/erc2612-permit/erc2612-permit.test.ts --network sepolia --grep "Test 18:"
```

### Run by Category

```bash
# All permit() tests
npx hardhat test qa/tests/erc2612-permit/erc2612-permit.test.ts --network sepolia --grep "permit\\(\\) - Core Functionality"

# All transferWithPermit() tests
npx hardhat test qa/tests/erc2612-permit/erc2612-permit.test.ts --network sepolia --grep "transferWithPermit\\(\\) - Single Transaction Flow"
```

---

## 📊 Evidence Collection

Each test automatically generates **2 evidence files** in `qa/tests/erc2612-permit/output/`:

### 1. JSON File (Machine-Readable)
**Example:** `test1-sets-allowance-via-valid-signature-2025-10-24-14-30-22.json`

```json
{
  "testName": "Sets allowance via valid signature and emits Approval event",
  "testNumber": 1,
  "network": "sepolia",
  "dsTokenAddress": "0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0",
  "transactionHash": "0x0a31c812e2077344cecca6485811f9b151d24ccfd66943d34c1b4123994bf798",
  "blockNumber": 5234567,
  "gasUsed": "85812",
  "owner": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "spender": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "allowanceSet": 100,
  "nonceBefore": 0,
  "nonceAfter": 1,
  "timestamp": "2025-10-24T14:30:22.123Z",
  "status": "PASSED"
}
```

### 2. Markdown File (Human-Readable)
**Example:** `test1-sets-allowance-via-valid-signature-2025-10-24-14-30-22.md`

```markdown
# ERC-2612 Permit Test Evidence - Test 1

## Test Information
- **Test Name:** Sets allowance via valid signature and emits Approval event
- **Test Number:** 1
- **Network:** sepolia
- **Date:** 2025-10-24
- **Status:** ✅ PASSED

## Deployed Contracts
- **DSToken:** [`0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0`](https://sepolia.etherscan.io/address/0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0)

## Test Execution
- **Transaction Hash:** [`0x0a31c812...`](https://sepolia.etherscan.io/tx/0x0a31c812...)
- **Block Number:** 5,234,567
- **Gas Used:** 85,812

## Test Details
- **Owner:** `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- **Spender:** `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
- **Allowance Set:** 100
- **Nonce Before:** 0
- **Nonce After:** 1
```

---

## 📝 Example: Complete Test Run with Evidence

```bash
# Run Test 1 with evidence collection
npx hardhat test qa/tests/erc2612-permit/erc2612-permit.test.ts \
  --network sepolia \
  --grep "Test 1:"

# Output:
#   DSToken - ERC-2612 Permit QA (Sepolia)
#     ✅ Connected to deployed contracts
#        Network: sepolia
#        DSToken: 0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0
#        RegistryService: 0x5fbdb2315678afecb367f032d93f642f64180aa3
#
#     permit() - Core Functionality
#       ✔ Test 1: Sets allowance via valid signature and emits Approval event (12s)
#
#   📝 Evidence saved:
#      JSON: test1-sets-allowance-via-valid-signature-2025-10-24-14-30-22.json
#      Markdown: test1-sets-allowance-via-valid-signature-2025-10-24-14-30-22.md
#
#   1 passing (15s)
```

---

## 🔍 Verifying Results on Sepolia Etherscan

After a test completes, you can verify the transaction on Etherscan:

1. **Open the generated Markdown file** in `output/`
2. **Click the transaction hash link** (opens Sepolia Etherscan)
3. **Verify**:
   - Transaction status: Success ✅
   - Events emitted (Approval, Transfer, etc.)
   - Gas used
   - Block number

---

## 🗂️ Directory Structure

```
qa/tests/erc2612-permit/
├── README.md                         # This file
├── erc2612-permit.test.ts           # Main test suite (18 tests)
├── test-logger.ts                   # Evidence collection helper
└── output/                          # Generated evidence files
    ├── test1-sets-allowance-...json
    ├── test1-sets-allowance-...md
    ├── test2-reverts-expired-...json
    ├── test2-reverts-expired-...md
    └── ...                          # All test evidence
```

---

## ⏱️ Timing Expectations

### Local Network (hardhat node):
- Each test: **< 1 second**
- All 18 tests: **~15 seconds**

### Sepolia Testnet:
- Each test: **10-15 seconds** (waiting for block confirmations)
- All 18 tests: **3-5 minutes**
- ⚠️ **Testnet can be slow during high congestion**

---

## 🐛 Troubleshooting

### Error: "Deployed contract addresses not found!"
**Solution:** Deploy contracts first:
```bash
npx hardhat deploy-all-and-update --network sepolia
```

### Error: "Timeout of 600000ms exceeded"
**Solution:** Increase timeout in `hardhat.config.ts`:
```typescript
mocha: {
  timeout: 900000, // 15 minutes
}
```

### Error: "insufficient funds for gas"
**Solution:** Fund your wallets with Sepolia ETH:
- [Sepolia Faucet](https://sepoliafaucet.com/)
- [Alchemy Sepolia Faucet](https://www.alchemy.com/faucets/ethereum-sepolia)

### Error: "nonce has already been used"
**Solution:** This is expected if re-running tests. The blockchain state persists. Either:
1. Use fresh wallets (new private keys)
2. Or redeploy all contracts
3. Or run tests in sequence (they account for nonce increments)

---

## 📦 Dependencies

- `hardhat`: Test runner and network provider
- `@nomicfoundation/hardhat-toolbox`: Testing utilities
- `ethers`: Contract interactions and signing
- `chai`: Assertions
- `fs`, `path`: Evidence file generation

---

## 🎯 QA Workflow

1. **Deploy** contracts once to Sepolia
2. **Run** individual tests as needed
3. **Collect** JSON + Markdown evidence
4. **Attach** evidence files to Jira tickets
5. **Link** Etherscan transactions for verification

---

## 📚 Related Documentation

- [EIP-2612 Specification](https://eips.ethereum.org/EIPS/eip-2612)
- [EIP-712 Typed Data](https://eips.ethereum.org/EIPS/eip-712)
- [OpenZeppelin ERC20Permit](https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#ERC20Permit)
- [Main QA README](../../README.md)

---

## 🚨 Important Notes

1. **Testnets are public**: Anyone can see your transactions
2. **Never use mainnet private keys** in `.env`
3. **Tests modify blockchain state**: Each test issues tokens, sets allowances, etc.
4. **Evidence files are timestamped**: Never overwrite existing evidence
5. **Gas costs real testnet ETH**: Budget ~0.05 ETH for full suite

---

## 🤝 Contributing

When adding new tests:
1. Follow the naming convention: `Test X: <description>`
2. Use `testLogger.saveTestResult()` to generate evidence
3. Include all relevant addresses and values
4. Update this README with the new test command

---

## 📞 Support

For questions or issues, contact the blockchain team or refer to:
- Slack: #blockchain-qa
- Jira: BC project
- Wiki: [DSToken QA Documentation](link-to-wiki)

