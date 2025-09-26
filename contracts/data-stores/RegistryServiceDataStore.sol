/**
 * Copyright 2024 Securitize Inc. All rights reserved.
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

import "./ServiceConsumerDataStore.sol";

contract RegistryServiceDataStore is ServiceConsumerDataStore {
    struct Attribute {
        uint256 value;
        uint256 expiry;
        string proofHash;
    }

    struct Wallet {
        string owner;
        address creator;
        address lastUpdatedBy;
    }

    struct Investor {
        string id;
        string collisionHash;
        address creator;
        address lastUpdatedBy;
        string country;
        uint256 walletCount;
        // Mappings outside Storage
        // Ref: https://docs.soliditylang.org/en/v0.7.1/070-breaking-changes.html#mappings-outside-storage
        // mapping(uint8 => Attribute) attributes;
    }

    mapping(string investorId => Investor investor) internal investors;
    mapping(address walletAddress => Wallet wallet) internal investorsWallets;

    /**
     * @dev DEPRECATED: This mapping is no longer used but must be kept for storage layout compatibility in the proxy.
     * Do not use this mapping in new code. It will be removed in future non-proxy implementations.
     * The interface type has been replaced with address to remove the interface dependency.
     */
    mapping(address wallet => address controller) internal DEPRECATED_omnibusWalletsControllers;

    mapping(string investorId => mapping(uint8 attributeId => Attribute attribute)) public attributes;

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[46] private __gap;
}
