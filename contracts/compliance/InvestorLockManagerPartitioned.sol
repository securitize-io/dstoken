pragma solidity ^0.8.13;

import "./LockManager.sol";
import "./IDSLockManagerPartitioned.sol";
import "./InvestorLockManagerBase.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

// import "../data-stores/LockManagerPartitionedDataStore.sol";

//SPDX-License-Identifier: UNLICENSED
contract InvestorLockManagerPartitioned is IDSLockManagerPartitioned, InvestorLockManagerBase {
    uint256 constant MAX_LOCKS_PER_INVESTOR_PARTITION = 30;

    function initialize() public override(ServiceConsumer, IDSLockManagerPartitioned) initializer forceInitializeFromProxy {
        ServiceConsumer.initialize();
        IDSLockManagerPartitioned.initialize();
        VERSIONS.push(3);
    }

    function createLockForInvestor(string memory _investorId, uint256 _valueLocked, uint256 _reasonCode, string memory _reasonString, uint256 _releaseTime, bytes32 _partition)
        public
        override
        validLock(_valueLocked, _releaseTime)
        onlyIssuerOrAboveOrToken
    {
        uint256 totalLockCount = investorsPartitionsLocksCounts[_investorId][_partition];

        //Only allow MAX_LOCKS_PER_INVESTOR locks per address, to prevent out-of-gas at transfer scenarios
        require(lockCount < MAX_LOCKS_PER_INVESTOR_PARTITION, "Too many locks for this investor partition");

        investorsPartitionsLocks[_investorId][_partition][totalLockCount] = Lock(_valueLocked, _reasonCode, _reasonString, _releaseTime);
        investorsPartitionsLocksCounts[_investorId][_partition] += 1;

        emit HolderLockedPartition(_investorId, _valueLocked, _reasonCode, _reasonString, _releaseTime, _partition);
    }

    function addManualLockRecord(address _to, uint256 _valueLocked, string memory _reason, uint256 _releaseTime, bytes32 _partition) public override {
        require(_to != address(0), "Invalid address");
        createLock(_to, _valueLocked, 0, _reason, _releaseTime, _partition);
    }

    function removeLockRecord(address _to, uint256 _lockIndex, bytes32 _partition) public override returns (bool) {
        //Put the last lock instead of the lock to remove (this will work even with 1 lock in the list)
        require(_to != address(0), "Invalid address");
        string memory investorId = getRegistryService().getInvestor(_to);
        emit UnlockedPartition(
            _to,
            investorsPartitionsLocks[investorId][_partition][_lockIndex].value,
            investorsPartitionsLocks[investorId][_partition][_lockIndex].reason,
            investorsPartitionsLocks[investorId][_partition][_lockIndex].reasonString,
            investorsPartitionsLocks[investorId][_partition][_lockIndex].releaseTime,
            _partition
        );
        return removeLockRecordForInvestor(investorId, _lockIndex, _partition);
    }

    function removeLockRecordForInvestor(string memory _investorId, uint256 _lockIndex, bytes32 _partition) public override onlyIssuerOrAbove returns (bool) {
        //Put the last lock instead of the lock to remove (this will work even with 1 lock in the list)
        uint256 lastLockNumber = investorsPartitionsLocksCounts[_investorId][_partition];

        require(_lockIndex < lastLockNumber, "Index is greater than the number of locks");
        lastLockNumber -= 1;

        //Emit must be done on start ,because we're going to overwrite this value
        emit HolderUnlockedPartition(
            _investorId,
            investorsPartitionsLocks[_investorId][_partition][_lockIndex].value,
            investorsPartitionsLocks[_investorId][_partition][_lockIndex].reason,
            investorsPartitionsLocks[_investorId][_partition][_lockIndex].reasonString,
            investorsPartitionsLocks[_investorId][_partition][_lockIndex].releaseTime,
            _partition
        );
        investorsPartitionsLocks[_investorId][_partition][_lockIndex] = investorsPartitionsLocks[_investorId][_partition][lastLockNumber];

        //delete the last _lock
        delete investorsPartitionsLocks[_investorId][_partition][lastLockNumber];
        investorsPartitionsLocksCounts[_investorId][_partition] = lastLockNumber;

        return true;
    }

    function lockCount(address _who, bytes32 _partition) public view override returns (uint256) {
        require(_who != address(0), "Invalid address");
        return lockCountForInvestor(getRegistryService().getInvestor(_who), _partition);
    }

    function lockCountForInvestor(string memory _investorId, bytes32 _partition) public view override returns (uint256) {
        return investorsPartitionsLocksCounts[_investorId][_partition];
    }

    function lockInfo(address _who, uint256 _lockIndex, bytes32 _partition)
        public
        view
        override
        returns (uint256 reasonCode, string memory reasonString, uint256 value, uint256 autoReleaseTime)
    {
        require(_who != address(0), "Invalid address");
        return lockInfoForInvestor(getRegistryService().getInvestor(_who), _lockIndex, _partition);
    }

    function lockInfoForInvestor(string memory _investorId, uint256 _lockIndex, bytes32 _partition)
        public
        view
        override
        returns (uint256 reasonCode, string memory reasonString, uint256 value, uint256 autoReleaseTime)
    {
        uint256 lastLockNumber = investorsPartitionsLocksCounts[_investorId][_partition];
        require(_lockIndex < lastLockNumber, "Index is greater than the number of locks");

        reasonCode = investorsPartitionsLocks[_investorId][_partition][_lockIndex].reason;
        reasonString = investorsPartitionsLocks[_investorId][_partition][_lockIndex].reasonString;
        value = investorsPartitionsLocks[_investorId][_partition][_lockIndex].value;
        autoReleaseTime = investorsPartitionsLocks[_investorId][_partition][_lockIndex].releaseTime;
    }

    function getTransferableTokens(address _who, uint64 _time, bytes32 _partition) public view override returns (uint256) {
        return getTransferableTokensForInvestor(getRegistryService().getInvestor(_who), _time, _partition);
    }

    function getTransferableTokensForInvestor(string memory _investorId, uint64 _time, bytes32 _partition) public view override returns (uint256) {
        require(_time > 0, "Time must be greater than zero");
        if (investorsLocked[_investorId]) {
            return 0;
        }

        uint256 balanceOfHolderByPartition = getTokenPartitioned().balanceOfInvestorByPartition(_investorId, _partition);

        if (investorsPartitionsLocksCounts[_investorId][_partition] == 0) {
            return balanceOfHolderByPartition;
        }

        uint256 totalLockedTokens = 0;
        for (uint256 i = 0; i < investorsPartitionsLocksCounts[_investorId][_partition]; i++) {
            uint256 autoReleaseTime = investorsPartitionsLocks[_investorId][_partition][i].releaseTime;
            if (autoReleaseTime == 0 || autoReleaseTime > _time) {
                totalLockedTokens = totalLockedTokens.add(investorsPartitionsLocks[_investorId][_partition][i].value);
            }
        }
        //there may be more locked tokens than actual tokens, so the minimum between the two
        return SafeMath.sub(balanceOfHolderByPartition, Math.min(totalLockedTokens, balanceOfHolderByPartition));
    }

    function getTransferableTokens(address _who, uint64 _time) public view override returns (uint256 transferable) {
        require(_time > 0, "Time must be greater than zero");
        uint256 countOfPartitions = getTokenPartitioned().partitionCountOf(_who);
        for (uint256 index = 0; index < countOfPartitions; ++index) {
            transferable = SafeMath.add(transferable, getTransferableTokens(_who, _time, getTokenPartitioned().partitionOf(_who, index)));
        }
    }

    function addManualLockRecord(
        address, /*_to*/
        uint256, /*_valueLocked*/
        string memory, /*_reason*/
        uint256 /*_releaseTime*/
    ) public override {
        revertedFunction();
    }

    function removeLockRecord(
        address, /*_to*/
        uint256 /*_index*/
    ) public override returns (bool) {
        revertedFunction();
    }

    function lockCount(
        address /*_who*/
    ) public pure override returns (uint256) {
        revertedFunction();
    }

    function lockInfo(
        address, /*_who*/
        uint256 /*_index*/
    )
        public
        view
        override
        returns (
            uint256, /*reasonCode*/
            string memory, /*reasonString*/
            uint256, /*value*/
            uint256 /*autoReleaseTime*/
        )
    {
        revertedFunction();
    }

    function createLockForInvestor(
        string memory, /*_investor*/
        uint256, /*_valueLocked*/
        uint256, /*_reasonCode*/
        string memory, /*_reasonString*/
        uint256 /*_releaseTime*/
    ) public override {
        revertedFunction();
    }

    function removeLockRecordForInvestor(
        string memory, /*_investorId*/
        uint256 /*_lockIndex*/
    ) public override returns (bool) {
        revertedFunction();
    }

    function lockInfoForInvestor(
        string memory, /*_investorId*/
        uint256 /*_lockIndex*/
    )
        public
        view
        override
        returns (
            uint256, /*reasonCode*/
            string memory, /*reasonString*/
            uint256, /*value*/
            uint256 /*autoReleaseTime*/
        )
    {
        revertedFunction();
    }

    function lockCountForInvestor(
        string memory /*_investorId*/
    ) public view override returns (uint256) {
        revertedFunction();
    }

    function getTransferableTokensForInvestor(
        string memory, /*_investorId*/
        uint64 /*_time*/
    ) public view override returns (uint256) {
        revertedFunction();
    }

    /*************** Legacy functions ***************/

    function createLockForHolder(string memory _holderId, uint256 _valueLocked, uint256 _reasonCode, string memory _reasonString, uint256 _releaseTime, bytes32 _partition) public override {
        return createLockForInvestor(_holderId, _valueLocked, _reasonCode, _reasonString, _releaseTime, _partition);
    }

    function removeLockRecordForHolder(string memory _holderId, uint256 _lockIndex, bytes32 _partition) public override returns (bool) {
        return removeLockRecordForInvestor(_holderId, _lockIndex, _partition);
    }

    function lockCountForHolder(string memory _holderId, bytes32 _partition) public view override returns (uint256) {
        return lockCountForInvestor(_holderId, _partition);
    }

    function lockInfoForHolder(string memory _holderId, uint256 _lockIndex, bytes32 _partition)
        public
        view
        override
        returns (uint256 reasonCode, string memory reasonString, uint256 value, uint256 autoReleaseTime)
    {
        return lockInfoForInvestor(_holderId, _lockIndex, _partition);
    }

    function getTransferableTokensForHolder(string memory _holderId, uint64 _time, bytes32 _partition) public view override returns (uint256) {
        return getTransferableTokensForInvestor(_holderId, _time, _partition);
    }

    /******************************/

    function createLock(address _to, uint256 _valueLocked, uint256 _reasonCode, string memory _reasonString, uint256 _releaseTime, bytes32 _partition) internal {
        createLockForInvestor(getRegistryService().getInvestor(_to), _valueLocked, _reasonCode, _reasonString, _releaseTime, _partition);
        emit LockedPartition(_to, _valueLocked, _reasonCode, _reasonString, _releaseTime, _partition);
    }

    function revertedFunction() internal pure {
        revert("Must specify partition");
    }

}
