---
"@securitize/digital_securities": minor
---

Add ERC-165 interface detection to DSToken and ERC-8056 (scaled UI amount) mode, the default for new tokens: the token keeps raw ERC-20 balances and exposes `uiMultiplier`, `newUIMultiplier`, `effectiveAt`, `toUIAmount`, `fromUIAmount`, `balanceOfUI` and `totalSupplyUI`, with issuer-scheduled multiplier updates. MASTER can switch a token between SCALED_UI and REBASING (`setScaledUIAmountMode`, `deploy-all --token-mode`) while both multipliers are at 1.0; the rebasing multiplier is frozen at 1e18 in SCALED_UI mode. Upgraded proxies stay in REBASING mode. Over-cap timelock logic moved into TokenLibrary and role modifiers routed through internal functions to keep DSToken under the EIP-170 size limit; a contract-size test now guards it.
