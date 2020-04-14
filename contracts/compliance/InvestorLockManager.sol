pragma solidity ^0.5.0;

import "./IDSLockManager.sol";
import "../data-stores/InvestorLockManagerDataStore.sol";
import "../utils/ProxyTarget.sol";
import "../service/ServiceConsumer.sol";
import "../zeppelin/math/Math.sol";

contract InvestorLockManager is ProxyTarget, Initializable, IDSLockManager, ServiceConsumer, InvestorLockManagerDataStore {
    uint256 constant MAX_LOCKS_PER_INVESTOR = 30;

    /*************** Legacy functions ***************/
    function createLockForHolder(string memory _holder, uint256 _valueLocked, uint256 _reasonCode, string memory _reasonString, uint256 _releaseTime) public {
        createLockForInvestor(_holder, _valueLocked, _reasonCode, _reasonString, _releaseTime);
    }

    function removeLockRecordForHolder(string memory _holderId, uint256 _lockIndex) public returns (bool) {
        return removeLockRecordForInvestor(_holderId, _lockIndex);
    }

    function lockCountForHolder(string memory _holderId) public view returns (uint256) {
        return lockCountForInvestor(_holderId);
    }

    function lockInfoForHolder(string memory _holderId, uint256 _lockIndex)
        public
        view
        returns (uint256 reasonCode, string memory reasonString, uint256 value, uint256 autoReleaseTime)
    {
        return lockInfoForInvestor(_holderId, _lockIndex);
    }

    function getTransferableTokensForHolder(string memory _holderId, uint64 _time) public view returns (uint256) {
        return getTransferableTokensForInvestor(_holderId, _time);
    }

    /******************************/

    function initialize() public initializer onlyFromProxy {
        IDSLockManager.initialize();
        ServiceConsumer.initialize();

        VERSIONS.push(2);
    }

    function setLockInfoImpl(string memory _investor, uint256 _lockIndex, uint256 _valueLocked, uint256 _reasonCode, string memory _reasonString, uint256 _releaseTime) internal {
        investorsLocks[_investor][_lockIndex] = Lock(_valueLocked, _reasonCode, _reasonString, _releaseTime);
    }

    function createLockForInvestor(string memory _investor, uint256 _valueLocked, uint256 _reasonCode, string memory _reasonString, uint256 _releaseTime)
        public
        validLock(_valueLocked, _releaseTime)
        onlyIssuerOrAboveOrToken
    {
        //Get total count
        uint256 lockCount = investorsLocksCounts[_investor];
        //Only allow MAX_LOCKS_PER_INVESTOR locks per address, to prevent out-of-gas at transfer scenarios
        require(lockCount < MAX_LOCKS_PER_INVESTOR, "Too many locks for this investor");
        setLockInfoImpl(_investor, lockCount, _valueLocked, _reasonCode, _reasonString, _releaseTime);
        lockCount += 1;
        investorsLocksCounts[_investor] = lockCount;
        emit HolderLocked(_investor, _valueLocked, _reasonCode, _reasonString, _releaseTime);
    }

    function createLock(address _to, uint256 _valueLocked, uint256 _reasonCode, string memory _reasonString, uint256 _releaseTime) internal {
        createLockForInvestor(getRegistryService().getInvestor(_to), _valueLocked, _reasonCode, _reasonString, _releaseTime);
        emit Locked(_to, _valueLocked, _reasonCode, _reasonString, _releaseTime);
    }

    function addManualLockRecord(address _to, uint256 _valueLocked, string memory _reason, uint256 _releaseTime) public onlyIssuerOrAboveOrToken {
        require(_to != address(0));
        createLock(_to, _valueLocked, 0, _reason, _releaseTime);
    }

    function removeLockRecordForInvestor(string memory _investorId, uint256 _lockIndex) public onlyIssuerOrAbove returns (bool) {
        emit HolderUnlocked(
            _investorId,
            investorsLocks[_investorId][_lockIndex].value,
            investorsLocks[_investorId][_lockIndex].reason,
            investorsLocks[_investorId][_lockIndex].reasonString,
            investorsLocks[_investorId][_lockIndex].releaseTime
        );

        //Put the last lock instead of the lock to remove (this will work even with 1 lock in the list)
        uint256 lastLockNumber = investorsLocksCounts[_investorId];
        require(_lockIndex < lastLockNumber, "Index is greater than the number of locks");
        lastLockNumber -= 1;

        //Move the lock
        uint256 reasonCode = investorsLocks[_investorId][lastLockNumber].reason;
        setLockInfoImpl(
            _investorId,
            _lockIndex,
            investorsLocks[_investorId][lastLockNumber].value,
            reasonCode,
            investorsLocks[_investorId][lastLockNumber].reasonString,
            investorsLocks[_investorId][lastLockNumber].releaseTime
        );

        //delete the last _lock
        //Remove from reverse index
        delete investorsLocks[_investorId][lastLockNumber];

        //decrease the lock counter for the user
        investorsLocksCounts[_investorId] = lastLockNumber;

        return true;
    }

    /**
     * @dev Releases a specific lock record
     * @param _to address to release the tokens for
     * @param _lockIndex the index of the lock
     *
     * note - this may change the order of the locks on an address, so if iterating the iteration should be restarted.
     * @return true on success
     */
    function removeLockRecord(address _to, uint256 _lockIndex) public onlyIssuerOrAbove returns (bool) {
        require(_to != address(0));
        string memory investor = getRegistryService().getInvestor(_to);
        //Emit must be done on start ,because we're going to overwrite this value
        emit Unlocked(
            _to,
            investorsLocks[investor][_lockIndex].value,
            investorsLocks[investor][_lockIndex].reason,
            investorsLocks[investor][_lockIndex].reasonString,
            investorsLocks[investor][_lockIndex].releaseTime
        );
        removeLockRecordForInvestor(investor, _lockIndex);
    }

    /**
     * @dev Get number of locks currently associated with an address
     * @param _who address to get token lock for
     *
     * @return number of locks
     *
     * Note - a lock can be inactive (due to its time expired) but still exists for a specific address
     */
    function lockCount(address _who) public view returns (uint256) {
        require(_who != address(0));
        string memory investor = getRegistryService().getInvestor(_who);
        return investorsLocksCounts[investor];
    }

    function lockCountForInvestor(string memory _investorId) public view returns (uint256) {
        return investorsLocksCounts[_investorId];
    }

    /**
     * @dev Get details of a specific lock associated with an address
     * can be used to iterate through the locks of a user
     * @param _who address to get token lock for
     * @param _lockIndex the 0 based index of the lock.
     * @return id the unique lock id
     * @return type the lock type (manual or other)
     * @return reason the reason for the lock
     * @return value the value of tokens locked
     * @return autoReleaseTime the timestamp in which the lock will be inactive (or 0 if it's always active until removed)
     *
     * Note - a lock can be inactive (due to its time expired) but still exists for a specific address
     */
    function lockInfo(address _who, uint256 _lockIndex) public view returns (uint256 reasonCode, string memory reasonString, uint256 value, uint256 autoReleaseTime) {
        require(_who != address(0));
        string memory investor = getRegistryService().getInvestor(_who);
        return lockInfoForInvestor(investor, _lockIndex);
    }

    function lockInfoForInvestor(string memory _investorId, uint256 _lockIndex)
        public
        view
        returns (uint256 reasonCode, string memory reasonString, uint256 value, uint256 autoReleaseTime)
    {
        uint256 lastLockNumber = investorsLocksCounts[_investorId];
        require(_lockIndex < lastLockNumber, "Index is greater than the number of locks");
        reasonCode = investorsLocks[_investorId][_lockIndex].reason;
        reasonString = investorsLocks[_investorId][_lockIndex].reasonString;
        value = investorsLocks[_investorId][_lockIndex].value;
        autoReleaseTime = investorsLocks[_investorId][_lockIndex].releaseTime;
    }

    function getTransferableTokens(address _who, uint64 _time) public view returns (uint256) {
        string memory investor = getRegistryService().getInvestor(_who);
        return getTransferableTokensForInvestor(investor, _time);
    }

    function getTransferableTokensForInvestor(string memory _investorId, uint64 _time) public view returns (uint256) {
        require(_time > 0, "Time must be greater than zero");
        if (investorsLocked[_investorId]) {
            return 0;
        }

        uint256 balanceOfInvestor = getToken().balanceOfInvestor(_investorId);
        uint256 investorLockCount = investorsLocksCounts[_investorId];

        //No locks, go to base class implementation
        if (investorLockCount == 0) {
            return balanceOfInvestor;
        }

        uint256 totalLockedTokens = 0;
        for (uint256 i = 0; i < investorLockCount; i++) {
            uint256 autoReleaseTime = investorsLocks[_investorId][i].releaseTime;

            if (autoReleaseTime == 0 || autoReleaseTime > _time) {
                totalLockedTokens = totalLockedTokens.add(investorsLocks[_investorId][i].value);
            }
        }

        //there may be more locked tokens than actual tokens, so the minimum between the two
        uint256 transferable = SafeMath.sub(balanceOfInvestor, Math.min(totalLockedTokens, balanceOfInvestor));

        return transferable;
    }

    function addInvestorLock(string memory _investorId) public view returns (bool) {
        require(!investorsLocked[_investorId], "Investor is already locked");
        investorsLocked[_investorId] = true;
        return true;
    }

    function removeInvestorLock(string memory _investorId) public view returns (bool) {
        require(investorsLocked[_investorId], "Investor is not locked");
        delete investorsLocked[_investorId];
        return true;
    }

    function isInvestorLocked(string memory _investorId) public view returns (bool) {
        return investorsLocked[_investorId];
    }
}
