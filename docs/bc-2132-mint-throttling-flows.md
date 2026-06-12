# BC-2132 — Mint Throttling & Over-Cap Timelock: All Flows

## Overview

Two mechanisms work together:
- **Tumbling-window cap**: `mintCapAmount` tokens per `mintCapWindow` seconds. Resets automatically when a new window starts. `0` = disabled.
- **Over-cap timelock**: For large exceptional mints. Schedule → wait `overCapDelay` → execute. Cancellable. Expires after `overCapGracePeriod`.

All issuance (On-Ramp, Bridge/Wormhole, any future ISSUER) routes through `issueTokensWithMultipleLocks`, the single hook point.

---

## State Variables (appended to TokenDataStore, consuming __gap[35] → __gap[28])

```solidity
uint256 public mintCapAmount;       // 0 = cap disabled
uint256 public mintCapWindow;       // seconds per window
uint256 public windowStart;         // timestamp when current window started
uint256 public mintedInWindow;      // tokens minted so far in current window
uint256 public overCapDelay;        // seconds between schedule and execute
uint256 public overCapGracePeriod;  // seconds after readyAt before op expires
mapping(bytes32 => PendingMint) public pendingMints;

struct PendingMint {
    address to;
    uint256 amount;
    uint256 readyAt;
    uint256 expiresAt;
    bool executed;
    bool cancelled;
}
```

---

## Flow 1 — Normal mint, cap disabled (`mintCapAmount = 0`)

```
ISSUER → issueTokens(to, 50_000_000)
  → issueTokensCustom(to, 50_000_000, now, 0, "", 0)
    → issueTokensWithMultipleLocks(to, 50_000_000, now, [], "", [])
      → _checkThrottle(50_000_000)
           mintCapAmount == 0 → return immediately (no-op)
      → TokenLibrary.issueTokensCustom(...)   // minting happens
      → emit Transfer(0x0, to, 50_000_000)
```

**Result:** Mint succeeds. No window tracking. Backward-compatible with all existing tokens that never configure a cap.

---

## Flow 2 — Normal mint within cap

```
State: mintCapAmount=20M, mintCapWindow=8h, windowStart=T0, mintedInWindow=0

ISSUER → issueTokens(to, 10_000_000)
  → _checkThrottle(10_000_000)
       block.timestamp < windowStart + mintCapWindow  → no reset
       remaining = 20M - 0 = 20M
       10M <= 20M                                     → OK
       mintedInWindow = 10M
       emit MintCapConsumed(10M, 10M, T0)
  → TokenLibrary.issueTokensCustom(...)
  → emit Transfer(0x0, to, 10_000_000)
```

**Result:** Mint succeeds. Window counter accumulates.

---

## Flow 3 — Two mints in same window accumulate

```
State: mintCapAmount=20M, mintedInWindow=10M (from Flow 2)

ISSUER → issueTokens(to2, 10_000_000)
  → _checkThrottle(10_000_000)
       remaining = 20M - 10M = 10M
       10M <= 10M  → OK (exactly at cap)
       mintedInWindow = 20M
       emit MintCapConsumed(10M, 20M, T0)
  → mint succeeds

ISSUER → issueTokens(to3, 1)
  → _checkThrottle(1)
       remaining = 20M - 20M = 0
       1 > 0  → revert MintCapExceeded(1, 0)
```

**Result:** Third mint reverts. Cap is exhausted for this window.

---

## Flow 4 — Mint exceeds cap, single large issuance

```
State: mintCapAmount=20M, mintedInWindow=0

ISSUER → issueTokens(to, 25_000_000)
  → _checkThrottle(25_000_000)
       remaining = 20M - 0 = 20M
       25M > 20M  → revert MintCapExceeded(25_000_000, 20_000_000)
```

**Result:** Reverts immediately. No partial mints. Caller must either:
- Split into multiple mints within the window, OR
- Use the over-cap timelock path (Flow 7)

---

## Flow 5 — Window rolls over (tumbling window reset)

```
State: mintCapAmount=20M, mintCapWindow=8h
       windowStart=T0, mintedInWindow=18M
       Now: T0 + 8h + 1s (new window)

ISSUER → issueTokens(to, 20_000_000)
  → _checkThrottle(20_000_000)
       block.timestamp >= windowStart + mintCapWindow  → RESET
       windowStart = block.timestamp (= T0+8h+1s)
       mintedInWindow = 0
       remaining = 20M - 0 = 20M
       20M <= 20M  → OK
       mintedInWindow = 20M
       emit MintCapConsumed(20M, 20M, new windowStart)
  → mint succeeds
```

