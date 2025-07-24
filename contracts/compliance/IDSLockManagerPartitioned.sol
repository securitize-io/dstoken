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

import "./IDSLockManager.sol";

abstract contract IDSLockManagerPartitioned {

    event LockedPartition(address indexed who, uint256 value, uint256 indexed reason, string reasonString, uint256 releaseTime, bytes32 indexed partition);
    event UnlockedPartition(address indexed who, uint256 value, uint256 indexed reason, string reasonString, uint256 releaseTime, bytes32 indexed partition);
    event HolderLockedPartition(string investorId, uint256 value, uint256 indexed reason, string reasonString, uint256 releaseTime, bytes32 indexed partition);
    event HolderUnlockedPartition(string investorId, uint256 value, uint256 indexed reason, string reasonString, uint256 releaseTime, bytes32 indexed partition);

    function createLockForInvestor(
        string memory _investorId,
        uint256 _valueLocked,
        uint256 _reasonCode,
        string memory _reasonString,
        uint256 _releaseTime,
        bytes32 _partition
    ) public virtual;

    function addManualLockRecord(
        address _to,
        uint256 _valueLocked,
        string memory _reason,
        uint256 _releaseTime,
        bytes32 _partition /*issuerOrAboveOrToken*/
    ) public virtual;

    function removeLockRecord(
        address _to,
        uint256 _lockIndex,
        bytes32 _partition /*issuerOrAbove*/
    ) public virtual returns (bool);

    function removeLockRecordForInvestor(
        string memory _investorId,
        uint256 _lockIndex,
        bytes32 _partition /*issuerOrAbove*/
    ) public virtual returns (bool);

    function lockCount(address _who, bytes32 _partition) public view virtual returns (uint256);

    function lockInfo(
        address _who,
        uint256 _lockIndex,
        bytes32 _partition
    )
        public
        view
        virtual
        returns (
            uint256 reasonCode,
            string memory reasonString,
            uint256 value,
            uint256 autoReleaseTime
        );

    function lockCountForInvestor(string memory _investorId, bytes32 _partition) public view virtual returns (uint256);

    function lockInfoForInvestor(
        string memory _investorId,
        uint256 _lockIndex,
        bytes32 _partition
    )
        public
        view
        virtual
        returns (
            uint256 reasonCode,
            string memory reasonString,
            uint256 value,
            uint256 autoReleaseTime
        );

    function getTransferableTokens(
        address _who,
        uint256 _time,
        bytes32 _partition
    ) public view virtual returns (uint256);

    function getTransferableTokensForInvestor(
        string memory _investorId,
        uint256 _time,
        bytes32 _partition
    ) public view virtual returns (uint256);

    /*************** Legacy functions ***************/
    function createLockForHolder(
        string memory _investorId,
        uint256 _valueLocked,
        uint256 _reasonCode,
        string memory _reasonString,
        uint256 _releaseTime,
        bytes32 _partition
    ) public virtual;

    function removeLockRecordForHolder(
        string memory _investorId,
        uint256 _lockIndex,
        bytes32 _partition
    ) public virtual returns (bool);

    function lockCountForHolder(string memory _holderId, bytes32 _partition) public view virtual returns (uint256);

    function lockInfoForHolder(
        string memory _holderId,
        uint256 _lockIndex,
        bytes32 _partition
    )
        public
        view
        virtual
        returns (
            uint256 reasonCode,
            string memory reasonString,
            uint256 value,
            uint256 autoReleaseTime
        );

    function getTransferableTokensForHolder(
        string memory _holderId,
        uint256 _time,
        bytes32 _partition
    ) public view virtual returns (uint256);

    /******************************/
}
