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

**Instant emergency toolbox (unchanged, by design):** `pause()`/`unpause()`, blacklist, locks, `seize` and `burn` remain direct operations, not routed through any timelock. Emergency flow = pause now → fix rules through the timelock → unpause.

`seize` is `onlyTransferAgentOrAbove`; `burn` is `onlyIssuerOrTransferAgentOrAbove`. Both are deliberately instant so that an emergency response is not itself delayed, and neither consumes the BC-2132 mint allowance. The consequence is that any contract still holding `ROLE_ISSUER` or `ROLE_TRANSFER_AGENT` after a governance handover keeps an un-delayed path to move or destroy holder balances — which is why the handover has to account for *every* role holder, not just the ones reachable by service id. See [`tasks/README.md`](../../tasks/README.md).

## Mint controls (BC-2132)

Configure these before enabling the allowance. `setMintCap` refuses to enable a cap while
`overCapDelay` is zero, because a zero delay lets the over-cap path schedule and execute in one
block — an unconditional bypass for any `ROLE_ISSUER` holder. Order therefore matters:

`mintCapAmount` is **share-denominated** — see
[`docs/bc-2132-mint-throttling-flows.md`](../bc-2132-mint-throttling-flows.md). Shares are a larger
number than tokens by `10 ** (18 - decimals)` at the standard multiplier, so convert before
configuring. `setMultiplier` is `onlyMaster`, so post-handover a rate change is itself a queued
master-timelock operation.

```bash
# enable: delay first, then grace period, then the cap (amount in SHARES)
setOverCapDelay(<seconds>)          # mandatory wait between schedule and execute
setOverCapGracePeriod(<seconds>)    # how long after readyAt an op stays executable; 0 = never expires
setMintCap(<shares>, <windowSeconds>)

# disable: cap first, then the delay
setMintCap(0, 0)
setOverCapDelay(0)
```

Both `overCapDelay` and `overCapGracePeriod` **default to 0** on every token, including after an
upgrade. `setMintCap` refuses to enable a cap while the delay is 0, so that one cannot be forgotten;
the grace period has no such guard, and leaving it at 0 means scheduled mints never expire and stay
executable indefinitely. Set it deliberately.

**Sizing the cap — the worst case is `2 × mintCapAmount`.** The window is *tumbling* and re-anchors
to the mint that trips it, so a full cap consumed just before expiry and another just after land in
different windows seconds apart. The sustained rate is still `mintCapAmount` per `mintCapWindow`;
only the instantaneous burst doubles. If the tolerable burst is `B`, configure `B / 2`. See
[Flow 14b](../bc-2132-mint-throttling-flows.md).

Note also that `setMintCap` **resets the window on every call** — `windowStart = block.timestamp`,
`mintedInWindow = 0`. Changing the cap therefore grants a fresh full allowance immediately, so
lowering it mid-window does not restrict what remains mintable in that window. Treat a cap change as
an allowance grant.

`overCapDelay` only has to exceed detection and human response time. It does **not** need to
outrun the master timelock delay: `cancelOverCapMint` is `onlyIssuerOrTransferAgentOrAbove`, so a
cancel is a direct transaction rather than a queued master operation, and TRANSFER_AGENT provides a
canceller outside the issuer set.

Note that `pause()` does **not** stop a pending over-cap mint. The paused flag is only consulted on
the transfer path, not on issuance, so cancellation is the intervention — not pausing.

## Exceptional (over-cap) mints

**None of these three calls goes through a timelock.** They are direct transactions on the token,
gated by TrustService roles, and they remain direct after the governance handover:

| Call | Authority | Notes |
|---|---|---|
| `scheduleOverCapIssuance(to, amount, salt)` | `onlyIssuerOrAbove` — ISSUER, MASTER | Returns `operationId`; `amount` is in **tokens** |
| `executeOverCapMint(operationId)` | `onlyIssuerOrAbove` — ISSUER, MASTER | Only after `readyAt`, only before `expiresAt` |
| `cancelOverCapMint(operationId)` | `onlyIssuerOrTransferAgentOrAbove` — ISSUER, TRANSFER_AGENT, MASTER | Any time before execution — no readiness or expiry check |

The over-cap delay is the token's own `overCapDelay`, not a timelock `minDelay`, and it is
deliberately independent of the master timelock. Cancellation in particular **must not** be a
master-queue operation: a queued cancel would mature after the shorter `overCapDelay` had already
let the mint execute. TRANSFER_AGENT is included so that a canceller exists outside the issuer set
that scheduled the mint.