**Result:** Window resets automatically. Full cap available again. Previous window's `mintedInWindow=18M` is discarded.

---

## Flow 6 — `issueTokensCustom` with lock (cap applies normally)

```
ISSUER → issueTokensCustom(to, 5M, issuanceTime, 2M, "Vesting", releaseTime)
  → issueTokensWithMultipleLocks(to, 5M, issuanceTime, [2M], "Vesting", [releaseTime])
    → _checkThrottle(5M)        // same cap check; locks don't change throttle behavior
    → TokenLibrary.issueTokensCustom(...) // mints + creates lock via InvestorLockManager
```

**Result:** Cap is checked on total `_value` (5M), not just unlocked portion. Locks are operational context, not relevant to the throttle.

---

## Flow 7 — Over-cap mint: happy path (schedule → execute)

```
State: mintCapAmount=20M. Need to mint 500M (Grove subscription day).

Step 1: Schedule
ISSUER → scheduleOverCapIssuance(to, 500_000_000, salt)
  operationId = keccak256(abi.encode(to, 500M, salt, block.timestamp))
  check: pendingMints[operationId].readyAt == 0  → not a duplicate
  pendingMints[operationId] = PendingMint {
      to: to,
      amount: 500_000_000,
      readyAt:   now + overCapDelay,    // e.g. now + 5h
      expiresAt: now + overCapDelay + overCapGracePeriod,  // e.g. now + 29h
      executed: false,
      cancelled: false
  }
  emit OverCapMintScheduled(operationId, to, 500M, readyAt)

--- wait overCapDelay (5 hours) ---

Step 2: Execute
ISSUER → executeOverCapMint(operationId)
  op = pendingMints[operationId]
  check: !op.executed && !op.cancelled     → OK
  check: block.timestamp >= op.readyAt    → OK (5h passed)
  check: block.timestamp < op.expiresAt   → OK (within 24h grace)
  op.executed = true                      // mark BEFORE external call (CEI)
  _issueUncapped(op.to, op.amount)        // bypasses _checkThrottle
  emit OverCapMintExecuted(operationId)
```

**Result:** 500M tokens minted. Cap not consumed for this op (see Flow 12 for the design discussion).

---

## Flow 8 — Over-cap: execute too early

```
ISSUER → scheduleOverCapIssuance(to, 500M, salt)  → readyAt = now + 5h

// 2 hours later:
ISSUER → executeOverCapMint(operationId)
  check: block.timestamp >= op.readyAt  → FAIL (3h remaining)
  revert OverCapMintNotReady(readyAt, block.timestamp)
```

**Result:** Reverts with the ready timestamp so caller knows how long to wait.

---

## Flow 9 — Over-cap: expired before execution

```
ISSUER → scheduleOverCapIssuance(to, 500M, salt)
         readyAt = T+5h, expiresAt = T+5h+24h = T+29h

// 30 hours later (overCapDelay + gracePeriod + 1h):
ISSUER → executeOverCapMint(operationId)
  check: !op.executed && !op.cancelled     → OK
  check: block.timestamp >= op.readyAt    → OK (T+30h >= T+5h)
  check: block.timestamp < op.expiresAt   → FAIL (T+30h >= T+29h)
  revert OverCapMintExpired(operationId)
```

**Result:** Stale scheduled mints cannot be executed. Must reschedule with a new `scheduleOverCapIssuance` call.
The old operationId is permanently tombstoned in `pendingMints` — cannot be reused.

---

## Flow 10 — Over-cap: cancelled before execution

```
ISSUER → scheduleOverCapIssuance(to, 500M, salt)  → operationId stored, readyAt = T+5h

// Any time before execution:
MASTER → cancelOverCapMint(operationId)
  check: !op.executed   → OK
  check: !op.cancelled  → OK
  op.cancelled = true
  emit OverCapMintCancelled(operationId)

// Later:
ISSUER → executeOverCapMint(operationId)
  check: !op.executed && !op.cancelled  → FAIL (cancelled = true)
  revert OverCapMintInvalidState(operationId)
```

**Result:** Unauthorized scheduled mint is neutralized. MASTER can cancel at any time, even after `readyAt`.

---

## Flow 11 — Over-cap: duplicate operationId (replay protection)

