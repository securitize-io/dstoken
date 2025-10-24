# ERC-2612 Permit Test Evidence - Test 13

## Test Information
- **Test Name:** Permits and transfers in single transaction (happy path)
- **Test Number:** 13
- **Network:** sepolia
- **Date:** 2025-10-24
- **Status:** ✅ PASSED

## Deployed Contracts
- **DSToken:** [`0xbA5a5EFDf79F63B5cD413AC88daf7251B29cA5EB`](https://sepolia.etherscan.io/address/0xbA5a5EFDf79F63B5cD413AC88daf7251B29cA5EB)

## Test Execution
- **Transaction Hash:** [`0xdbe42ed93f569550a27e088108d085716cb6e1f62a6728dc8e3112603ac36065`](https://sepolia.etherscan.io/tx/0xdbe42ed93f569550a27e088108d085716cb6e1f62a6728dc8e3112603ac36065)
- **Block Number:** 9,482,369
- **Gas Used:** 440666

## Test Details
- **Owner:** `0x56f7b817804AaCBd7dbd5d04b7aA6fEA227fC8a2`
- **Spender:** `0xEf4491ea9660212cc1b630d309698875C121C7D5`
- **Recipient:** `0xE526804Ff3E551020Ac321949eBC33feaE60E7a8`
- **Value:** 100
- **Nonce Before:** 16
- **Nonce After:** 17


## Additional Notes
transferWithPermit executed in single transaction: permit (nonce: 16 → 17) + transfer (100 tokens from owner to recipient)



## Evidence Files
- **JSON:** `output/test13-permits-and-transfers-in-single-transaction-happy--2025-10-24.json`
- **Markdown:** This file

---
*Generated: 2025-10-24T20:05:15.293Z*
