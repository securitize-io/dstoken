# @securitize/digital_securities

## 4.2.0

### Minor Changes

- 0a39d22: Add ERC-165 interface detection to DSToken and ERC-8056 (scaled UI amount) mode, the default for new tokens: the token keeps raw ERC-20 balances and exposes `uiMultiplier`, `newUIMultiplier`, `effectiveAt`, `toUIAmount`, `fromUIAmount`, `balanceOfUI` and `totalSupplyUI`, with issuer-scheduled multiplier updates. MASTER can switch a token between SCALED_UI and REBASING (`setScaledUIAmountMode`, `deploy-all --token-mode`) while both multipliers are at 1.0; the rebasing multiplier is frozen at 1e18 in SCALED_UI mode. Upgraded proxies stay in REBASING mode. Over-cap timelock logic moved into TokenLibrary and role modifiers routed through internal functions to keep DSToken under the EIP-170 size limit; a contract-size test now guards it.
- cfe4d12: Add global denylist shared across permissionless tokens, screening transfer and approval spenders; add mint throttling with an over-cap timelock and make unpause master-only

## 4.1.1

### Patch Changes

- 7996206: Prevent fully locked investors from transferring to Platform Wallets and reallocations

## 4.1.0

### Minor Changes

- 1fb6e5d: Bump version to 4.1.0
