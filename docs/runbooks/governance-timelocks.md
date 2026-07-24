# BC-2133 — Timelock Governance Runbook & Provider Spec

## Overview

Each DSToken deployment gets **three** OpenZeppelin `TimelockController` instances:

| Timelock | Gates | Enforcement location | Suggested `minDelay` |
|---|---|---|---|
| **Master** | Everything `onlyMaster`: UUPS upgrades, `setDSService`, mint-cap params (BC-2132), governor wiring | Holds `MASTER` role in TrustService **and** `owner()` of every DS contract | 48h |
| **Compliance Rules** | The ~24 rule setters in `ComplianceConfigurationService` | `getDSService(COMPLIANCE_RULES_TIMELOCK)` (id `8199`) on the CCS itself | 24h (product TBD) |
| **Roles** | `setRole` / `setRoles` / `removeRole` in TrustService (including EXCHANGE grants) | `TrustService.getRolesGovernor()` | 24h (product TBD) |

`MASTER` passes both new modifiers (`onlyComplianceAdmin`, `onlyRoleAdmin`) as a **delayed escape hatch**: post-handover MASTER is itself a timelock, so this adds recovery capability without adding an instant path.

**Backward compatibility:** while the enforcement slot for a domain is `address(0)`, behavior is exactly legacy (`onlyTransferAgentOrAbove` for compliance rules; master/issuer/TA + same-role rules for roles). Existing tokens are unaffected until explicitly wired.

**Instant emergency toolbox (unchanged, by design):** `pause()`/`unpause()`, blacklist, locks, `seize` remain direct TRANSFER_AGENT operations. Emergency flow = pause now → fix rules through the timelock → unpause.

## Deployment & handover

```bash
# 1. Deploy the three timelocks
npx hardhat deploy-timelocks --network <net> \
  --proposers 0xFireblocksA,0xFireblocksB \
  --executors permissionless \        # or a comma list of executor addresses
  --master-delay 172800 --compliance-delay 86400 --roles-delay 86400

# 2. Wire (signer must still be MASTER) — no handover yet
npx hardhat setup-governance --network <net> \
  --token <dsToken> \
  --master-timelock <A> --compliance-timelock <B> --roles-timelock <C>

# 3. Verify wiring (also runs automatically at the end of setup-governance)
npx hardhat verify-governance --network <net> --token <dsToken> \
  --master-timelock <A> --compliance-timelock <B> --roles-timelock <C>

# 4. Hand over MASTER + every owner() to the master timelock — IRREVERSIBLE for the signer
npx hardhat setup-governance --network <net> --token <dsToken> \
  --master-timelock <A> --compliance-timelock <B> --roles-timelock <C> --handover true

# 5. Renounce the temporary DEFAULT_ADMIN_ROLE on each timelock (from the admin wallet)
#    timelock.renounceRole(timelock.DEFAULT_ADMIN_ROLE(), adminWallet)
```

Rules that must not be violated:

- **Wire before handover.** All governor/service wiring is `onlyMaster`; after handover it needs the master timelock queue.
- **Cancellers must be direct wallets** (Fireblocks / CR-admin), never another timelock — cancellation has to outrun the delay. OZ v5 automatically grants every proposer `CANCELLER_ROLE`.
- **Renounce admin last**, only after `verify-governance` passes post-handover.

## Operating a timelocked change (manual / Fireblocks)

1. Build the target calldata, e.g. `setCountryCompliance("KP", 1)` on the CCS address.
2. From a proposer wallet: `timelock.schedule(target, 0, data, 0x0, salt, minDelay)` (salt: see convention below).
3. Wait `minDelay`. Anyone (permissionless) or an executor wallet: `timelock.execute(target, 0, data, 0x0, salt)`.
4. To cancel while pending: `timelock.cancel(id)` from a canceller wallet, where `id = hashOperation(target, 0, data, 0x0, salt)`.

Note: compliance is re-validated at **execution** time; state that changed during the delay can make execution revert — reschedule with fresh calldata.

## Monitoring

Index these events on **all three** timelocks (escape-hatch operations for compliance/roles appear in the *Master* queue):

- `CallScheduled(id, index, target, value, data, predecessor, delay)` — new pending operation. Alert the operations channel; cancellers act here.
- `CallExecuted(id, index, target, value, data)` / `Cancelled(id)` — terminal states.
- `TimelockController.getOperationState(id)` → Unset / Waiting / Ready / Done for polling.

## Provider spec (contracts-data-service)

### Detection (per token, no version registry needed)

```
masterTl     = token.getDSService(8198)   // MASTER_TIMELOCK
complianceTl = token.getDSService(8199)   // COMPLIANCE_RULES_TIMELOCK
rolesTl      = token.getDSService(8200)   // ROLES_TIMELOCK
```

Legacy tokens return `address(0)` for unknown ids (no revert), so a single code path works for every token: zero → build the direct transaction exactly as today; non-zero → build two-step `schedule`/`execute` transactions against that timelock, wrapping the original calldata.

### Salt convention (v1)

```
salt = keccak256(abi.encodePacked("securitize.governance.v1", platformRequestId))
predecessor = bytes32(0)   // unless explicit ordering is required
```

This makes the operation id `hashOperation(target, 0, data, 0, salt)` computable **before broadcasting**, so the platform can correlate its request with on-chain state as a pure function — no event-matching heuristics. Retries are idempotent (same request → same id → revert = already scheduled) and identical operations from different requests never collide. The version prefix allows changing the convention later without ambiguity.

### Two sources of truth (drift warning)

Enforcement lives in `CCS.getDSService(8199)` and `TrustService.getRolesGovernor()`; the token registry entries (8198/8199/8200) are discovery mirrors. `verify-governance` asserts they match — run it after any governance rewiring. If the provider wants to be defensive, read the enforcement slots instead of the token mirrors when building transactions.

## Recovery scenarios

- **Compliance/Roles timelock bricked** (lost proposers, bad renounce): schedule the fix through the **Master** timelock — either the gated call directly (escape hatch) or a rewire (`setDSService(8199, newTl)` / `setRolesGovernor(newTl)`), one delay either way.
- **Malicious scheduled operation**: any canceller wallet calls `cancel(id)` immediately — this is why cancellers are direct wallets.
- **Timelock role changes post-renounce**: only via the timelock's own schedule/execute (self-administration), i.e. delayed. Granting a new proposer takes one full delay — intentional.
