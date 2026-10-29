# Shared Global Blacklist Runbook

## Overview

GlobalWhitelisted tokens (GRS / X Layer / CETs) stop using a per-token local blacklist and all
point their `BLACKLIST_MANAGER` service (id `8197`) at **one shared `BlackListManager` per chain**,
the "CET Global blacklist". Blacklisting a wallet there blocks it on every token wired to it.

**No contract changes.** This works with the existing contracts because a `BlackListManager` holds
no reference to any token: it only uses its own `TrustService` to authorize `addToBlacklist` /
`removeFromBlacklist` (`onlyTransferAgentOrAbove`). Any number of tokens can read the same instance.

Not to be confused with the `GLOBAL_DENYLIST_MANAGER` (id `8201`, permissionless tokens,
separate repo) — see [`global-denylist-admin.md`](./global-denylist-admin.md).

## Where service 8197 is read

Each contract keeps its own service map, so `8197` lives in **two** places per token:

| Map | Read by |
|---|---|
| `DSToken.getDSService(8197)` | The TSV checker |
| `ComplianceService.getDSService(8197)` | `ComplianceServiceGlobalWhitelisted` on every transfer, issuance, `checkWhitelisted` and spender check |

Both must point at the same address. If they diverge, the checker and the token disagree (e.g. the
checker reports a wallet as blocked while transfers still go through, or the reverse).

## Tasks

| Task | Sends transactions | Purpose |
|---|---|---|
| `deploy-global-blacklist` | yes | Deploy the shared `BlackListManager` with its own dedicated `TrustService` |
| `migrate-token-blacklist` | only with `--execute` | Copy a token's local entries to the shared list, then repoint both `8197` maps |
| `verify-blacklist-wiring` | no | Assert both `8197` maps agree (and equal the shared list) on a set of tokens |

### 1. `deploy-global-blacklist`

```bash
npx hardhat deploy-global-blacklist --network <net> \
  --master 0xMASTER \
  --transfer-agents 0xTA1,0xTA2 \
  --owner 0xOWNER
```

| Param | Required | Meaning |
|---|---|---|
| `--master` | yes | Becomes `MASTER` of the dedicated TrustService |
| `--transfer-agents` | no | Comma-separated, granted `TRANSFER_AGENT` (can add/remove wallets). Must not include `--master` |
| `--owner` | no | Becomes `owner()` of the BlackListManager. The signer keeps it if omitted |
| `--trust-service` | no | Resume: reuse an already deployed TrustService |
| `--blacklist-manager` | no | Resume: reuse an already deployed BlackListManager |

Steps, in order:

