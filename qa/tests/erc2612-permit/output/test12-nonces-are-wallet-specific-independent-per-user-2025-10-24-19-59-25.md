# ERC-2612 Permit Test Evidence - Test 12

## Test Information
- **Test Name:** Nonces are wallet-specific (independent per user)
- **Test Number:** 12
- **Network:** sepolia
- **Date:** 2025-10-24
- **Status:** ✅ PASSED

## Deployed Contracts
- **DSToken:** [`0xbA5a5EFDf79F63B5cD413AC88daf7251B29cA5EB`](https://sepolia.etherscan.io/address/0xbA5a5EFDf79F63B5cD413AC88daf7251B29cA5EB)

## Test Execution
- **Transaction Hash:** [`0x0d4b09e5ade18adc0d86fc3dd506ba25428144e39998e205621b49cf82fa7c37`](https://sepolia.etherscan.io/tx/0x0d4b09e5ade18adc0d86fc3dd506ba25428144e39998e205621b49cf82fa7c37)
- **Block Number:** 9,482,338
- **Gas Used:** 51600

## Test Details
- **Owner:** `0x56f7b817804AaCBd7dbd5d04b7aA6fEA227fC8a2`
- **Spender:** `0xE526804Ff3E551020Ac321949eBC33feaE60E7a8`
- **Recipient:** `0xEf4491ea9660212cc1b630d309698875C121C7D5`
- **Nonce Before:** 13
- **Nonce After:** 16


## Additional Notes
User1 nonce: 13 → 16 (+3 permits). User2 nonce unchanged: 0 (proves nonces are wallet-specific)



## Evidence Files
- **JSON:** `output/test12-nonces-are-wallet-specific-independent-per-user-2025-10-24.json`
- **Markdown:** This file

---
*Generated: 2025-10-24T19:59:25.114Z*
