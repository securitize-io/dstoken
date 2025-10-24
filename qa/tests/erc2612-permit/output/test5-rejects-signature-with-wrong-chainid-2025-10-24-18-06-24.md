# ERC-2612 Permit Test Evidence - Test 5

## Test Information
- **Test Name:** Rejects signature with wrong chainId
- **Test Number:** 5
- **Network:** sepolia
- **Date:** 2025-10-24
- **Status:** ✅ PASSED

## Deployed Contracts
- **DSToken:** [`0xbA5a5EFDf79F63B5cD413AC88daf7251B29cA5EB`](https://sepolia.etherscan.io/address/0xbA5a5EFDf79F63B5cD413AC88daf7251B29cA5EB)

## Test Execution
- **Transaction Hash:** [`0xe2acd8db08ab910aad1f27b27712e31650f60f9510424b455b73ce7befcece34`](https://sepolia.etherscan.io/tx/0xe2acd8db08ab910aad1f27b27712e31650f60f9510424b455b73ce7befcece34)
- **Block Number:** 9,481,776
- **Gas Used:** 44604

## Test Details
- **Owner:** `0x56f7b817804AaCBd7dbd5d04b7aA6fEA227fC8a2`
- **Spender:** `0xEf4491ea9660212cc1b630d309698875C121C7D5`


## Additional Notes
Signature with wrong chainId (999) was rejected on-chain. Transaction reverted as expected.


## Error
```
transaction execution reverted (action="sendTransaction", data=null, reason=null, invocation=null, revert=null, transaction={ "data": "", "from": "0x56f7b817804AaCBd7dbd5d04b7aA6fEA227fC8a2", "to": "0xbA5a5EFDf79F63B5cD413AC88daf7251B29cA5EB" }, receipt={ "_type": "TransactionReceipt", "blobGasPrice": null, "blobGasUsed": null, "blockHash": "0x51dde5f7387aa9a915fda807899d94c872278f122841dd9130aefaa749e49a5e", "blockNumber": 9481776, "contractAddress": null, "cumulativeGasUsed": "18342997", "from": "0x56f7b817804AaCBd7dbd5d04b7aA6fEA227fC8a2", "gasPrice": "1100022", "gasUsed": "44604", "hash": "0xe2acd8db08ab910aad1f27b27712e31650f60f9510424b455b73ce7befcece34", "index": 36, "logs": [  ], "logsBloom": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000", "root": null, "status": 0, "to": "0xbA5a5EFDf79F63B5cD413AC88daf7251B29cA5EB" }, code=CALL_EXCEPTION, version=6.15.0)
```


## Evidence Files
- **JSON:** `output/test5-rejects-signature-with-wrong-chainid-2025-10-24.json`
- **Markdown:** This file

---
*Generated: 2025-10-24T18:06:24.755Z*
