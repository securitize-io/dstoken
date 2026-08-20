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
// Path:   contracts/denylist/IGlobalDenyListManager.sol
// Commit: d96f85cfad7a5dfc390e5b56d1ea5aa70caa257a
//
// Copied in verbatim (instead of pulled via a git devDependency) because CI runners
// don't have SSH access to the sibling repo. To pick up a newer version of the sibling
// repo, re-copy these 4 files from the same commit/branch and bump the "Commit:" line
// above — see docs/runbooks/global-denylist-admin.md.
//
// Not to be confused with dstoken's own contracts/compliance/IDSGlobalDenyListManager.sol,
// which is a separate, minimal interface dstoken's runtime code actually consumes (only
// the one function it calls). This full interface exists solely so the integration test
// can deploy the REAL GlobalDenyListManager contract below.

pragma solidity 0.8.22;

/**
 * @title Interface for GlobalDenyListManager
 *
 * A single shared wallet denylist, consulted by every permissionless token that wires
 * this contract in as its GLOBAL_DENYLIST_MANAGER service, before each token's own
 * local per-token denylist. Role-based access control mirrors GlobalRegistryService:
 * ADMIN oversees OPERATOR accounts and upgrades; OPERATOR does day-to-day add/remove.
 *
 * Deliberately no full-list enumeration getter: an unbounded array read is a DoS surface
 * if anything ever calls it on-chain, and the value doesn't justify the risk (this mirrors
 * GlobalRegistryService, which exposes no "get all investors" either). Off-chain tooling
 * reconstructs the full set by indexing WalletAddedToGlobalDenylist /
 * WalletRemovedFromGlobalDenylist.
 */
abstract contract IGlobalDenyListManager {
    modifier addressNotZero(address addressToCheck) {
        if (addressToCheck == address(0)) {
            revert ZeroAddressInvalid();
        }
        _;
    }

    /**
     * @notice Emitted when a wallet is added to the global denylist.
     * @param wallet address The wallet that was added.
     * @param sender address The address that performed the action.
     */
    event WalletAddedToGlobalDenylist(address indexed wallet, address indexed sender);

    /**
     * @notice Emitted when a wallet is removed from the global denylist.
     * @param wallet address The wallet that was removed.
     * @param sender address The address that performed the action.
     */
    event WalletRemovedFromGlobalDenylist(address indexed wallet, address indexed sender);

    /**
     * @notice Emitted when the admin account is changed.
     * @param admin address The address of the new admin.
     */
    event AdminChanged(address indexed admin);

    /**
     * @notice Emitted when a new Operator is added.
     * @param operator address The address granted the Operator role.
     */
    event OperatorAdded(address indexed operator);

    /**
     * @notice Emitted when an Operator is revoked.
     * @param operator address The address revoked the Operator role.
     */
    event OperatorRevoked(address indexed operator);

    /// @dev Thrown when a zero address is provided where a valid address is required.
    /// @custom:selector 0x14c880ca
    error ZeroAddressInvalid();

    /// @dev Thrown when changeAdmin is called with the caller's own address — a no-op grant
    /// combined with a real revoke would leave the contract with zero admins.
    /// @custom:selector 0xf36578a2
    error CannotTransferAdminToSelf();

    /// @dev Thrown when a bulk batch exceeds the configured maximum size.
    /// @custom:selector 0x0b7d62e2
    error BatchTooLarge();

    /// @dev Thrown when a bulk batch is empty — an empty batch is never a meaningful
    /// request and would otherwise succeed silently with zero events, indistinguishable
    /// from an idempotent no-op.
    /// @custom:selector 0xc2e5347d
    error EmptyBatch();

    /// @dev Constant role identifier for the operator role.
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    /**
     * @notice Checks whether a wallet is on the global denylist.
     * @param wallet address The wallet to check.
     * @return True if the wallet is globally denylisted.
     */
    function isGloballyDenylisted(address wallet) external view virtual returns (bool);

    /**
     * @notice Returns how many wallets are currently on the global denylist.
     */
    function getGloballyDenylistedWalletsCount() external view virtual returns (uint256);

    /**
     * @notice Adds a wallet to the global denylist. Idempotent: a no-op (no revert, no
     * event) if the wallet is already denylisted.
     * @param wallet address The wallet to add.
     * @return True on success.
     */
    function addToGlobalDenylist(address wallet) external virtual returns (bool);

    /**
     * @notice Removes a wallet from the global denylist. Idempotent: a no-op (no revert,
     * no event) if the wallet isn't on the list.
     * @param wallet address The wallet to remove.
     * @return True on success.
     */
    function removeFromGlobalDenylist(address wallet) external virtual returns (bool);

    /**
     * @notice Bulk-adds wallets to the global denylist. Reverts the whole batch if any
     * entry is the zero address; otherwise idempotent per-wallet like addToGlobalDenylist.
     * @param wallets address[] The wallets to add.
     * @return True on success.
     */
    function addToGlobalDenylistBulk(address[] calldata wallets) external virtual returns (bool);

    /**
     * @notice Bulk-removes wallets from the global denylist. Idempotent per-wallet like
     * removeFromGlobalDenylist.
     * @param wallets address[] The wallets to remove.
     * @return True on success.
     */
    function removeFromGlobalDenylistBulk(address[] calldata wallets) external virtual returns (bool);

    /**
     * @notice Checks if an account holds the Operator role.
     * @param account address The address to check for the Operator role.
     * @return True if the account has the Operator role, false otherwise.
     */
    function isOperator(address account) public view virtual returns (bool);

    /**
     * @notice Checks if an account holds the Admin role.
     * @param account address The address to check for the Admin role.
     * @return True if the account has the Admin role, false otherwise.
     */
    function isAdmin(address account) public view virtual returns (bool);

    /**
     * @notice Changes the admin of the Global Denylist Manager.
     * @dev Updates the admin address. Emits {AdminChanged}.
     * @param newAdmin address The address of the new admin.
     */
    function changeAdmin(address newAdmin) external virtual;

    /**
     * @notice Grants the Operator role to a specified account.
     * @dev Adds a new Operator. Emits {OperatorAdded}.
     * @param account address The address to grant the Operator role.
     */
    function addOperator(address account) external virtual;

    /**
     * @notice Revokes the Operator role from a specified account.
     * @dev Revokes an Operator. Emits {OperatorRevoked}.
     * @param account address The address to revoke the Operator role.
     */
    function revokeOperator(address account) external virtual;
}
