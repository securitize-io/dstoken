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

pragma solidity ^0.8.20;

import "./ServiceConsumerDataStore.sol";
import '../token/TokenPartitionsLibrary.sol';
import '../token/TokenLibrary.sol';

contract TokenDataStore is ServiceConsumerDataStore {

    TokenLibrary.TokenData internal tokenData;
    mapping(address => mapping(address => uint256)) internal allowances;
    mapping(uint256 => address) internal walletsList;
    uint256 internal walletsCount;
    mapping(address => uint256) internal walletsToIndexes;
    TokenPartitionsLibrary.TokenPartitions internal partitionsManagement;
    uint256 public cap;
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
