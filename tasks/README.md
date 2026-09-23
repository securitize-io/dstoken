# Hardhat tasks

## Scope — read this first

**These tasks are not the production deployment path.** Production tokens are deployed and
configured by **`bc-deployment-task-svc`**, which drives its own task pipeline against a database.
The tasks in this directory exist to stand up complete test tokens from this repo (local, or a
testnet) and to script one-off operations.

That distinction matters most for `setup-governance`. Its handover logic enumerates contracts by
walking a fixed list of service ids, which is adequate for a token this repo just deployed, where
the full set of contracts is known. It is **not** a safe basis for operating on a long-lived
production token — see *Applying governance to an existing token* below.

For reference, `bc-deployment-task-svc` solves the same problem differently and more completely: it
transfers ownership of every contract **it recorded deploying** for that deployment, so it cannot
miss one by omission from a hardcoded list.

## Deploying a test token with governance

```bash
# 1. protocol contracts (also runs set-roles and set-services; deployer is MASTER at this point)
npx hardhat deploy-all --network <net> --name "My Token" --symbol MTK --decimals 18 --compliance REGULATED

# 2. the three BC-2133 timelocks
npx hardhat deploy-timelocks --network <net> \
  --proposers 0xA,0xB --executors permissionless \
  --master-delay 172800 --compliance-delay 86400 --roles-delay 86400

# 3. wire them WITHOUT handover — all of this is onlyMaster, so it must happen while the
#    deployer is still MASTER. Runs verify-governance at the end.
npx hardhat setup-governance --network <net> --token <dsToken> \
  --master-timelock <A> --compliance-timelock <B> --roles-timelock <C>

# 4. review step 3's output, then hand over (IRREVERSIBLE for the signer)
npx hardhat setup-governance --network <net> --token <dsToken> \
  --master-timelock <A> --compliance-timelock <B> --roles-timelock <C> --handover true

# 5. manually renounce DEFAULT_ADMIN_ROLE on each timelock, from the admin wallet,
#    only after verify-governance passes post-handover
```

## Why the handover enumerates what it does

`ServiceConsumer::onlyMaster` authorizes **two independent principals**: the contract's own
`OwnableUpgradeable::owner`, or the holder of `ROLE_MASTER` in `TrustService`.

```solidity
modifier onlyMaster {
    if (owner() != msg.sender) require(getTrustService().getRole(msg.sender) == ROLE_MASTER, "Insufficient trust level");
    _;
}
```

`BaseDSContract::_authorizeUpgrade` is gated on that modifier, so **`owner` alone is enough to
replace the implementation** behind any `BaseDSContract` proxy. A complete handover therefore has to
move *both* principals for *every* privileged contract. Moving `ROLE_MASTER` alone leaves every
`owner` in place, and each one is a standing upgrade path outside the timelock.

The set of ids walked is in [`utils/governed-services.ts`](./utils/governed-services.ts). Deprecated
ids are included deliberately: the `DEPRECATED_` prefix is a source-code label with **no on-chain
effect**, and live tokens still register several of them behind contracts that hold `ROLE_ISSUER` or
`ROLE_TRANSFER_AGENT`. Ids resolving to the zero address are skipped, so listing an unused one is free.

### This list is not a completeness guarantee

It can only find contracts reachable through `getDSService`. A contract can hold a TrustService role
with **no service id registered at all**, and one does today: `set-roles` grants `BulkOperator`
`ROLE_ISSUER`, but `set-services` in this repo never registers it under a service id. On tokens
deployed from this repo it is therefore invisible to any id-based enumeration, while remaining an
Ownable `BaseDSContract` whose owner can upgrade it. (Tokens deployed by `bc-deployment-task-svc`
*do* register it at id `8193`, so there it is found.)

The only complete enumeration is a replay of `DSTrustServiceRoleAdded` / `DSTrustServiceRoleRemoved`
from the TrustService, folded into the current role-holder set, resolving each holder's `owner()`.
Treat the id list as a convenience, not a safety property.

## Handover ordering

`ROLE_MASTER` is surrendered last, and only if everything before it succeeded. `--handover` runs in
this order:

1. **Pre-flight.** Resolve the expected owner of every target. Nothing is sent yet. If any
   transferable contract is owned by someone other than the signer — or turns out not to be Ownable
   at all — the task aborts with the complete list, while the signer still holds `ROLE_MASTER` and
   can act on it.
2. **Transfer.** Move each `owner()` to the master timelock, re-reading `owner()` afterwards rather
   than trusting the receipt, and aborting if any of them did not actually move.
