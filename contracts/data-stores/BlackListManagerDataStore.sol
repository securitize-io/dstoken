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

import {ServiceConsumerDataStore} from "./ServiceConsumerDataStore.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/**
 * @title Data store for BlackListManager
 *
 * This contract stores blacklist-related state variables following the project's
 * data store pattern for upgradeability and maintainability.
 */
contract BlackListManagerDataStore is ServiceConsumerDataStore {
    using EnumerableSet for EnumerableSet.AddressSet;

    // Blacklist state variables
    EnumerableSet.AddressSet internal _blacklistedWallets;
    mapping(address wallet => string reason) internal _blacklistReasons;

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * Calculated based on the complete inheritance hierarchy:
     * - ServiceConsumerDataStore: 1 slot (services mapping)
     * - Blacklist variables: 2 slots (1 EnumerableSet + 1 mapping)
     * - Total: 3 slots used, leaving 45 for future expansion
     */
    uint256[45] private __gap;
}
