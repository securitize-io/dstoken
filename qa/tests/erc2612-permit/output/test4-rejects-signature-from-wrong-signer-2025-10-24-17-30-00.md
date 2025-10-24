# ERC-2612 Permit Test Evidence - Test 4

## Test Information
- **Test Name:** Rejects signature from wrong signer
- **Test Number:** 4
- **Network:** sepolia
- **Date:** 2025-10-24
- **Status:** ✅ PASSED

## Deployed Contracts
- **DSToken:** [`0xbA5a5EFDf79F63B5cD413AC88daf7251B29cA5EB`](https://sepolia.etherscan.io/address/0xbA5a5EFDf79F63B5cD413AC88daf7251B29cA5EB)

## Test Execution
- **Transaction Hash:** [`0xb1dec1353b60536c39a6f5542cac58326671f7b9cb532f9f1f2658f03e516e74`](https://sepolia.etherscan.io/tx/0xb1dec1353b60536c39a6f5542cac58326671f7b9cb532f9f1f2658f03e516e74)
- **Block Number:** 9,481,594
- **Gas Used:** 44604

## Test Details
- **Owner:** `0x56f7b817804AaCBd7dbd5d04b7aA6fEA227fC8a2`
- **Spender:** `0xEf4491ea9660212cc1b630d309698875C121C7D5`
- **Attacker:** `0xE526804Ff3E551020Ac321949eBC33feaE60E7a8`


## Additional Notes
Signature from attacker was rejected on-chain. Transaction reverted as expected.


## Error
```
transaction execution reverted (action="sendTransaction", data=null, reason=null, invocation=null, revert=null, transaction={ "data": "", "from": "0x56f7b817804AaCBd7dbd5d04b7aA6fEA227fC8a2", "to": "0xbA5a5EFDf79F63B5cD413AC88daf7251B29cA5EB" }, receipt={ "_type": "TransactionReceipt", "blobGasPrice": null, "blobGasUsed": null, "blockHash": "0xb92eb6077aa10fcaefa3bd908007a7961bbe94d74c3cfe4d8acf3d46aa47d122", "blockNumber": 9481594, "contractAddress": null, "cumulativeGasUsed": "4261038", "from": "0x56f7b817804AaCBd7dbd5d04b7aA6fEA227fC8a2", "gasPrice": "1200009", "gasUsed": "44604", "hash": "0xb1dec1353b60536c39a6f5542cac58326671f7b9cb532f9f1f2658f03e516e74", "index": 40, "logs": [  ], "logsBloom": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000", "root": null, "status": 0, "to": "0xbA5a5EFDf79F63B5cD413AC88daf7251B29cA5EB" }, code=CALL_EXCEPTION, version=6.15.0)
```


## Evidence Files
- **JSON:** `output/test4-rejects-signature-from-wrong-signer-2025-10-24.json`
- **Markdown:** This file

---
*Generated: 2025-10-24T17:30:00.963Z*
