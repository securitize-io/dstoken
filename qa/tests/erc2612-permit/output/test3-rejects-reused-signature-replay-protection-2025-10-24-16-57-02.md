# ERC-2612 Permit Test Evidence - Test 3

## Test Information
- **Test Name:** Rejects reused signature (replay protection)
- **Test Number:** 3
- **Network:** sepolia
- **Date:** 2025-10-24
- **Status:** ✅ PASSED

## Deployed Contracts
- **DSToken:** [`0xbA5a5EFDf79F63B5cD413AC88daf7251B29cA5EB`](https://sepolia.etherscan.io/address/0xbA5a5EFDf79F63B5cD413AC88daf7251B29cA5EB)

## Test Execution
- **Transaction Hash:** [`0x80b4f62fbe6bfa9b7bf89c905212d5d124be5e5287029d8f810bd8bf62bc6acf`](https://sepolia.etherscan.io/tx/0x80b4f62fbe6bfa9b7bf89c905212d5d124be5e5287029d8f810bd8bf62bc6acf)
- **Block Number:** 9,481,428
- **Gas Used:** 48812

## Test Details
- **Owner:** `0x56f7b817804AaCBd7dbd5d04b7aA6fEA227fC8a2`
- **Spender:** `0xEf4491ea9660212cc1b630d309698875C121C7D5`
- **Allowance Set:** 100


## Additional Notes
First permit succeeded (tx: 0x80b4f62fbe6bfa9b7bf89c905212d5d124be5e5287029d8f810bd8bf62bc6acf). Replay attempt reverted on-chain (tx: 0xf620c89a85b415d9ace22e3f93bcc6f1ff63f9dd19e68bbec37f3c209e82142c).


## Error
```
transaction execution reverted (action="sendTransaction", data=null, reason=null, invocation=null, revert=null, transaction={ "data": "", "from": "0x56f7b817804AaCBd7dbd5d04b7aA6fEA227fC8a2", "to": "0xbA5a5EFDf79F63B5cD413AC88daf7251B29cA5EB" }, receipt={ "_type": "TransactionReceipt", "blobGasPrice": null, "blobGasUsed": null, "blockHash": "0x92f6adf04d4ae98b24f744b6915b2610a4f2a176541cc875ca80f7ff4093f922", "blockNumber": 9481429, "contractAddress": null, "cumulativeGasUsed": "10219545", "from": "0x56f7b817804AaCBd7dbd5d04b7aA6fEA227fC8a2", "gasPrice": "1000009", "gasUsed": "44604", "hash": "0xf620c89a85b415d9ace22e3f93bcc6f1ff63f9dd19e68bbec37f3c209e82142c", "index": 105, "logs": [  ], "logsBloom": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000", "root": null, "status": 0, "to": "0xbA5a5EFDf79F63B5cD413AC88daf7251B29cA5EB" }, code=CALL_EXCEPTION, version=6.15.0)
```


## Evidence Files
- **JSON:** `output/test3-rejects-reused-signature-replay-protection-2025-10-24.json`
- **Markdown:** This file

---
*Generated: 2025-10-24T16:57:02.744Z*
