/**
 * Copyright 2025 Securitize Inc. All rights reserved.
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

pragma solidity 0.8.22;

/**
 * @title Interface for BlackListManager
 *
 * This interface defines functionality for managing blacklisted wallets.
 * Blacklisted wallets are prevented from receiving tokens through transfers or issuances.
 */
abstract contract IDSBlackListManager {
    function initialize() public virtual;

    // Events
    event WalletAddedToBlacklist(address indexed wallet, string reason, address indexed admin);
    event WalletRemovedFromBlacklist(address indexed wallet, address indexed admin);

    // Custom errors
    /// @dev Thrown when a wallet is already blacklisted
    /// @custom:selector 0xb59c1958
    error WalletAlreadyBlacklisted();
    /// @dev Thrown when a wallet is not blacklisted
    /// @custom:selector 0xfae0e716
    error WalletNotBlacklisted();
    /// @dev Thrown when the zero address is used
    /// @custom:selector 0x14c880ca
    error ZeroAddressInvalid();
    /// @dev Thrown when the lengths of the arrays do not match
    /// @custom:selector 0xfc235960
    error ArraysLengthMismatch();

    // View functions
    function isBlacklisted(address _wallet) external view virtual returns (bool);

    function getBlacklistedWalletsCount() external view virtual returns (uint256);

    function getBlacklistedWallets() external view virtual returns (address[] memory);

    function getBlacklistReason(address _wallet) external view virtual returns (string memory);

    // State-changing functions
    function addToBlacklist(address _wallet, string calldata _reason) external virtual returns (bool);

    function removeFromBlacklist(address _wallet) external virtual returns (bool);

    function batchAddToBlacklist(address[] calldata _wallets, string[] calldata _reasons) external virtual returns (bool);

    function batchRemoveFromBlacklist(address[] calldata _wallets) external virtual returns (bool);
}