```
// T=100:
ISSUER → scheduleOverCapIssuance(to, 500M, salt=0xABC)
  operationId = keccak256(abi.encode(to, 500M, 0xABC, 100))  → 0xDEF...

// T=100 (same block, same params, same salt):
ISSUER → scheduleOverCapIssuance(to, 500M, salt=0xABC)
  operationId = keccak256(abi.encode(to, 500M, 0xABC, 100))  → 0xDEF... (same!)
  check: pendingMints[0xDEF].readyAt == 0  → FAIL (already exists)
  revert OverCapMintInvalidState(operationId)
```

**Result:** Cannot schedule two ops with the same `(to, amount, salt)` in the same block.
Different block → different `block.timestamp` → different `operationId` → fine.
Different salt → different `operationId` → fine.

---

## Flow 12 — Does `executeOverCapMint` count toward the window?

**Ticket says:** bypass the cap check entirely — `mintedInWindow` is NOT updated.

**Implication:**
```
State: mintCapAmount=20M, mintedInWindow=19M

ISSUER → executeOverCapMint(opId for 500M)
  → _issueUncapped(to, 500M)    // mintedInWindow stays at 19M
  → 500M minted with no cap impact on the window counter
```

**Alternative considered (rejected per ticket):** Count over-cap mints in `mintedInWindow` anyway for monitoring. This would make `MintCapConsumed` events track total issuance (both paths). Downside: subsequent normal mints in the window would think 519M were minted and the window is long exhausted.

**Recommendation:** Follow ticket spec — no window update on over-cap execute. The `OverCapMintExecuted` event provides the audit trail.

---

## Flow 13 — Cap disabled mid-deployment (backward compatibility)

```
New proxy deployed / existing proxy upgraded:
  mintCapAmount = 0  (default, uninitialized)
  mintCapWindow = 0
  windowStart   = 0
  mintedInWindow = 0

_checkThrottle(any_amount):
  mintCapAmount == 0 → return immediately

→ All existing callers work identically to pre-upgrade behavior.
```

**Result:** No action required from operators after upgrade. Cap must be explicitly enabled by MASTER calling `setMintCap(amount, window)`.

---

## Flow 14 — Cap parameters changed mid-window

```
State: mintCapAmount=20M, mintCapWindow=8h, windowStart=T0, mintedInWindow=15M

// MASTER calls setMintCap(50M, 8h) — raises cap (no window reset)
  mintCapAmount = 50M  (window continues, mintedInWindow=15M unchanged)

Next mint of 30M:
  remaining = 50M - 15M = 35M → 30M <= 35M → OK
```

```
// MASTER calls setMintCap(10M, 8h) — lowers cap below current usage
  mintCapAmount = 10M  (window continues, mintedInWindow=15M)

Next mint of 1:
  remaining = 10M - 15M → underflow risk!
```

> **Implementation note:** `_checkThrottle` must handle `mintedInWindow > mintCapAmount` gracefully.
> Use: `if (mintedInWindow >= mintCapAmount) revert MintCapExceeded(amount, 0)`
> or: `uint256 remaining = mintCapAmount > mintedInWindow ? mintCapAmount - mintedInWindow : 0`

**Recommendation:** Cap parameter changes also reset the window (`windowStart = block.timestamp`, `mintedInWindow = 0`). Prevents the underflow edge case and gives a clean start. Document in NatSpec.

---

## Flow 15 — Bridge/Wormhole DSApp concurrent cross-chain mints

```
// Two Wormhole VAAs arrive and are relayed in the same block:
Tx1: ISSUER(bridge) → issueTokens(toA, 8M)
  _checkThrottle(8M): mintedInWindow=0 → 8M <= 20M → OK, mintedInWindow=8M

Tx2 (same block, sequential): ISSUER(bridge) → issueTokens(toB, 15M)
  _checkThrottle(15M): remaining = 20M-8M = 12M → 15M > 12M → revert MintCapExceeded(15M, 12M)
```

**Result:** Tx2 reverts. EVM is single-threaded — no race condition, but the bridge caller must handle revert and retry in the next window or use the over-cap path for large cross-chain mints.

**Note for Bridge team:** Large cross-chain burn-and-mint operations (>cap in a single window) should pre-schedule via `scheduleOverCapIssuance` on the destination chain before burning on the source chain, factoring in `overCapDelay` into the bridge's expected settlement time.

---

## Flow 16 — `issueTokensWithMultipleLocks` called directly (not via issueTokens)

