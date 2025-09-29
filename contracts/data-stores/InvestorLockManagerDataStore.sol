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

import {BaseLockManagerDataStore} from "./BaseLockManagerDataStore.sol";

contract InvestorLockManagerDataStore is BaseLockManagerDataStore {
    mapping(string investorId => mapping(uint256 lockId => Lock lock)) internal investorsLocks;
    mapping(string investorId => uint256 count) internal investorsLocksCounts;
    mapping(string investorId => bool locked) internal investorsLocked;
    mapping(string investorId => mapping(bytes32 partitionHash => mapping(uint256 lockId => Lock lock))) internal investorsPartitionsLocks;
    mapping(string investorId => mapping(bytes32 partitionHash => uint256 count)) internal investorsPartitionsLocksCounts;
    mapping(string investorId => bool liquidateOnly) internal investorsLiquidateOnly;

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[44] private __gap;
}
