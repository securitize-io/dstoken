# ERC-2612 Permit Test Evidence - Test 15

## Test Information
- **Test Name:** Reverts with expired deadline during permit phase
- **Test Number:** 15
- **Network:** sepolia
- **Date:** 2025-10-24
- **Status:** ✅ PASSED

## Deployed Contracts
- **DSToken:** [`0xbA5a5EFDf79F63B5cD413AC88daf7251B29cA5EB`](https://sepolia.etherscan.io/address/0xbA5a5EFDf79F63B5cD413AC88daf7251B29cA5EB)

## Test Execution
- **Transaction Hash:** [`0xa8b4d0428ba03aa46e2fc5ff1cb0c469430a26dc9e57051e5095a6ec2e319bd3`](https://sepolia.etherscan.io/tx/0xa8b4d0428ba03aa46e2fc5ff1cb0c469430a26dc9e57051e5095a6ec2e319bd3)
- **Block Number:** 9,482,451
- **Gas Used:** 29055

## Test Details
- **Owner:** `0x56f7b817804AaCBd7dbd5d04b7aA6fEA227fC8a2`
- **Spender:** `0xEf4491ea9660212cc1b630d309698875C121C7D5`
- **Recipient:** `0xE526804Ff3E551020Ac321949eBC33feaE60E7a8`
- **Value:** 100
- **Nonce Before:** 18
- **Nonce After:** 18


## Additional Notes
Transaction reverted on-chain with expired deadline. Balances and nonce remained unchanged.


## Error
```
transaction execution reverted (action="sendTransaction", data=null, reason=null, invocation=null, revert=null, transaction={ "data": "", "from": "0xEf4491ea9660212cc1b630d309698875C121C7D5", "to": "0xbA5a5EFDf79F63B5cD413AC88daf7251B29cA5EB" }, receipt={ "_type": "TransactionReceipt", "blobGasPrice": null, "blobGasUsed": null, "blockHash": "0x56ad815d9a9489188646c13fbe78b7b4c6d3e2beb4c62075a8c977264c04934c", "blockNumber": 9482451, "contractAddress": null, "cumulativeGasUsed": "8885623", "from": "0xEf4491ea9660212cc1b630d309698875C121C7D5", "gasPrice": "1500012", "gasUsed": "29055", "hash": "0xa8b4d0428ba03aa46e2fc5ff1cb0c469430a26dc9e57051e5095a6ec2e319bd3", "index": 39, "logs": [  ], "logsBloom": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000", "root": null, "status": 0, "to": "0xbA5a5EFDf79F63B5cD413AC88daf7251B29cA5EB" }, code=CALL_EXCEPTION, version=6.15.0)
```


## Evidence Files
- **JSON:** `output/test15-reverts-with-expired-deadline-during-permit-phase-2025-10-24.json`
- **Markdown:** This file

---
*Generated: 2025-10-24T20:21:37.807Z*
