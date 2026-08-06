# BC-2329 — Testnet QA Runbook

QA of BC-2132 (mint throttling + over-cap timelock) and BC-2133 (three-TimelockController
governance) against a **public testnet**: real wallets, real transactions, real elapsed time.
`evm_increaseTime` / `evm_mine` are not used anywhere in these scenarios — that is the whole point
of the exercise, and the mocked coverage already exists in `test/dstoken-mint-throttle.test.ts`,
`test/dstoken-governance.test.ts` and `test/governance-setup-tasks.test.ts`.

Out of scope: the CDS / AL / SS / vue-control-panel platform integration. This runbook covers the
contracts and Hardhat tasks only, driven directly — the way CDS will eventually drive them.

## 0. Prerequisites

**Wallets.** One funded EOA per role, in this fixed order (`hardhat.config.ts` exposes them as
signers 0-5, so the scenario tasks address them by index):

| Signer | Role | Env var |
|---|---|---|
| 0 | deployer / MASTER | `DEPLOYER_PRIV_KEY` |
| 1 | ISSUER | `ISSUER_PRIV_KEY` |
| 2 | TRANSFER_AGENT | `TRANSFER_AGENT_PRIV_KEY` |
| 3 | timelock proposer | `PROPOSER_PRIV_KEY` |
| 4 | timelock executor | `EXECUTOR_PRIV_KEY` |
| 5 | timelock canceller | `CANCELLER_PRIV_KEY` |
| 6 | MASTER/`owner()` of a pre-existing token, when that is not the deployer | `LEGACY_MASTER_PRIV_KEY` |

Signer 6 is optional and deliberately last, so it never shifts the role indices above. The upgrade
tasks take `--signer 6` (or `--signer <address>`) to sign from it.

**Authority.** `_authorizeUpgrade` is `onlyMaster`, and `onlyMaster` passes when
`owner() == msg.sender` **or** the caller holds the MASTER role. On an existing token neither is
necessarily the deployer — a token deployed by someone else will have its own `owner()`. The
upgrade tasks check both before spending any gas and name the wallet that does have authority.

Copy `.env.local` to `.env` and fill it in — `hardhat.config.ts` loads `.env`, not `.env.local`.
Do not reuse one key for several roles: the scenarios assert cross-role denials, and a shared
signer turns those assertions into false passes.

**Networks.** `sepolia` is the primary target; repeat the key scenarios on `arbitrum`
(Arbitrum Sepolia) to catch block-time and gas-estimation differences.

**Run state.** Every scenario persists progress to a JSON file (`--state`). The delays are waited
out in wall-clock time, so a scenario spans several invocations: run the command, it tells you when
to come back, run the *same command* again. Completed steps are skipped and every transaction is
recorded with its hash, gas and explorer link — that file is the artifact to attach to the ticket.

Keep one state file per scenario per network, e.g. `qa-a-sepolia.json`.

## 1. Scenario A — mint cap and over-cap timelock

```bash
npx hardhat deploy-all --network sepolia --name "QA Token" --symbol QAT --decimals 2
# grant ISSUER to signer 1 and TRANSFER_AGENT to signer 2 via set-roles / TrustService.setRole

npx hardhat qa-scenario-a --network sepolia \
  --token <dsToken> --state qa-a-sepolia.json \
  --cap 1000 --window 600 --delay 900 --grace 600
```

Covers: `setMintCap` from MASTER and its on-chain effect · issuing up to the cap · the next
issuance reverting **on-chain** (sent with an explicit gasLimit so a failed tx is actually mined
and linkable) · the tumbling window resetting itself with no administrative tx · scheduling an
over-cap issuance, failing to execute it early, executing it after the real delay · over-cap
execution not consuming the window budget · cancelling mid-delay from MASTER · letting the grace
period genuinely expire.

Pick `--window`, `--delay` and `--grace` large enough that one resume cycle (a few minutes) cannot
overshoot them. The grace period is deliberately left at 0 until the operation that is meant to
expire is scheduled, so a slow resume cannot destroy the run.

