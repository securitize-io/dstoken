# ERC-2612 Permit Test Evidence - Test 17

## Test Information
- **Test Name:** Prevents replay attacks on transferWithPermit
- **Test Number:** 17
- **Network:** sepolia
- **Date:** 2025-10-24
- **Status:** ✅ PASSED

## Deployed Contracts
- **DSToken:** [`0xbA5a5EFDf79F63B5cD413AC88daf7251B29cA5EB`](https://sepolia.etherscan.io/address/0xbA5a5EFDf79F63B5cD413AC88daf7251B29cA5EB)

## Test Execution
- **Transaction Hash:** [`0xa92a1f1f2a4b35758dd59fce8f5b66a201e0b2792184bbb674570ca4512a709f`](https://sepolia.etherscan.io/tx/0xa92a1f1f2a4b35758dd59fce8f5b66a201e0b2792184bbb674570ca4512a709f)
- **Block Number:** 9,482,682
- **Gas Used:** 379217

## Test Details
- **Owner:** `0x56f7b817804AaCBd7dbd5d04b7aA6fEA227fC8a2`
- **Spender:** `0xEf4491ea9660212cc1b630d309698875C121C7D5`
- **Recipient:** `0xE526804Ff3E551020Ac321949eBC33feaE60E7a8`
- **Value:** 100
- **Nonce Before:** 18
- **Nonce After:** 19


## Additional Notes
First transfer succeeded (tx: 0xa92a1f1f2a4b35758dd59fce8f5b66a201e0b2792184bbb674570ca4512a709f). Replay attempt reverted on-chain (tx: 0x05105f2f457555f96788076a17d5efd35b33c62eab395c1ae5a2898a5f652594). Nonce incremented from 18 to 19, preventing signature reuse.


## Error
```
transaction execution reverted (action="sendTransaction", data=null, reason=null, invocation=null, revert=null, transaction={ "data": "", "from": "0xEf4491ea9660212cc1b630d309698875C121C7D5", "to": "0xbA5a5EFDf79F63B5cD413AC88daf7251B29cA5EB" }, receipt={ "_type": "TransactionReceipt", "blobGasPrice": null, "blobGasUsed": null, "blockHash": "0x4bd51ae304d841f8ca90ce59b466c663b58606bc37fe040ed4aca53945b3059b", "blockNumber": 9482683, "contractAddress": null, "cumulativeGasUsed": "2904809", "from": "0xEf4491ea9660212cc1b630d309698875C121C7D5", "gasPrice": "1000000008", "gasUsed": "44609", "hash": "0x05105f2f457555f96788076a17d5efd35b33c62eab395c1ae5a2898a5f652594", "index": 45, "logs": [  ], "logsBloom": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000", "root": null, "status": 0, "to": "0xbA5a5EFDf79F63B5cD413AC88daf7251B29cA5EB" }, code=CALL_EXCEPTION, version=6.15.0)
```


## Evidence Files
- **JSON:** `output/test17-prevents-replay-attacks-on-transferwithpermit-2025-10-24.json`
- **Markdown:** This file

---
*Generated: 2025-10-24T21:08:02.074Z*