```
ISSUER → issueTokensWithMultipleLocks(to, 5M, issuanceTime, [1M, 2M], "Vest", [t1, t2])
  // onlyIssuerOrAbove guard is HERE
  → _checkThrottle(5M)   // same check regardless of entry point
  → minting + 2 locks
```

**Result:** All issuance paths, regardless of entry point, hit the throttle. The guard is on `issueTokensWithMultipleLocks`, which is the only function with `onlyIssuerOrAbove`.

---

## Flow 17 — `_issueUncapped` internal (for over-cap execute)

`executeOverCapMint` must call an internal function that does NOT call `_checkThrottle`. Proposed:

```solidity
function _issueUncapped(address to, uint256 amount) internal {
    // Same logic as issueTokensWithMultipleLocks but without _checkThrottle
    ISecuritizeRebasingProvider rebasingProvider = getRebasingProvider();
    TokenLibrary.IssueParams memory params = TokenLibrary.IssueParams({
        _to: to,
        _value: amount,
        _issuanceTime: block.timestamp,
        _valuesLocked: new uint256[](0),
        _releaseTimes: new uint64[](0),
        _reason: "",
        _rebasingProvider: rebasingProvider
    });
    uint256 shares = TokenLibrary.issueTokensCustom(
        tokenData, getCommonServices(), getLockManager(), params
    );
    emit Transfer(address(0), to, amount);
    emit TxShares(address(0), to, shares, rebasingProvider.multiplier());
    checkWalletsForList(address(0), to);
}
```

This keeps `issueTokensWithMultipleLocks` as the cap-enforced public API while allowing over-cap mints to reuse the same underlying TokenLibrary logic.

---

## Flow 18 — Reentrancy protection on `executeOverCapMint`

`_issueUncapped` calls `TokenLibrary.issueTokensCustom` which calls `LockManager.createLockForInvestor` (external call). Reentrancy vector:

```
executeOverCapMint
  → _issueUncapped
    → TokenLibrary.issueTokensCustom
      → LockManager.createLockForInvestor  ← external call
        → [malicious LockManager could call back executeOverCapMint]
```

**Protection:** Mark `op.executed = true` BEFORE calling `_issueUncapped` (checks-effects-interactions). No `ReentrancyGuard` needed if CEI is strictly followed.

```solidity
// CORRECT — CEI order
op.executed = true;                    // effect
emit OverCapMintExecuted(operationId); // event
_issueUncapped(op.to, op.amount);      // interaction
```

---

## Events & Errors Summary

```solidity
// Throttle
event MintCapConsumed(uint256 amount, uint256 totalInWindow, uint256 windowStart);
error MintCapExceeded(uint256 requested, uint256 remaining);

// Over-cap timelock
event OverCapMintScheduled(bytes32 indexed operationId, address indexed to, uint256 amount, uint256 readyAt);
event OverCapMintExecuted(bytes32 indexed operationId);
event OverCapMintCancelled(bytes32 indexed operationId);

error OverCapMintNotReady(uint256 readyAt, uint256 current);
error OverCapMintExpired(bytes32 operationId);
error OverCapMintInvalidState(bytes32 operationId);  // covers: duplicate, already executed, already cancelled
```

---

## Open Design Questions

| # | Question | Ticket says | Recommendation |
|---|---|---|---|
| 1 | Do over-cap mints count toward `mintedInWindow`? | No (bypass) | Follow ticket — bypass. `OverCapMintExecuted` event provides audit trail. |
| 2 | Should cap parameter changes reset the window? | Unspecified | Yes — reset on change to avoid underflow and give clean slate (see Flow 14). |
| 3 | `CANCELLER_ROLE` vs MASTER? | "discuss" | MASTER only for v1. New role requires TrustService changes — out of scope here. |
| 4 | What if `overCapDelay = 0`? | Unspecified | Allow it (immediate execution). Useful for testing and tokens that want scheduling-only semantics without the time constraint. Guard: `expiresAt = readyAt + overCapGracePeriod` still applies. |
| 5 | Should `scheduleOverCapIssuance` require `amount > mintCapAmount`? | No | Don't enforce. Operators might schedule within-cap mints for audit trail purposes. The over-cap path is opt-in, not forced. |
| 6 | What happens to `windowStart` after upgrade (before first mint)? | Unspecified | `windowStart = 0`. First mint always resets the window (`block.timestamp >= 0 + mintCapWindow` is trivially true for any `mintCapWindow > 0`). |