## 2. Scenario B — governance timelocks

```bash
npx hardhat deploy-timelocks --network sepolia \
  --proposers <signer3> --executors <signer4> --cancellers <signer5> \
  --master-delay 3600 --compliance-delay 3600 --roles-delay 3600

npx hardhat setup-governance --network sepolia --token <dsToken> \
  --master-timelock <A> --compliance-timelock <B> --roles-timelock <C>

npx hardhat qa-scenario-b --network sepolia --token <dsToken> \
  --master-timelock <A> --compliance-timelock <B> --roles-timelock <C> \
  --state qa-b-sepolia.json
```

Steps b0-b5 are reversible and stop before the handover. Covers: `verify-governance` passing ·
every timelock role sitting on the intended wallet · a compliance-rule change and a role grant each
going through their own timelock · **cross-domain denial** (the roles timelock cannot change
compliance rules, the compliance timelock cannot grant roles — the most likely defect in a
three-timelock setup) · cancelling from the real canceller wallet and a non-canceller being
rejected · scheduling below `minDelay` reverting · `pause()` staying instant for TRANSFER_AGENT
while `unpause()` is MASTER-only.

Then the irreversible phase:

```bash
npx hardhat qa-scenario-b --network sepolia --token <dsToken> \
  --master-timelock <A> --compliance-timelock <B> --roles-timelock <C> \
  --state qa-b-sepolia.json --handover
```

Covers: `setup-governance --handover` · the old MASTER EOA holding no role and being rejected on
`setOverCapDelay`, `setDSService` and `setServiceOwner` · a Master-gated action and `unpause()`
driven through the master timelock · `verify-governance --handed-over` passing.

**Ordering note.** A Master-gated action driven *through* the master timelock is only possible
after the handover, because until then the master timelock holds no authority. The ticket lists it
before the handover; it lives in the handover phase here for that reason.

Finally, from the admin wallet, renounce the temporary admin on each timelock:
`timelock.renounceRole(timelock.DEFAULT_ADMIN_ROLE(), adminWallet)`, then re-run:

```bash
npx hardhat verify-governance --network sepolia --token <dsToken> \
  --master-timelock <A> --compliance-timelock <B> --roles-timelock <C> \
  --handed-over true --expect-admin-renounced --admin <adminWallet>
```

**This step is not optional and is easy to forget.** Until it runs, the temporary admin can grant
itself `PROPOSER_ROLE` on a timelock and still push anything through after the delay — so losing
the MASTER role removes only its *instant* authority, not its authority. `--expect-admin-renounced`
is a separate flag from `--handed-over` on purpose: the runbook renounces only after
verify-governance passes post-handover, so requiring it under `--handed-over` would deadlock that
sequence.

`verify-governance` also probes that compliance gating is *live*, not merely registered — see the
caveat below.

### Registered is not enforced

A timelock address recorded on the ComplianceConfigurationService proves nothing by itself. The
pre-BC-2133 CCS gates its setters with `onlyTransferAgentOrAbove` and never reads the timelock
slot, so registering a timelock on a CCS that has not been upgraded stores the address and changes
no behaviour: discovery reports "timelocked" while any TRANSFER_AGENT can still change the rules,
with no revert and no signal. `verify-governance` therefore static-calls a CCS setter with a
TRANSFER_AGENT `from` address and asserts it reverts. The probe needs a configured
TRANSFER_AGENT key; without one it is skipped with a warning rather than passing silently.

## 3. Scenario C — upgrading a pre-existing token (highest priority)

No automated test covers this path: they all deploy fresh with the new implementation already
included.

**Baseline.** `master` (tip `04e4d65`) does not contain BC-2132/2133, and its storage-relevant
contracts are byte-identical to `77c1927` on `dev` — the merge right before
`aa34f48 BC-2132 Add mint throttling and over-cap timelock`. Either ref is a valid baseline. The
commit before master's tip differs only in `ComplianceServicePermissionlessDataStore.sol`, which
does not affect `DSToken`, so "master tip or the one before" is not an ambiguity that matters for
the token's layout.

