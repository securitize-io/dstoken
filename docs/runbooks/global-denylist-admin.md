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
permissionless `DSToken`, end to end. This catches drift between the mock's assumed
behavior and the sibling repo's actual ABI/behavior.

The real contract's source is **vendored** (copied in directly) under
`contracts/vendor/global-denylist-manager/`:

- `GlobalDenyListManager.sol`
- `IGlobalDenyListManager.sol`
- `GlobalDenyListManagerDataStore.sol`
- `BaseRBACContract.sol`

Each file's header records the exact source commit it was copied from
(`bc-global-denylist-manager-sc`, e.g. `d96f85cfad7a5dfc390e5b56d1ea5aa70caa257a`).

**This used to be a `git+ssh` devDependency** (`npm install` fetching
`bc-global-denylist-manager-sc#dev` directly, with a Solidity import shim re-exporting it
from `node_modules/`) — that gave automatic drift detection on every `npm install`, but
required SSH access to a *second* private repo. CI runners clone `dstoken` but have no
credentials for the sibling repo, so `npm install` failed there with:

```
npm error command git --no-replace-objects ls-remote ssh://git@github.com/securitize-io/bc-global-denylist-manager-sc.git
npm error git@github.com: Permission denied (publickey).
```

Vendoring trades away the automatic drift detection (this test now only catches drift
against whatever commit was last copied in, not the sibling repo's live tip) for a build
that actually works in CI.

### How to re-sync the vendored copy

There's no `npm install` step anymore — do it by hand when the sibling repo changes:

1. In `bc-global-denylist-manager-sc`, note the commit you want to sync to.
2. Copy the 4 files listed above from that commit into
   `dstoken/contracts/vendor/global-denylist-manager/`, flattening them into that one
   folder (no subfolders) — update each file's relative imports to `./` accordingly if the
   sibling repo's own folder structure changed.
3. Update the `Commit:` line in each file's "VENDORED COPY" header to the new commit hash.
4. Recompile and re-run the integration test:

```bash
npx hardhat compile
npx hardhat test test/integration/global-denylist-manager-integration.test.ts
```

5. Commit the diff — that diff *is* the record of "we bumped to commit X of the sibling
   repo."

## Audit

This feature requires a security audit pass before production use — process step, not
enforced on-chain.
