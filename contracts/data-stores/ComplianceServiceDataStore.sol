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

contract ComplianceServiceDataStore is ServiceConsumerDataStore {
    uint256 internal totalInvestors;
    uint256 internal accreditedInvestorsCount;
    uint256 internal usAccreditedInvestorsCount;
    uint256 internal usInvestorsCount;
    uint256 internal jpInvestorsCount;
    mapping(string country => uint256 count) internal euRetailInvestorsCount;
    mapping(string tokenId => uint256 count) internal issuancesCounters;
    mapping(string tokenId => mapping(uint256 issuanceId => uint256 value)) issuancesValues;
    mapping(string tokenId => mapping(uint256 issuanceId => uint256 timestamp)) issuancesTimestamps;

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[41] private __gap;
}
