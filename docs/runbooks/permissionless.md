# Permissionless DSToken — Deployment & Operations Runbook

**Model:** `ComplianceServicePermissionless`
**Registry:** `StubRegistryService`
**Version:** DSToken v4.2.0+

---

## 1. Overview

The **Permissionless** compliance model allows any wallet to hold and transfer tokens with no on-chain investor identity. KYC and investor identity remain off-chain at Securitize.

On-chain restrictions are limited to:
- **Blacklist** — specific wallets blocked by `BlackListManager` (managed by Transfer Agent)
- **Lockup period** — newly-issued tokens locked for a configurable window after issuance (`ComplianceConfigurationService.setNonUSLockPeriod`)

A stub `RegistryService` is deployed in place of the real registry. It returns empty/false for all reads and reverts on any state-changing call, ensuring investor-keyed bookkeeping in `DSToken` / `TokenLibrary` is a no-op.

### When to use this model

Use the Permissionless model when:
- Investor identity and KYC are managed entirely off-chain
- On-chain holdings are not segmented by investor or country
- A simple blacklist + lockup is sufficient compliance

Do **not** use this model if you need: country-based rules, accreditation checks, investor count caps, holdings limits, flow-back rules, or any on-chain investor identity.

---

## 2. Prerequisites

- Node.js 18+ and npm
- Hardhat (`npx hardhat --version`)
- Deployer wallet private key with sufficient gas funds on the target network
- RPC URL for the target network configured in `hardhat.config.ts`

---

## 3. Deployment

Run the following command to deploy the full Permissionless stack:

```bash
npx hardhat deploy-permissionless \
  --name "My Token" \
  --symbol TKN \
  --decimals 2 \
  --network <network>

# Optional: custom rebasing multiplier (default: 1e18 = 1:1)
npx hardhat deploy-permissionless \
  --name "My Token" \
  --symbol TKN \
  --decimals 2 \
  --multiplier 1000000000000000000 \
  --network <network>
```

Alternatively, using `deploy-all` directly (equivalent):

```bash
npx hardhat deploy-all \
  --name "My Token" \
  --symbol TKN \
  --decimals 2 \
  --compliance PERMISSIONLESS \
  --network <network>
```

`deploy-permissionless` is a thin wrapper around `deploy-all --compliance PERMISSIONLESS`.

This task deploys and wires the following contracts in sequence:

| Contract | Notes |
|---|---|
| `DSToken` | The ERC-20 security token |
| `TrustService` | Role management (Master, Issuer, Transfer Agent, Exchange) |
| `StubRegistryService` | No-op registry — replaces `RegistryService` |
| `ComplianceServicePermissionless` | Permissionless compliance (blacklist + lockup) |
| `WalletManager` | Platform and exchange wallet registry |
| `InvestorLockManager` | Wired but not used — kept for ABI compatibility |
| `ComplianceConfigurationService` | Lockup period config |
| `TokenIssuer` | Deployed and wired (service ID 512) — `bulkRegisterAndIssuance` will revert at `StubRegistryService` with `RegistryDisabled()` |
| `WalletRegistrar` | Wallet registration (registry calls are no-ops) |
| `TransactionRelayer` | Meta-transaction relayer |
| `BulkOperator` | Bulk issuance and burn |
| `SecuritizeRebasingProvider` | Token balance multiplier |
| `BlackListManager` | Wallet-level blacklist |

The task outputs all deployed addresses to stdout. **Save these addresses** — you will need them for ongoing operations.

---

## 4. Service wiring

After deployment, the following service IDs are wired on `DSToken`:

| Service ID | Constant | Contract |
|---|---|---|
| 1 | `TRUST_SERVICE` | `TrustService` |
| 2 | `DS_TOKEN` | `DSToken` (self-reference) |
| 4 | `REGISTRY_SERVICE` | `StubRegistryService` |
| 8 | `COMPLIANCE_SERVICE` | `ComplianceServicePermissionless` |
| 32 | `WALLET_MANAGER` | `WalletManager` |
| 64 | `LOCK_MANAGER` | `InvestorLockManager` |
| 256 | `COMPLIANCE_CONFIGURATION_SERVICE` | `ComplianceConfigurationService` |
| 512 | `TOKEN_ISSUER` | `TokenIssuer` |
| 8196 | `REBASING_PROVIDER` | `SecuritizeRebasingProvider` |
| 8197 | `BLACKLIST_MANAGER` | `BlackListManager` |

