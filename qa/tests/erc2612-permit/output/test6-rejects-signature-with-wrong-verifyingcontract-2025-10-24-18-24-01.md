# ERC-2612 Permit Test Evidence - Test 6

## Test Information
- **Test Name:** Rejects signature with wrong verifyingContract
- **Test Number:** 6
- **Network:** sepolia
- **Date:** 2025-10-24
- **Status:** ✅ PASSED

## Deployed Contracts
- **DSToken:** [`0xbA5a5EFDf79F63B5cD413AC88daf7251B29cA5EB`](https://sepolia.etherscan.io/address/0xbA5a5EFDf79F63B5cD413AC88daf7251B29cA5EB)

## Test Execution
- **Transaction Hash:** [`0x223d5a9800c8f1af16ac1ce59bd2a5f5258e721c1625fad18a6187b9336cc65e`](https://sepolia.etherscan.io/tx/0x223d5a9800c8f1af16ac1ce59bd2a5f5258e721c1625fad18a6187b9336cc65e)
- **Block Number:** 9,481,864
- **Gas Used:** 44592

## Test Details
- **Owner:** `0x56f7b817804AaCBd7dbd5d04b7aA6fEA227fC8a2`
- **Spender:** `0xEf4491ea9660212cc1b630d309698875C121C7D5`


## Additional Notes
Signature with wrong verifyingContract address was rejected on-chain. Transaction reverted as expected.


## Error
```
transaction execution reverted (action="sendTransaction", data=null, reason=null, invocation=null, revert=null, transaction={ "data": "", "from": "0x56f7b817804AaCBd7dbd5d04b7aA6fEA227fC8a2", "to": "0xbA5a5EFDf79F63B5cD413AC88daf7251B29cA5EB" }, receipt={ "_type": "TransactionReceipt", "blobGasPrice": null, "blobGasUsed": null, "blockHash": "0x17114dda09658fc31e20e9592cbcbc0acfa8cc2655c8d99a9b8d6aba0ab76b92", "blockNumber": 9481864, "contractAddress": null, "cumulativeGasUsed": "3768620", "from": "0x56f7b817804AaCBd7dbd5d04b7aA6fEA227fC8a2", "gasPrice": "1052984", "gasUsed": "44592", "hash": "0x223d5a9800c8f1af16ac1ce59bd2a5f5258e721c1625fad18a6187b9336cc65e", "index": 53, "logs": [  ], "logsBloom": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000", "root": null, "status": 0, "to": "0xbA5a5EFDf79F63B5cD413AC88daf7251B29cA5EB" }, code=CALL_EXCEPTION, version=6.15.0)
```


## Evidence Files
- **JSON:** `output/test6-rejects-signature-with-wrong-verifyingcontract-2025-10-24.json`
- **Markdown:** This file

---
*Generated: 2025-10-24T18:24:01.399Z*