3. **Pre-handover verification.** Run the full checklist while the signer is still MASTER, so a
   failure blocks the irreversible step rather than reporting it afterwards.
4. **`setServiceOwner`.** Surrender `ROLE_MASTER`. Irreversible for the signer.
5. **Post-handover verification.** Re-run the checklist against the final state.

The property that matters: **there is no path where `ROLE_MASTER` moves while an ownership transfer
is outstanding.** Anything that stops the run leaves the signer able to fix it.

## Contracts that must NOT be handed over

Some services are **shared across tokens** and administered by RBAC under an admin that is not this
token's master. They do not belong to any single DS token, and transferring them to one token's
master timelock would hand that token's governance control over a contract other tokens depend on.

| Contract | Why |
|---|---|
| `GLOBAL_DENYLIST_MANAGER` (8201) | Shared denylist, lives in `bc-global-denylist-manager-sc` with its own AccessControl admin. Marked `transferable: false` — reported, never transferred. |
| `REGISTRY_SERVICE` (4), when it is a shared **Global Registry Service** | Sometimes one GRS is reused across tokens (`deploy-all --global-registry-service`, and the `GLOBAL_WHITELISTED` path in `bc-deployment-task-svc`). Its admin is not this token's master. |

The GRS case cannot be detected from the service id alone — id 4 is a per-token registry on most
tokens and a shared one on others. The handover will stop with an error if id 4 is owned by someone
other than the signer; pass `--skip-services REGISTRY_SERVICE` to proceed deliberately once you have
confirmed it is shared.

Both must be governed through their own admin processes, separately from any token handover.

## Applying governance to an existing (production) token

Do not point `setup-governance --handover` at a live token without analysing it first. Every legacy
token is different, and several predate the current deployment tooling.

1. **Enumerate the real privileged set** for that token — role holders from TrustService events, not
   just the id list here — and resolve `owner()` for each.
2. **Check whether an implementation upgrade is needed first.** Governance enforcement depends on
   `TrustService.setRolesGovernor` and the `COMPLIANCE_RULES_TIMELOCK` service on the
   ComplianceConfigurationService; a token on older implementations has neither and must be upgraded
   before it can be governed.
3. **Deal with contracts that are not covered by the handover:**
   - Contracts holding `ROLE_ISSUER` / `ROLE_TRANSFER_AGENT` that are no longer used — prefer
     revoking the role and clearing the service id over transferring ownership.
   - `DEPRECATED_SECURITIZE_SWAP` (16384) gates `_authorizeUpgrade` on `owner` **alone**, not through
     `onlyMaster`. Moving `ROLE_MASTER` grants the master timelock nothing over it, and once the
     current owner key is retired nobody can transfer it. Handle it while that key still exists.
   - `WALLET_REGISTRAR` (1024) is owned by the wallet syncer on tokens deployed via
     `bc-deployment-task-svc`, so it will not be signer-owned there.
4. **Only then** deploy timelocks and run the wiring and handover steps.

Note that `burn` (`onlyIssuerOrTransferAgentOrAbove`) and `seize` (`onlyTransferAgentOrAbove`)
consume no mint allowance and pass through no timelock — by design, per
[`docs/runbooks/governance-timelocks.md`](../docs/runbooks/governance-timelocks.md), which keeps an
instant emergency toolbox. Any contract still holding those roles after handover therefore retains
an instant value-moving path, which is the reason step 3 matters.

## Task reference

| Task | Purpose |
|---|---|
| `deploy-all` | Full protocol deploy + `set-roles` + `set-services`. **Does not** deploy or wire timelocks. |
| `deploy-libraries` | `TokenLibrary` / `ComplianceServiceLibrary`, externally linked |
| `deploy-timelocks` | The three BC-2133 `TimelockController`s |
| `setup-governance` | Wire timelocks; `--handover` also moves every `owner()` and `ROLE_MASTER` |
| `verify-governance` | Assert wiring/handover state; reads the same id list as `setup-governance` |
| `set-roles` / `set-services` | Role grants and service wiring (invoked by `deploy-all`) |
| `verify-all` | Etherscan-style verification of deployed contracts |
| `contract-call` | Ad-hoc call helper |

`setup-governance` and `verify-governance` share
[`utils/governed-services.ts`](./utils/governed-services.ts) deliberately: a verifier with its own
copy of the list could drift from the task it is meant to check, and would then confirm a handover
it never actually inspected.
