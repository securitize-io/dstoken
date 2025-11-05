# ERC-2612 Permit Test Evidence - Test 20

## Test Information
- **Test Name:** Demonstrates front-running attack mitigation on transferWithPermit
- **Test Number:** 20
- **Network:** sepolia
- **Date:** 2025-11-04
- **Status:** ✅ PASSED

## Deployed Contracts
- **DSToken:** [`0x696636c032cCBb81932d9aeB176992CfAf264d32`](https://sepolia.etherscan.io/address/0x696636c032cCBb81932d9aeB176992CfAf264d32)

## Test Execution
- **Transaction Hash:** [`0x068185a4cb09a8bd638f6dfef765157de91b0b3037150a627c5ab7924c78611c`](https://sepolia.etherscan.io/tx/0x068185a4cb09a8bd638f6dfef765157de91b0b3037150a627c5ab7924c78611c)
- **Block Number:** 9,560,485
- **Gas Used:** 376883

## Test Details
- **Owner:** `0x56f7b817804AaCBd7dbd5d04b7aA6fEA227fC8a2`
- **Spender:** `0xEf4491ea9660212cc1b630d309698875C121C7D5`
- **Recipient:** `0xE526804Ff3E551020Ac321949eBC33feaE60E7a8`
- **Attacker:** `0xb5ef8Aa39D4aa2f9c9523C9523E929b93951E45A`
- **Value:** 100
- **Nonce Before:** 4
- **Nonce After:** 5


## Additional Notes
Front-running attack demonstrated: Attacker called permit() first (tx: 0xe96f49f51cf862b2caa7584a668cda5d6e023a693f7f58acb826e66b01bff2a6), consuming nonce 4. With mitigation: transferWithPermit() succeeded (tx: 0x068185a4cb09a8bd638f6dfef765157de91b0b3037150a627c5ab7924c78611c) because permit() failed but allowance was already set by attacker. Transfer completed successfully: 100 tokens transferred from owner to recipient.



## Evidence Files
- **JSON:** `output/test20-demonstrates-front-running-attack-mitigation-on-tr-2025-11-04.json`
- **Markdown:** This file

---
*Generated: 2025-11-04T18:13:02.640Z*
