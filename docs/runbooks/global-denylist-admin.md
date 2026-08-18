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

## Cross-repo integration test

`test/integration/global-denylist-manager-integration.test.ts` deploys the **real**
`GlobalDenyListManager` contract (not the local `GlobalDenyListManagerMock` used by the
rest of the `compliance-service-permissionless.test.ts` suite) and wires it into a real
permissionless `DSToken`, end to end. This is a drift-detector: if
`bc-global-denylist-manager-sc` ever changes its ABI or behavior incompatibly, this test
(not just the mock-based ones) fails.

This works via a `devDependency` in `package.json`:

```json
"bc-global-denylist-manager-sc": "git+ssh://git@github.com/securitize-io/bc-global-denylist-manager-sc.git#dev"
```

and a Solidity import shim, `contracts/integration/GlobalDenyListManagerImport.sol`, that
re-exports `GlobalDenyListManager` from that package's `contracts/` folder so Hardhat
compiles the real bytecode into this repo's own artifacts (the same mechanism used for
`@openzeppelin/contracts` imports — Solidity resolves a bare import specifier by looking in
`node_modules/<package>/...`).

### How this stays (or doesn't stay) up to date

**`npm install` does NOT automatically re-fetch the latest `dev` commit.** The first
install resolves `#dev` to a specific commit SHA and pins it in `package-lock.json`:

```json
"node_modules/bc-global-denylist-manager-sc": {
  "resolved": "git+ssh://git@github.com/securitize-io/bc-global-denylist-manager-sc.git#<commit-sha>"
}
```

Every subsequent plain `npm install` reuses that pinned SHA — on purpose, for reproducible
builds (you don't want the build to silently change because someone pushed to the other
repo). To actually pull the latest `dev` commit:

```bash
npm install bc-global-denylist-manager-sc@git+ssh://git@github.com/securitize-io/bc-global-denylist-manager-sc.git#dev
```

This re-resolves `dev` to its current tip, updates the pinned SHA in `package-lock.json`,
and re-downloads into `node_modules/`. Then re-run the integration test to confirm nothing
broke:

```bash
npx hardhat compile
npx hardhat test test/integration/global-denylist-manager-integration.test.ts
```

Commit the resulting `package-lock.json` diff (it's just the updated `resolved` SHA) —
that diff *is* the record of "we bumped to commit X of the sibling repo."

To pin to something other than the `dev` branch tip (a tag, a specific commit, or later a
release branch once one exists), replace the whole dependency string, e.g.:

```json
"bc-global-denylist-manager-sc": "git+ssh://git@github.com/securitize-io/bc-global-denylist-manager-sc.git#v1.0.0"
```

then `npm install` and re-run the integration test as above.

### CI note

This dependency is fetched via `git+ssh`, not the npm registry — whatever runs
`npm install` (your machine, or a CI runner) needs valid SSH access to the
`bc-global-denylist-manager-sc` GitHub repo specifically, not just to `dstoken`. If CI
clones `dstoken`
via a deploy key, that same key (or an equivalent one) needs read access to the sibling repo
too, or `npm install` will fail there even though it succeeds locally.

## Audit

This feature requires a security audit pass before production use — process step, not
enforced on-chain.
