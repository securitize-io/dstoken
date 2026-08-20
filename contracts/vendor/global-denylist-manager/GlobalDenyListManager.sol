/**
 * Copyright 2026 Securitize Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// VENDORED COPY — do not edit directly.
// Source: https://github.com/securitize-io/bc-global-denylist-manager-sc
// Path:   contracts/denylist/GlobalDenyListManager.sol
// Commit: d96f85cfad7a5dfc390e5b56d1ea5aa70caa257a
//
// Copied in (instead of pulled via a git devDependency) because CI runners don't have SSH
// access to the sibling repo. All 4 vendored files were flattened into this one folder, so
// the only change from the original is the relative import paths below (all now "./" —
// otherwise byte-for-byte identical). To pick up a newer version of the sibling repo,
// re-copy these 4 files from the same commit/branch and bump the "Commit:" line above —
// see docs/runbooks/global-denylist-admin.md. Used only by
// test/integration/global-denylist-manager-integration.test.ts, to deploy the real
// contract instead of the trivial contracts/mocks/GlobalDenyListManagerMock.sol used by
// the rest of the compliance-service-permissionless suite. dstoken's own runtime code
// never imports this — it only knows the minimal contracts/compliance/IDSGlobalDenyListManager.sol.

pragma solidity 0.8.22;

import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {IGlobalDenyListManager} from "./IGlobalDenyListManager.sol";
import {BaseRBACContract} from "./BaseRBACContract.sol";
import {GlobalDenyListManagerDataStore} from "./GlobalDenyListManagerDataStore.sol";

contract GlobalDenyListManager is GlobalDenyListManagerDataStore, IGlobalDenyListManager, BaseRBACContract {
    using EnumerableSet for EnumerableSet.AddressSet;

    // Gas-griefing guard for a single bulk tx; not a security control, just a block-limit safety valve.
    uint256 public constant MAX_BULK_SIZE = 200;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public virtual onlyProxy initializer {
        __BaseRBACContract_init();
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    /// @inheritdoc IGlobalDenyListManager
    function isAdmin(address account) public view virtual override returns (bool) {
        return hasRole(DEFAULT_ADMIN_ROLE, account);
    }

    /// @inheritdoc IGlobalDenyListManager
    function changeAdmin(address newAdmin) external virtual override onlyRole(DEFAULT_ADMIN_ROLE) addressNotZero(newAdmin) {
        // Disallow self-targeting: the caller already holds DEFAULT_ADMIN_ROLE (onlyRole
        // above), so _grantRole(self) would be a no-op while _revokeRole(self) still fires,
        // leaving zero admins — bricking every DEFAULT_ADMIN_ROLE-gated function.
        if (newAdmin == _msgSender()) revert CannotTransferAdminToSelf();

        // Grant and revoke are independent statements, not chained with && — if newAdmin
        // already held DEFAULT_ADMIN_ROLE (e.g. a prior direct grantRole call), a
        // short-circuited && would skip revoking the caller entirely, silently leaving two
        // admins with no AdminChanged event. The revoke must always run.
        bool granted = _grantRole(DEFAULT_ADMIN_ROLE, newAdmin);
        bool revoked = _revokeRole(DEFAULT_ADMIN_ROLE, _msgSender());
        if (granted || revoked) {
            emit AdminChanged(newAdmin);
        }
    }

    /// @inheritdoc IGlobalDenyListManager
    function isOperator(address account) public view virtual override returns (bool) {
        return hasRole(OPERATOR_ROLE, account);
    }

    /// @inheritdoc IGlobalDenyListManager
    function addOperator(address operator) external virtual override onlyRole(DEFAULT_ADMIN_ROLE) addressNotZero(operator) {
        if (_grantRole(OPERATOR_ROLE, operator)) {
            emit OperatorAdded(operator);
        }
    }

    function grantRole(bytes32 role, address account) public virtual override onlyRole(DEFAULT_ADMIN_ROLE) addressNotZero(account) {
        if (_grantRole(role, account) && role == OPERATOR_ROLE) {
            emit OperatorAdded(account);
        }
    }

    /// @inheritdoc IGlobalDenyListManager
    function revokeOperator(address account) external override addressNotZero(account) onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_revokeRole(OPERATOR_ROLE, account)) {
            emit OperatorRevoked(account);
        }
    }

    // ─── Views ──────────────────────────────────────────────────────────────

    /// @inheritdoc IGlobalDenyListManager
    function isGloballyDenylisted(address wallet) external view override returns (bool) {
        return _globallyDenylistedWallets.contains(wallet);
    }

    /// @inheritdoc IGlobalDenyListManager
    function getGloballyDenylistedWalletsCount() external view override returns (uint256) {
        return _globallyDenylistedWallets.length();
    }

    // ─── Mutations — OPERATOR_ROLE only, idempotent (no revert on no-op) ────

    /// @inheritdoc IGlobalDenyListManager
    function addToGlobalDenylist(address wallet) external override onlyRole(OPERATOR_ROLE) whenNotPaused addressNotZero(wallet) returns (bool) {
        _addToGlobalDenylist(wallet);
        return true;
    }

    /// @inheritdoc IGlobalDenyListManager
    function removeFromGlobalDenylist(address wallet) external override onlyRole(OPERATOR_ROLE) whenNotPaused returns (bool) {
        _removeFromGlobalDenylist(wallet);
        return true;
    }

    /// @inheritdoc IGlobalDenyListManager
    function addToGlobalDenylistBulk(address[] calldata wallets) external override onlyRole(OPERATOR_ROLE) whenNotPaused returns (bool) {
        if (wallets.length == 0) revert EmptyBatch();
        if (wallets.length > MAX_BULK_SIZE) revert BatchTooLarge();
        for (uint256 i = 0; i < wallets.length; i++) {
            if (wallets[i] == address(0)) revert ZeroAddressInvalid();
            _addToGlobalDenylist(wallets[i]);
        }
        return true;
    }

    /// @inheritdoc IGlobalDenyListManager
    function removeFromGlobalDenylistBulk(address[] calldata wallets) external override onlyRole(OPERATOR_ROLE) whenNotPaused returns (bool) {
        if (wallets.length == 0) revert EmptyBatch();
        if (wallets.length > MAX_BULK_SIZE) revert BatchTooLarge();
        for (uint256 i = 0; i < wallets.length; i++) {
            _removeFromGlobalDenylist(wallets[i]);
        }
        return true;
    }

    // ─── Internal — idempotent, no revert on duplicate/absent ───────────────

    function _addToGlobalDenylist(address wallet) private {
        if (_globallyDenylistedWallets.add(wallet)) {
            emit WalletAddedToGlobalDenylist(wallet, _msgSender());
        }
        // else: already present — silent no-op, idempotent by design
    }

    function _removeFromGlobalDenylist(address wallet) private {
        if (_globallyDenylistedWallets.remove(wallet)) {
            emit WalletRemovedFromGlobalDenylist(wallet, _msgSender());
        }
        // else: not present — silent no-op, idempotent by design
    }
}
