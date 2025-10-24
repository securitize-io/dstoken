# ERC-2612 Permit Test Evidence - Test 2

## Test Information
- **Test Name:** Reverts with expired deadline
- **Test Number:** 2
- **Network:** sepolia
- **Date:** 2025-10-24
- **Status:** ✅ PASSED

## Deployed Contracts
- **DSToken:** [`0xbA5a5EFDf79F63B5cD413AC88daf7251B29cA5EB`](https://sepolia.etherscan.io/address/0xbA5a5EFDf79F63B5cD413AC88daf7251B29cA5EB)

## Test Execution
- **Transaction Hash:** [`0x43f85ffe26b3accdef709d94019b0b830ea0e721d57dab957ccdde84ac38127f`](https://sepolia.etherscan.io/tx/0x43f85ffe26b3accdef709d94019b0b830ea0e721d57dab957ccdde84ac38127f)
- **Block Number:** 9,480,962
- **Gas Used:** 29062

## Test Details
- **Owner:** `0x56f7b817804AaCBd7dbd5d04b7aA6fEA227fC8a2`
- **Spender:** `0xEf4491ea9660212cc1b630d309698875C121C7D5`
- **Value:** 100


## Additional Notes
Transaction reverted on-chain with expired deadline. State remained unchanged.


## Error
```
transaction execution reverted (action="sendTransaction", data=null, reason=null, invocation=null, revert=null, transaction={ "data": "", "from": "0x56f7b817804AaCBd7dbd5d04b7aA6fEA227fC8a2", "to": "0xbA5a5EFDf79F63B5cD413AC88daf7251B29cA5EB" }, receipt={ "_type": "TransactionReceipt", "blobGasPrice": null, "blobGasUsed": null, "blockHash": "0x3d2212584f9d17609894fc50ab20dbf0dd86fceca8f1ee4e0ee9ea3807268646", "blockNumber": 9480962, "contractAddress": null, "cumulativeGasUsed": "6571724", "from": "0x56f7b817804AaCBd7dbd5d04b7aA6fEA227fC8a2", "gasPrice": "1000000010", "gasUsed": "29062", "hash": "0x43f85ffe26b3accdef709d94019b0b830ea0e721d57dab957ccdde84ac38127f", "index": 31, "logs": [  ], "logsBloom": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000", "root": null, "status": 0, "to": "0xbA5a5EFDf79F63B5cD413AC88daf7251B29cA5EB" }, code=CALL_EXCEPTION, version=6.15.0)
```


## Evidence Files
- **JSON:** `output/test2-reverts-with-expired-deadline-2025-10-24.json`
- **Markdown:** This file

---
*Generated: 2025-10-24T15:23:37.886Z*
