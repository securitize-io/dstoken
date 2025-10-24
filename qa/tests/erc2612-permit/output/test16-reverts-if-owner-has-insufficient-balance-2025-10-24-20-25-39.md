# ERC-2612 Permit Test Evidence - Test 16

## Test Information
- **Test Name:** Reverts if owner has insufficient balance
- **Test Number:** 16
- **Network:** sepolia
- **Date:** 2025-10-24
- **Status:** ✅ PASSED

## Deployed Contracts
- **DSToken:** [`0xbA5a5EFDf79F63B5cD413AC88daf7251B29cA5EB`](https://sepolia.etherscan.io/address/0xbA5a5EFDf79F63B5cD413AC88daf7251B29cA5EB)

## Test Execution
- **Transaction Hash:** [`0x4c57e6f7f44081d27065e80338157813af1a7b50b7d3f7869d8dc18f8b792ff2`](https://sepolia.etherscan.io/tx/0x4c57e6f7f44081d27065e80338157813af1a7b50b7d3f7869d8dc18f8b792ff2)
- **Block Number:** 9,482,471
- **Gas Used:** 117800

## Test Details
- **Owner:** `0x56f7b817804AaCBd7dbd5d04b7aA6fEA227fC8a2`
- **Spender:** `0xEf4491ea9660212cc1b630d309698875C121C7D5`
- **Recipient:** `0xE526804Ff3E551020Ac321949eBC33feaE60E7a8`
- **Value:** 150
- **Nonce Before:** 18
- **Nonce After:** 18


## Additional Notes
Transaction reverted on-chain due to insufficient balance (tried to transfer 150, but owner only had 100). Balances, allowance, and nonce remained unchanged.


## Error
```
transaction execution reverted (action="sendTransaction", data=null, reason=null, invocation=null, revert=null, transaction={ "data": "", "from": "0xEf4491ea9660212cc1b630d309698875C121C7D5", "to": "0xbA5a5EFDf79F63B5cD413AC88daf7251B29cA5EB" }, receipt={ "_type": "TransactionReceipt", "blobGasPrice": null, "blobGasUsed": null, "blockHash": "0xe1e4cc1af6a2302877ca6f3dc6974a6de4c9779910a63a4d865e4c1628fcaccb", "blockNumber": 9482471, "contractAddress": null, "cumulativeGasUsed": "3874868", "from": "0xEf4491ea9660212cc1b630d309698875C121C7D5", "gasPrice": "1000000008", "gasUsed": "117800", "hash": "0x4c57e6f7f44081d27065e80338157813af1a7b50b7d3f7869d8dc18f8b792ff2", "index": 8, "logs": [  ], "logsBloom": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000", "root": null, "status": 0, "to": "0xbA5a5EFDf79F63B5cD413AC88daf7251B29cA5EB" }, code=CALL_EXCEPTION, version=6.15.0)
```


## Evidence Files
- **JSON:** `output/test16-reverts-if-owner-has-insufficient-balance-2025-10-24.json`
- **Markdown:** This file

---
*Generated: 2025-10-24T20:25:39.301Z*
