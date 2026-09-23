# BC-2349 — Global Denylist Wiring Runbook

## Overview

`GLOBAL_DENYLIST_MANAGER` (service id `8201`) is a single shared denylist that every
wired permissionless token's `ComplianceServicePermissionless` consults **before** its own
per-token `BlackListManager`. A hit on the global list blocks the transfer/issuance
immediately — the local list is never checked (short-circuit). This is a platform-level
list (e.g. sanctions/fraud), distinct from a token's own local blacklist, which stays an
issuer-controlled, per-token concern.

**The contract itself — deployment, roles (`ADMIN`/`OPERATOR`), pause, add/remove — lives in
a separate repo:**
[bc-global-denylist-manager-sc](https://github.com/securitize-io/bc-global-denylist-manager-sc).
This doc covers only the `dstoken`-side wiring and the resulting on-chain behavior.

**Scope decision:** the ticket's original ask included "multiple global denylists,
analogous to the existing multiple global whitelists," with OR semantics across several
lists. That multi-list pattern does not exist anywhere in this codebase today (whitelist
and blacklist services are single-address slots, not arrays) — this pass ships the
**singleton** version only. The design stays extensible: `ComplianceServicePermissionless`
only ever holds one address in its `GLOBAL_DENYLIST_MANAGER` slot and calls
`isGloballyDenylisted(wallet)` on it, so a future aggregator contract (same interface,
fanning out to N lists internally) could occupy that slot later with zero changes to
`ComplianceServicePermissionless.sol`.

## Wiring a deployed instance into a token

`dstoken`'s `deploy-all` only wires an already-existing `GlobalDenyListManager` address in
— it does not deploy one (see the other repo's README for that flow):

```bash
npx hardhat deploy-all --network <net> --name TokenA --symbol TKA \
  --compliance PERMISSIONLESS \
  --global-denylist-manager-address 0xGBLM...

# Every subsequent permissionless token reuses the same address:
npx hardhat deploy-all --network <net> --name TokenB --symbol TKB \
  --compliance PERMISSIONLESS \
  --global-denylist-manager-address 0xGBLM...
```

If `--global-denylist-manager-address` is omitted, the token deploys with
`GLOBAL_DENYLIST_MANAGER` left unset (`address(0)`) — the fail-open path (see matrix
below). Wire it in later on an existing token via
`dsToken.setDSService(GLOBAL_DENYLIST_MANAGER, addr)` and
`complianceService.setDSService(GLOBAL_DENYLIST_MANAGER, addr)` (both need it — the
compliance service reads its own service slot, mirroring how `BLACKLIST_MANAGER` is wired).

## Fail-open / fail-closed matrix

For a wallet that *would* be blocked if the corresponding list were checked:

| Global manager | Local manager | Result |
|---|---|---|
| unset (`address(0)`) | unset | Everything valid — no enforcement at all |
| unset | set, wallet locally blacklisted | Blocked, code `100` (local enforced, global fails open by design) |
| set, wallet globally denylisted | unset | Blocked, code `102` (global enforced; local-unset fail-open doesn't mask it — this is also the BC-1646 fix: an unset local manager no longer reverts) |
| set, wallet globally denylisted | set, wallet also locally blacklisted | Blocked, code `102` (global short-circuits before local is checked) |

If the configured `GlobalDenyListManager` itself **reverts** on `isGloballyDenylisted`
(bug, bad upgrade), the revert propagates — **fail-closed**, an accepted risk for this
ticket since the manager is a Securitize-controlled proxy. Every permissionless token
wired to that instance stops transferring/issuing until it's fixed. This is the opposite
tradeoff from an unset manager (which fails open) — a reverting manager is expected to be a
transient incident, not a steady state.

## Rejection codes

| Code | Meaning | Source |
|---|---|---|
| `100` | Wallet is blacklisted (local, per-token) | `BlackListManager` |
| `102` | Wallet is globally denylisted (platform-wide) | `GlobalDenyListManager` |

Distinct codes let Ops/Support tell "blocked by the platform-wide list" apart from
"blocked by this specific issuer" without querying on-chain state for both contracts.

## Testing strategy: mock only, no cross-repo dependency

`dstoken`'s own tests (`test/compliance-service-permissionless.test.ts`, "Global denylist
(BC-2349)" section) validate `ComplianceServicePermissionless`'s logic — short-circuit
ordering, distinct rejection codes, fail-open/fail-closed, burn/seize bypassing compliance —
against `contracts/mocks/GlobalDenyListManagerMock.sol`, a trivial settable stand-in with no
access control of its own.

This repo deliberately does **not** deploy the real `GlobalDenyListManager` contract to
verify it end-to-end. Two earlier approaches were tried and dropped:

1. A git `devDependency` pulling `bc-global-denylist-manager-sc#dev` directly (`npm install`
   fetching it via `git+ssh`, plus a Solidity import shim) — gave automatic drift detection,
   but CI runners have SSH access to `dstoken` only, not to the sibling repo, so `npm install`
   failed there.
2. Vendoring (copying) the real contract's source into `contracts/vendor/` — worked in CI,
   but meant carrying ~600 lines of another repo's code inside `dstoken`, needing manual
   re-sync whenever the sibling repo changed, with no automatic signal if that sync was
   forgotten.

**Current decision: rely on the mock only.** `bc-global-denylist-manager-sc` has its own
independent test suite (48/48 passing as of this writing) covering its actual
`AccessControl`/pause/idempotency behavior — that's not `dstoken`'s job to re-verify.
`dstoken` only needs to prove that `ComplianceServicePermissionless` correctly calls
whatever address is wired into the `GLOBAL_DENYLIST_MANAGER` slot, which the mock-based
tests already do. The trade-off: a real ABI-incompatible change in the sibling repo
wouldn't be caught by `dstoken`'s test suite — only by actually deploying against it (see
`docs/runbooks/permissionless.md` / manual Sepolia testing).

## Audit

This feature requires a security audit pass before production use — process step, not
enforced on-chain.
