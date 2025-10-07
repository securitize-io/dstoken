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
import {TokenLibrary} from '../token/TokenLibrary.sol';

contract TokenDataStore is ServiceConsumerDataStore {

    TokenLibrary.TokenData internal tokenData;
    mapping(address owner => mapping(address spender => uint256 allowance)) internal allowances;
    mapping(uint256 index => address wallet) internal walletsList;
    uint256 internal walletsCount;
    mapping(address wallet => uint256 index) internal walletsToIndexes;
    // These two variables replace the 2-slot TokenPartitions struct to preserve storage layout
    address internal DEPRECATED_PARTITIONS_WALLETS;
    address internal DEPRECATED_PARTITIONS_BALANCES;
    uint256 public DEPRECATED_CAP;
    string public name;
    string public symbol;
    uint8 public decimals;
    TokenLibrary.SupportedFeatures public supportedFeatures;
    bool internal paused;

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[35] private __gap;
}
