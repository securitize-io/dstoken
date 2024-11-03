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

import "./IDSPartitionsManager.sol";
import "../data-stores/PartitionsManagerDataStore.sol";
import "../utils/BaseDSContract.sol";

contract PartitionsManager is IDSPartitionsManager, PartitionsManagerDataStore, BaseDSContract {

    function initialize() public override onlyProxy initializer {
        __BaseDSContract_init();
    }

    function ensurePartition(uint256 _issuanceDate, uint256 _region) public override onlyIssuerOrAboveOrToken returns (bytes32 partition) {
        partition = keccak256(abi.encodePacked(_issuanceDate, _region));

        if (getPartitionIssuanceDate(partition) == 0) {
            partitions[partition] = Partition(_issuanceDate, _region);
            emit PartitionCreated(_issuanceDate, _region, partition);
        }
    }

    function getPartition(bytes32 _partition) public view override returns (uint256 issuancedate, uint256 region) {
        return (partitions[_partition].issuanceDate, partitions[_partition].region);
    }

    function getPartitionIssuanceDate(bytes32 _partition) public view override returns (uint256) {
        return partitions[_partition].issuanceDate;
    }

    function getPartitionRegion(bytes32 _partition) public view override returns (uint256) {
        return partitions[_partition].region;
    }

}