---

## 5. Post-deployment verification

```bash
npx hardhat verify-all --token <dsTokenAddress> --network <network>
```

This verifies the implementation contracts of all deployed proxies on the block explorer.

---

## 6. Blacklist management

The Transfer Agent role (or above) can add and remove wallets from the blacklist.

**Add a wallet:**
```solidity
blackListManager.addToBlacklist(walletAddress, "reason for action");
```

**Remove a wallet:**
```solidity
blackListManager.removeFromBlacklist(walletAddress);
```

**Query:**
```solidity
blackListManager.isBlacklisted(walletAddress);         // bool
blackListManager.getBlacklistReason(walletAddress);    // string
blackListManager.getBlacklistedWallets();              // address[]
blackListManager.getBlacklistedWalletsCount();         // uint256
```

Blacklisted wallets:
- Cannot receive tokens (transfer or issuance)
- Cannot send tokens
- Cannot have their transferable balance queried as non-zero

---

## 7. Lockup configuration

By default, the lockup period is 0 (no lockup). Configure it after deployment:

```solidity
complianceConfigurationService.setNonUSLockPeriod(seconds);

// Example: 30-day lockup
complianceConfigurationService.setNonUSLockPeriod(30 * 24 * 60 * 60);

// Disable lockup
complianceConfigurationService.setNonUSLockPeriod(0);
```

**Important:** Changing the lockup period takes effect immediately and retroactively. Existing issuance records in `walletIssuances` are re-evaluated against the new period on the next `lockedAt` call. Avoid surprise changes mid-lockup — communicate to affected holders before modifying.

**Lockup mechanics:**
- Newly-issued tokens are locked for `nonUSLockPeriod` seconds from the issuance timestamp
- Tokens received via transfer (not issuance) are never locked
- Platform wallets are exempt from lockup tracking (issuance creates no record)
- Maximum 30 issuance records per wallet — expired records are swept automatically on the next issuance

---

## 8. BulkOperator usage

| Function | Status | Notes |
|---|---|---|
| `bulkIssuance(addresses, values, issuanceTime)` | ✅ Use | Calls `dsToken.issueTokensCustom` directly; lockup tracking is handled by `ComplianceServicePermissionless.recordIssuance` |
| `bulkBurn(addresses, values)` | ✅ Use | Calls `dsToken.burn` directly |
| `bulkRegisterAndIssuance(...)` | ❌ Do not call | Calls `TokenIssuer.issueTokens` → `StubRegistryService.registerInvestor` — reverts with `RegistryDisabled()` |

---

## 9. Off-chain operator constraints

- **Do not** call any state-changing method on `StubRegistryService` (`registerInvestor`, `addWallet`, `setCountry`, etc.) — they will revert with `"Permissionless: registry disabled"`. This is intentional and catches misconfiguration.
- **Do not** call `TokenIssuer.issueTokens` directly or via `bulkRegisterAndIssuance` — it will call `StubRegistryService.registerInvestor`, which reverts with `RegistryDisabled()`. `TokenIssuer` is deployed and wired automatically but must not be used.
- **Do not** call `bulkRegisterAndIssuance` — see above.
- `balanceOfInvestor(string)` always returns 0 — any off-chain tooling relying on it will see 0. Use `balanceOf(address)` instead.

---

## 10. Migration warning

**Switching an existing `Regulated` token to `Permissionless`** by calling `dsToken.setDSService(8, newComplianceAddress)` is a **one-way migration**:

- The old compliance service's storage (investor counts, country flags, etc.) is orphaned and ignored.
- The live `tokenData.investorsBalances` map is inherited but never updated by the new service.
- The new service ignores both. This is a known and accepted trade-off.

If you intend to migrate an existing token, coordinate with the audit team and issuer before proceeding. There is no automated rollback.

---

## 11. Fireblocks workflows

> **Status: Pending**
>
> Confirmation of Fireblocks transaction policies and contract interaction workflows for Permissionless tokens on `ethereum`, `polygon`, and `plume` is pending. Update this section once confirmed.

Expected workflow (to be verified):
- Issuance: `issueTokens` or `bulkIssuance` via Fireblocks raw transaction or contract call policy
- Blacklist management: `addToBlacklist` / `removeFromBlacklist` via Transfer Agent wallet
- Lockup config: `setNonUSLockPeriod` via Transfer Agent or Issuer wallet
- No Fireblocks policy changes required for transfers (user-level, not operator-level)