**Three proxies, not one.** BC-2132/2133 change three deployed contracts:

| Contract | Change | Consequence |
|---|---|---|
| `DSToken` | mint throttle storage; `unpause()` becomes `onlyMaster` | needs `upgrade-token` |
| `TrustService` | new `rolesGovernor` storage (`__gap` 44 → 43); `setRolesGovernor`/`getRolesGovernor` | **`setup-governance` reverts without this upgrade** — the function does not exist on the old implementation |
| `ComplianceConfigurationService` | new `onlyComplianceAdmin` gating | the compliance rules timelock has no enforcement without it |

Upgrading only the token is not enough to enable governance on an existing suite. Use
`upgrade-token` for the token and `upgrade-ds-contract` for the other two.

```bash
# 1. Deploy the OLD implementation from a worktree at the pre-feature commit
git worktree add ../dstoken-pre 77c1927
ln -s "$PWD/node_modules" ../dstoken-pre/node_modules
(cd ../dstoken-pre && npx hardhat deploy-all --network sepolia --name "Legacy" --symbol LEG --decimals 2)

# 2. Give it realistic activity: issuances, transfers between wallets, a lock,
#    a role grant, and a pause/unpause cycle from the TRANSFER_AGENT wallet.

# 3. Snapshot the pre-upgrade state (run from the main tree — the task tolerates the
#    throttle getters being absent on the old implementation)
npx hardhat token-state --network sepolia --token <proxy> \
  --wallets <w1>,<w2>,<w3> --investors <idA>,<idB> --out before.json

# 4. Upgrade all three proxies in place. Dry-run each with --validate-only first.
npx hardhat upgrade-token       --network sepolia --proxy <dsToken>
npx hardhat upgrade-ds-contract --network sepolia --contract TrustService --proxy <trustService>
npx hardhat upgrade-ds-contract --network sepolia --contract ComplianceConfigurationService --proxy <ccs>

# 5. Confirm nothing moved
npx hardhat token-state --network sepolia --token <proxy> \
  --wallets <w1>,<w2>,<w3> --investors <idA>,<idB> --compare before.json

# 6. Layer scenarios A and B on the UPGRADED token, not a fresh deploy
```

`upgrade-token` runs the OZ layout validation, deploys the implementation, upgrades the proxy,
reports gas for both transactions, and asserts the safe-by-default outcome: `mintCapAmount == 0`,
over-cap parameters unset, and no timelock registered.

`token-state --compare` fails on any drift in balances, investor balances, lock counts, roles,
services, `totalIssued`, `walletCount` or pause state. Storage that the upgrade *adds* reads as
absent-before and `0`-after; that is reported as `[new]` and passes. A new field arriving non-zero
fails, because it would mean the upgrade enabled something.

Also confirm directly: the pre-upgrade TRANSFER_AGENT wallet calling `unpause()` right after the
upgrade must revert on-chain — the modifier change takes effect with no re-initialisation — and
enabling the mint cap afterwards must start `mintedInWindow` at 0, i.e. pre-upgrade issuance
history is not counted retroactively.

### Storage-layout caveat

`.openzeppelin/` is gitignored, so a token deployed from another machine has no local manifest.
`upgrade-token` then falls back to `forceImport`, and if it imports using the *new* factory the OZ
layout diff compares the new layout against itself and proves nothing. The task says so explicitly
when this happens. For a meaningful check, either:

- carry over the original `.openzeppelin` manifest from the machine that deployed the proxy, or
- pass `--baseline <OldContractName>` so the layout is diffed factory-to-factory, and
- diff raw state with `token-state` before/after regardless.

## 4. Reporting

The `--state` JSON files hold every tx hash, gas figure and explorer link; the gas summary printed
at the end of each scenario is the table for the ticket. `setup-governance` and `deploy-timelocks`
print their own totals, including the full handover cost.

On L2s record gas **units** as well as the fee — the fee looks negligible and hides regressions.