### Procedure

1. **Schedule** from an ISSUER wallet: `scheduleOverCapIssuance(to, amount, salt)`.
   `operationId = keccak256(abi.encode(to, amount, salt))` — a pure function of the arguments, so
   the id is computable before broadcasting and re-submitting the same request is idempotent
   (it reverts as already scheduled rather than creating a second operation).
   **The caller must supply a unique `salt` per request.** A salt stays spent once used, including
   after the operation expires, so retrying an expired mint requires a fresh salt.
2. **Announce.** `OverCapMintScheduled` carries `to`, `amount` and `readyAt`; this is the window in
   which a mint that should not proceed gets cancelled. Route it to the operations channel.
3. **Wait** until `readyAt` (`= schedule time + overCapDelay`).
4. **Execute** from an ISSUER wallet: `executeOverCapMint(operationId)`. Compliance
   (`validateIssuance`) is re-checked at execution time against current state, so a recipient whose
   status changed during the delay causes a revert. The whole transaction reverts, so the operation
   stays pending — fix the recipient's status and retry the same `operationId`, no rescheduling
   needed. If `overCapGracePeriod > 0` the operation expires at `readyAt + overCapGracePeriod`;
   after that it can never be executed, and because a spent salt stays spent, a retry needs a
   **fresh salt** (which restarts `overCapDelay`).
5. **Cancel instead**, if the mint should not proceed: `cancelOverCapMint(operationId)` from an
   ISSUER, TRANSFER_AGENT or MASTER wallet. Do not wait for or route this through the master
   timelock.

Executed over-cap mints do **not** consume `mintedInWindow`, so they leave the ordinary allowance
untouched; `OverCapMintExecuted` is the audit trail for them, not `MintCapConsumed`.

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
- `MinDelayChange(oldDuration, newDuration)` — **page, do not just log.** `updateDelay` accepts any
  value including zero, and a zero delay makes `schedule` followed by `execute` in the same block
  permanently available.
- `TimelockController.getOperationState(id)` → Unset / Waiting / Ready / Done for polling.

Index these on the **token** as well. They are not timelock operations, so nothing in the three
queues above will show them — an over-cap mint is invisible to timelock monitoring:

- `OverCapMintScheduled(operationId, to, amount, readyAt)` — **page, do not just log.** This is the
  only notice before an uncapped mint becomes executable, and the cancellation window closes at
  `readyAt`. Decode `to` and `amount` in the alert.
- `OverCapMintExecuted(operationId)` / `OverCapMintCancelled(operationId)` — terminal states.
  An `operationId` that appears in `OverCapMintScheduled` and then in neither, past
  `readyAt + overCapGracePeriod`, expired unused.
- `MintCapConsumed(amount, totalInWindow, windowStart)` — ordinary throttled issuance, share-
  denominated. A `windowStart` that moves without a preceding `MintCapUpdated` is a window rollover;
  two rollovers seconds apart is the boundary case described under Mint controls.
- `MintCapUpdated(mintCapAmount, mintCapWindow)`, `OverCapDelayUpdated(overCapDelay)`,
  `OverCapGracePeriodUpdated(overCapGracePeriod)` — these are `onlyMaster`, so post-handover each
  one should correspond to an executed master-timelock operation. One that appears *without* a
  matching `CallExecuted` in the master queue means a key outside the timelock still holds MASTER —
  escalate immediately.

### Operations targeting a timelock itself

Escalate any `CallScheduled` whose `target` is one of the three timelock addresses, separately from
ordinary traffic, and decode the calldata before alerting.

The delay is not bypassable — `schedule` rejects any delay below the current `minDelay`, and
cancellers keep their authority for the whole window even if the pending operation would revoke
them — so an operation of this kind is cancellable exactly like any other. What makes it worth its
own alert is that **missing this one cancellation is the only unrecoverable case.** Missing a cancel
on a bad upgrade means one bad upgrade; missing a cancel on a batch containing `updateDelay(0)`,
canceller revocations and a proposer self-grant means the timelock no longer delays anything, with
no way back.

After the temporary `DEFAULT_ADMIN_ROLE` is renounced the timelocks are self-administered, so every
role change and every delay change is necessarily self-targeting. Target-is-a-timelock is therefore
a precise, low-noise filter for exactly the operations that cannot be undone — not a heuristic.

Re-run `verify-governance` on a schedule, passing `--expected-master-delay`,
`--expected-compliance-delay` and `--expected-roles-delay`, so a mutated delay is caught even if the
`MinDelayChange` alert is missed.

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