1. Validate every address (and that resume addresses have code) before sending anything.
2. Deploy `TrustService` and `BlackListManager` proxies (the signer becomes MASTER and owner).
3. `blacklistManager.setDSService(TRUST_SERVICE, trustService)`.
4. Grant `TRANSFER_AGENT` to each `--transfer-agents` address.
5. Move `MASTER` to `--master` (`setServiceOwner`; the signer's role becomes `NONE`). Done last
   because the steps above need the signer to be MASTER.
6. Move `owner()` of the BlackListManager to `--owner`.

It prints the proxy and implementation addresses of both contracts.

**Do not list the signer in `--transfer-agents`.** The signer is MASTER while the task runs, and
TrustService does not allow a direct MASTER → TRANSFER_AGENT change, so the task skips it there.
When `--master` is a different address, step 5 then sets the signer's role to `NONE`: the task
finishes without errors but the signer cannot add or remove wallets. Use a different wallet as
transfer agent, or have the new MASTER grant the role to the signer afterwards.

**Resuming.** Each step reads on-chain state first and is skipped if already done, so a second run
with the same params is a no-op. If a run dies after deploying, re-run passing the addresses it
printed via `--trust-service` / `--blacklist-manager` instead of deploying new ones.

**One in-flight transaction.** Some RPCs (e.g. Sepolia with EIP-7702 delegated accounts) accept a
single pending transaction per account. Before every send the task waits until the signer has no
pending transactions (`waitUntilIdle`, 120s timeout); on timeout it fails with the nonces and the
resume instructions.

### 2. `migrate-token-blacklist`

```bash
# dry run (default): prints target + calldata of each call, sends nothing
npx hardhat migrate-token-blacklist --network <net> --token 0xDSTOKEN --global 0xGLOBAL_BLM

# send them from the signer
npx hardhat migrate-token-blacklist --network <net> --token 0xDSTOKEN --global 0xGLOBAL_BLM --execute true
```

Per token:

1. Read `8197` from the token and from its compliance service (`8`).
2. Collect every wallet (with its reason) from those current lists, and keep the ones missing on
   the global list.
3. Plan, **in this order**:
   - `global.addToBlacklist(wallet, reason)` for each missing wallet
   - `token.setDSService(8197, global)` if not already pointing there
   - `compliance.setDSService(8197, global)` if not already pointing there

Entries are copied **before** repointing, so the token is never wired to a list that is missing a
wallet it used to block. With `--execute` the calls run sequentially and stop at the first failure,
so a failed copy never reaches the repoint. Re-running is safe: wallets already present and maps
already repointed are skipped.

**Signers.** The calls need two different authorities:

| Calls | Required on |
|---|---|
| `addToBlacklist` | `TRANSFER_AGENT` or `MASTER` on the **global list's** TrustService |
| `setDSService` (token and compliance) | `MASTER` on the **token's** TrustService, or `owner()` of each contract |

`--execute` only works when one signer holds both, typically on testnet. On mainnet the masters are
Fireblocks wallets: run the dry run, submit the printed calldata from the right wallet for each
call, and keep the order (all `addToBlacklist` confirmed before any `setDSService`).

**Freeze local lists during the migration.** Wallets added to a token's local list after its copy
step and before its repoint would not be on the global list. Re-run the dry run right before
repointing: it should only list the two `setDSService` calls.

### 3. `verify-blacklist-wiring`

```bash
npx hardhat verify-blacklist-wiring --network <net> \
  --tokens 0xTOKEN_A,0xTOKEN_B --global 0xGLOBAL_BLM
```

Read-only. For each token reports `OK` or `MISMATCH` with the reason:

- compliance service (`8`) not set, or wiring not readable
- token `8197` not set
- token `8197` and compliance `8197` differ
- either one differs from `--global` (when given)

Throws if any token fails, so it can gate a script or CI. Without `--global` it only checks that
both maps agree, which also works for tokens still on a local list.

## Full procedure (per chain)

1. `deploy-global-blacklist` with the chosen MASTER, transfer agents and owner. Record the
   addresses.
2. For each GRS / X Layer / CET token on that chain: `migrate-token-blacklist` dry run, review,
   then execute (or submit through Fireblocks in the printed order).
3. `verify-blacklist-wiring --tokens <all migrated tokens> --global <shared list>`.
4. Testnet first, then mainnet.

New GlobalWhitelisted tokens are wired to the shared list at deploy time by
`bc-deployment-task-svc` (Blacklist dropdown: Local or an existing global list), not by these tasks.

## Security considerations

- **The dedicated TrustService decides who can blacklist on every wired token.** Choose `MASTER`
  and the transfer agents deliberately; a wrong entry blocks a wallet on all tokens at once.
- **Transfer agents can grant `TRANSFER_AGENT`.** With no roles governor set, `TrustService.setRole`
  is allowed for MASTER, ISSUER or TRANSFER_AGENT (each limited to its own role), so any transfer
  agent can add more transfer agents. Set a roles governor (`setRolesGovernor`, onlyMaster) to
  restrict this to the governor and MASTER.
- **Two principals can upgrade the BlackListManager:** its `owner()` and the `MASTER` of its
  TrustService (`onlyMaster` gates `_authorizeUpgrade` and `setDSService`). If `--owner` is omitted
  the deployer keeps `owner()`, so pass it on any non-test deployment.
- **Not owned by any token.** The shared list must never be handed over as part of one token's
  governance (`setup-governance --handover`): it would give that token's master timelock control
  over a contract every other token depends on. See *Contracts that must NOT be handed over* in
  [`tasks/README.md`](../../tasks/README.md).
- **Rollback.** A token can be pointed back to its old local list with the same two
  `setDSService` calls. Wallets added only to the shared list after the migration would not be on
  the old list.
