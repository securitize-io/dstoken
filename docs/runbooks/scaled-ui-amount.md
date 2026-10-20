# ERC-8056 Scaled UI Amount — Deployment & Operations Runbook

**Standard:** [ERC-8056](https://eips.ethereum.org/EIPS/eip-8056) (Draft) + [ERC-165](https://eips.ethereum.org/EIPS/eip-165)
**Version:** DSToken v4.3.0+ (BC-2599)

---

## 1. Overview

A DSToken runs in exactly one of two modes. **New tokens start in SCALED_UI**; MASTER can switch:

| | **REBASING** | **SCALED_UI** (ERC-8056, default) |
|---|---|---|
| `balanceOf` / `totalSupply` / `Transfer` | Scaled by `SecuritizeRebasingProvider.multiplier()` | **Raw**, never scaled |
| What a split changes | The rebasing multiplier: every integrator sees new balances | The ERC-8056 `uiMultiplier()`: only ERC-8056-aware integrators show new balances |
| ERC-165 answers | ERC-165, ERC-20, ERC-20 Metadata, ERC-20 Permit | The same **plus** the four ERC-8056 interfaces |
| ERC-8056 functions | Revert with `Scaled UI amount not enabled` | Live |
| Rebasing multiplier | Settable by MASTER | **Frozen at 1e18** (the provider refuses to change it) |

SCALED_UI keeps the token a plain, raw-amount ERC-20 for DeFi, bridges and custodians and reflects corporate
actions at the display layer. Switch to REBASING when every holder's `balanceOf` must move with the corporate
action. Proxies upgraded from a version before 4.3.0 stay in REBASING mode (the mode is set in `initialize`).

The multiplier is an 18-decimal fixed point: `1e18` = 1.0, `2e18` = 2:1 split, `333333333333333333` ≈ 1:3 reverse split.

### Interface ids

| Interface | id | Functions |
|---|---|---|
| `IScaledUIAmount` | `0xa60bf13d` | `uiMultiplier()` |
| `IScaledUIAmountNewUIMultiplier` | `0x4bd27648` | `newUIMultiplier()`, `effectiveAt()` |
| `IScaledUIAmountConversion` | `0x57854fc3` | `toUIAmount(uint256)`, `fromUIAmount(uint256)` |
| `IScaledUIAmountBalances` | `0xd890fd71` | `balanceOfUI(address)`, `totalSupplyUI()` |

## 2. Deployment

```bash
# SCALED_UI (default)
npx hardhat deploy-all --network <net> --name "My Token" --symbol MTK --decimals 6 --compliance REGULATED
# REBASING
npx hardhat deploy-all --network <net> --name "My Token" --symbol MTK --decimals 6 --compliance REGULATED \
  --token-mode REBASING [--multiplier <1e18-scaled>]
```

`DSToken.initialize` puts every new token in SCALED_UI mode and emits `UIMultiplierUpdated(0, 1e18, now)` so
indexers have a starting point. `deploy-all` wires services, then calls `setScaledUIAmountMode(false)` when
`--token-mode REBASING` was given. `--multiplier` must stay at its default (`1e18`) unless `--token-mode REBASING`;
the task rejects anything else.

### Switching the mode

```
DSToken.setScaledUIAmountMode(bool enabled)   # MASTER only
```

Rules enforced on-chain, so that no number an integrator reads changes meaning at the switch:
- **enable** (REBASING → SCALED_UI): the rebasing provider's `multiplier()` must be exactly `1e18`. The UI
  multiplier is reset to 1e18 (`UIMultiplierUpdated(0, 1e18, now)`).
- **disable** (SCALED_UI → REBASING): the UI multiplier must be `1e18` with no pending update.
- Both emit `ScaledUIAmountModeChanged(enabled)` and flip the ERC-165 answers for the ERC-8056 ids.
- While SCALED_UI is on, `SecuritizeRebasingProvider.setMultiplier` reverts (`Multiplier is frozen in scaled UI mode`).
  This needs the token wired under service id `DS_TOKEN` (2) in the provider (`set-services` does it; without it
  the freeze does not apply).

Holders may exist at the switch: with both multipliers at identity, `balanceOf` and `balanceOfUI` already agree.

## 3. Operations

All multiplier operations are **ISSUER or MASTER** (`onlyIssuerOrAbove`). They do not touch shares, the mint
cap, locks or compliance, so they are not routed through the governance timelocks.

### Schedule a split / reverse split

```
DSToken.setUIMultiplier(newMultiplier, effectiveAtTimestamp)
```

- `1e12 <= newMultiplier <= 1e24` (1e-6 to 1e6); `effectiveAtTimestamp > block.timestamp`.
- Emits `UIMultiplierUpdated(oldMultiplier, newMultiplier, effectiveAtTimestamp)`.
- `uiMultiplier()` keeps returning the old value until `block.timestamp >= effectiveAtTimestamp`, then switches
  by itself. **There is no execute step.**
- `newUIMultiplier()` / `effectiveAt()` show the scheduled values before and after they apply (compare
  `effectiveAt()` with the current time to know whether it is still pending).
- Calling it again while an update is still pending **supersedes** it: the token emits
  `UIMultiplierUpdateCancelled(pendingMultiplier, pendingEffectiveAt)` and then `UIMultiplierUpdated(...)`.

### Cancel a pending update

```
DSToken.cancelUIMultiplierUpdate()
```

Only while `block.timestamp < effectiveAt()`. Emits `UIMultiplierUpdateCancelled`; the current multiplier stays.

### Reading balances

| Need | Call |
|---|---|
| Raw balance (what transfers move) | `balanceOf(a)` |
| Display balance | `balanceOfUI(a)` = `floor(balanceOf(a) * uiMultiplier() / 1e18)` |
| Convert a user-typed UI amount into a transfer amount | `fromUIAmount(ui)` = `floor(ui * 1e18 / uiMultiplier())` |

Rounding is **floor** in both directions: a display never shows more than the holder owns, and converting a
displayed balance back never asks for more than the holder has. Round trips are therefore lossy
(`fromUIAmount(toUIAmount(x)) <= x`) and `sum(balanceOfUI) <= totalSupplyUI()`. A UI that needs the exact raw
balance should use `balanceOf` directly rather than converting the displayed value.

`TransferWithUIAmount` is **not** emitted (optional in the spec; indexers reconstruct UI amounts from `Transfer`
and the multiplier history).

## 4. What this does not do

- Does not change compliance: holdings limits, locks, mint caps and every rule still operate on raw amounts.
- Does not change wrapped/bridged representations or custodian views: anything reading `balanceOf` shows raw
  amounts until it adopts ERC-8056.
- Platform services (CDS, abstraction layer, scanners, control panel) learn about SCALED_UI mode in follow-up
  tickets; until then they treat the token as a non-rebasing ERC-20.

## 5. Implementation notes

- Storage: 4 slots appended to `TokenDataStore` (`scaledUIAmountMode`, `scaledUIAmount{multiplier,newMultiplier,effectiveAt}`), gap 28 → 24. Zero values = REBASING, so upgraded proxies keep their behaviour.
- Logic lives in `TokenLibrary` (`currentUIMultiplier`, `toUIAmount`, `fromUIAmount`, `setUIMultiplier`,
  `cancelUIMultiplierUpdate`, `enableScaledUIAmount`); DSToken holds thin, role-checked wrappers.
- `test/contract-size.test.ts` is the EIP-170 gate — the hardhat network allows unlimited contract size, so it is
  the only place an oversized DSToken fails before a real deployment.
