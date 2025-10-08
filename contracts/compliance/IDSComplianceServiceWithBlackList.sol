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

import {IDSComplianceService} from "./IDSComplianceService.sol";

/**
 * @title Interface for compliance service with blacklist functionality
 *
 * This interface defines blacklist functionality for compliance services.
 * Blacklisted wallets are prevented from receiving tokens through transfers or issuances,
 * while maintaining all existing compliance functionality.
 */
interface IDSComplianceServiceWithBlackList {
    // Events
    event WalletAddedToBlacklist(address indexed wallet, string reason, address indexed admin);
    event WalletRemovedFromBlacklist(address indexed wallet, address indexed admin);

    // View functions
    function isBlacklisted(address _wallet) external view returns (bool);
    function getBlacklistedWalletsCount() external view returns (uint256);
    function getBlacklistedWallets() external view returns (address[] memory);
    function getBlacklistReason(address _wallet) external view returns (string memory);

    // State-changing functions
    function addToBlacklist(address _wallet, string calldata _reason) external returns (bool);
    function removeFromBlacklist(address _wallet) external returns (bool);
    function batchAddToBlacklist(address[] calldata _wallets, string[] calldata _reasons) external returns (bool);
    function batchRemoveFromBlacklist(address[] calldata _wallets) external returns (bool);
}