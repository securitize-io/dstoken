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

abstract contract IDSLockManager {

    function initialize() public virtual;

    modifier validLock(uint256 _valueLocked, uint256 _releaseTime) {
        require(_valueLocked > 0, "Value is zero");
        require(_releaseTime == 0 || _releaseTime > uint256(block.timestamp), "Release time is in the past");
        _;
    }

    event Locked(address indexed who, uint256 value, uint256 indexed reason, string reasonString, uint256 releaseTime);
    event Unlocked(address indexed who, uint256 value, uint256 indexed reason, string reasonString, uint256 releaseTime);

    event HolderLocked(string holderId, uint256 value, uint256 indexed reason, string reasonString, uint256 releaseTime);
    event HolderUnlocked(string holderId, uint256 value, uint256 indexed reason, string reasonString, uint256 releaseTime);
    /**
     * @dev creates a lock record for wallet address
     * @param _to address to lock the tokens at
     * @param _valueLocked value of tokens to lock
     * @param _reason reason for lock
     * @param _releaseTime timestamp to release the lock (or 0 for locks which can only released by an unlockTokens call)
     * Note: The user MAY have at a certain time more locked tokens than actual tokens
     */

    function addManualLockRecord(
        address _to,
        uint256 _valueLocked,
        string calldata _reason,
        uint256 _releaseTime /*issuerOrAboveOrToken*/
    ) public virtual;

    /**
     * @dev creates a lock record for investor Id
     * @param _investor investor id to lock the tokens at
     * @param _valueLocked value of tokens to lock
     * @param _reasonCode reason code for lock
     * @param _reasonString reason for lock
     * @param _releaseTime timestamp to release the lock (or 0 for locks which can only released by an unlockTokens call)
     * Note: The user MAY have at a certain time more locked tokens than actual tokens
     */

    function createLockForInvestor(
        string memory _investor,
        uint256 _valueLocked,
        uint256 _reasonCode,
        string calldata _reasonString,
        uint256 _releaseTime /*onlyIssuerOrAboveOrToken*/
    ) public virtual;

    /**
     * @dev Releases a specific lock record for a wallet
     * @param _to address to release the tokens for
     * @param _lockIndex the index of the lock to remove
     *
     * note - this may change the order of the locks on an address, so if iterating the iteration should be restarted.
     * @return true on success
     */
    function removeLockRecord(
        address _to,
        uint256 _lockIndex /*issuerOrAbove*/
    ) public virtual returns (bool);

    /**
     * @dev Releases a specific lock record for a investor
     * @param _investorId investor id to release the tokens for
     * @param _lockIndex the index of the lock to remove
     *
     * note - this may change the order of the locks on an address, so if iterating the iteration should be restarted.
     * @return true on success
     */
    function removeLockRecordForInvestor(
        string memory _investorId,
        uint256 _lockIndex /*onlyIssuerOrAbove*/
    ) public virtual returns (bool);

    /**
     * @dev Get number of locks currently associated with an address
     * @param _who address to get count for
     *
     * @return number of locks
     *
     * Note - a lock can be inactive (due to its time expired) but still exists for a specific address
     */
    function lockCount(address _who) public view virtual returns (uint256);

    /**
     * @dev Get number of locks currently associated with a investor
     * @param _investorId investor id to get count for
     *
     * @return number of locks
     *
     * Note - a lock can be inactive (due to its time expired) but still exists for a specific address
     */

    function lockCountForInvestor(string calldata _investorId) public view virtual returns (uint256);

    /**
     * @dev Get details of a specific lock associated with an address
     * can be used to iterate through the locks of a user
     * @param _who address to get token lock for
     * @param _lockIndex the 0 based index of the lock.
     * @return reasonCode the reason code
     * @return reasonString the reason for the lock
     * @return value the value of tokens locked
     * @return autoReleaseTime the timestamp in which the lock will be inactive (or 0 if it's always active until removed)
     *
     * Note - a lock can be inactive (due to its time expired) but still exists for a specific address
     */
    function lockInfo(address _who, uint256 _lockIndex) public view virtual returns (uint256 reasonCode, string memory reasonString, uint256 value, uint256 autoReleaseTime);

    /**
     * @dev Get details of a specific lock associated with a investor
     * can be used to iterate through the locks of a user
     * @param _investorId investorId to get token lock for
     * @param _lockIndex the 0 based index of the lock.
     * @return reasonCode the reason code
     * @return reasonString the reason for the lock
     * @return value the value of tokens locked
     * @return autoReleaseTime the timestamp in which the lock will be inactive (or 0 if it's always active until removed)
     *
     * Note - a lock can be inactive (due to its time expired) but still exists for a specific address
     */
    function lockInfoForInvestor(
        string memory _investorId,
        uint256 _lockIndex
    ) public view virtual  returns (uint256 reasonCode, string memory reasonString, uint256 value, uint256 autoReleaseTime);

    /**
     * @dev get total number of transferable tokens for a wallet, at a certain time
     * @param _who address to get number of transferable tokens for
     * @param _time time to calculate for
     */
    function getTransferableTokens(address _who, uint256 _time) public view virtual returns (uint256);

    /**
     * @dev get total number of transferable tokens for a investor, at a certain time
     * @param _investorId investor id
     * @param _time time to calculate for
     */
    function getTransferableTokensForInvestor(string memory _investorId, uint256 _time) public view virtual returns (uint256);

    /**
     * @dev pause investor
     * @param _investorId investor id
     */
    function lockInvestor(
        string calldata _investorId /*issuerOrAbove*/
    ) public virtual returns (bool);

    /**
     * @dev unpauses investor
     * @param _investorId investor id
     */
    function unlockInvestor(
        string calldata _investorId /*issuerOrAbove*/
    ) public virtual returns (bool);

    /**
     * @dev Returns true if paused, otherwise false
     * @param _investorId investor id
     */
    function isInvestorLocked(string calldata _investorId) public view virtual returns (bool);

    /**
     * @dev set investor to liquidate only mode
     * @param _investorId investor id
     * @param _enabled true to enable, false to disable
     */
    function setInvestorLiquidateOnly(string memory _investorId, bool _enabled) public virtual returns (bool);

    /**
     * @dev Returns true if the investor is in liquidate only mode
     * @param _investorId investor id
     */
    function isInvestorLiquidateOnly(string calldata _investorId) public view virtual returns (bool);
}
