pragma solidity ^0.5.0;

import "../service/ServiceConsumer.sol";
import "./IDSLockManager.sol";
import "../zeppelin/math/Math.sol";
import "../zeppelin/math/SafeMath.sol";
import "../utils/ProxyTarget.sol";
import "../data-stores/LockManagerDataStore.sol";

/**
 * @title LockManager
 * @dev An interface for controlling and getting information about locked funds in a compliance manager
 */
contract LockManager is ProxyTarget, Initializable, IDSLockManager, ServiceConsumer, LockManagerDataStore {
    using SafeMath for uint256;

    /*************** Legacy functions ***************/
    function createLockForHolder(string memory _holder, uint256 _valueLocked, uint256 _reasonCode, string memory _reasonString, uint256 _releaseTime)
        public
        onlyIssuerOrAboveOrToken
    {
        createLockForInvestor(_holder, _valueLocked, _reasonCode, _reasonString, _releaseTime);
    }

    function removeLockRecordForHolder(string memory _holderId, uint256 _lockIndex) public onlyIssuerOrAbove returns (bool) {
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

    uint256 constant MAX_LOCKS_PER_ADDRESS = 30;

    function setLockInfoImpl(address _to, uint256 _lockCount, uint256 _valueLocked, uint256 _reasonCode, string memory _reasonString, uint256 _releaseTime) internal {
        locks[_to][_lockCount] = Lock(_valueLocked, _reasonCode, _reasonString, _releaseTime);
    }

    function createLock(address _to, uint256 _valueLocked, uint256 _reasonCode, string memory _reasonString, uint256 _releaseTime) internal {
        //Get total count
        uint256 lockCount = locksCounts[_to];

        //Only allow MAX_LOCKS_PER_ADDRESS locks per address, to prevent out-of-gas at transfer scenarios
        require(lockCount < MAX_LOCKS_PER_ADDRESS, "Too many locks for this address");

        //Add the lock
        setLockInfoImpl(_to, lockCount, _valueLocked, _reasonCode, _reasonString, _releaseTime);

        //Increase the lock counter for the user
        locksCounts[_to] = locksCounts[_to].add(1);

        emit Locked(_to, _valueLocked, _reasonCode, _reasonString, _releaseTime);
    }

    function addManualLockRecord(address _to, uint256 _valueLocked, string memory _reason, uint256 _releaseTime)
        public
        onlyIssuerOrAboveOrToken
        validLock(_valueLocked, _releaseTime)
    {
        require(_to != address(0));
        createLock(_to, _valueLocked, 0, _reason, _releaseTime);
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
        //Put the last lock instead of the lock to remove (this will work even with 1 lock in the list)
        uint256 lastLockNumber = locksCounts[_to];

        require(_lockIndex < lastLockNumber, "Index is greater than the number of locks");

        lastLockNumber -= 1;

        //Emit must be done on start ,because we're going to overwrite this value
        emit Unlocked(_to, locks[_to][_lockIndex].value, locks[_to][_lockIndex].reason, locks[_to][_lockIndex].reasonString, locks[_to][_lockIndex].releaseTime);

        //Move the lock
        uint256 reasonCode = locks[_to][lastLockNumber].reason;

        setLockInfoImpl(_to, _lockIndex, locks[_to][lastLockNumber].value, reasonCode, locks[_to][lastLockNumber].reasonString, locks[_to][lastLockNumber].releaseTime);

        //delete the last _lock
        //Remove from reverse index
        delete locks[_to][lastLockNumber];

        //decrease the lock counter for the user
        locksCounts[_to] = lastLockNumber;
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
        return locksCounts[_who];
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
        uint256 lastLockNumber = locksCounts[_who];
        require(_lockIndex < lastLockNumber, "Index is greater than the number of locks");
        reasonCode = locks[_who][_lockIndex].reason;
        reasonString = locks[_who][_lockIndex].reasonString;
        value = locks[_who][_lockIndex].value;
        autoReleaseTime = locks[_who][_lockIndex].releaseTime;
    }

    function getTransferableTokens(address _who, uint64 _time) public view returns (uint256) {
        require(_time > 0, "Time must be greater than zero");

        uint256 balanceOfInvestor = getToken().balanceOf(_who);

        uint256 investorLockCount = locksCounts[_who];

        //No locks, go to base class implementation
        if (investorLockCount == 0) {
            return balanceOfInvestor;
        }

        uint256 totalLockedTokens = 0;
        for (uint256 i = 0; i < investorLockCount; i++) {
            uint256 autoReleaseTime = locks[_who][i].releaseTime;

            if (autoReleaseTime == 0 || autoReleaseTime > _time) {
                totalLockedTokens = totalLockedTokens.add(locks[_who][i].value);
            }
        }

        //there may be more locked tokens than actual tokens, so the minimum between the two
        uint256 transferable = SafeMath.sub(balanceOfInvestor, Math.min(totalLockedTokens, balanceOfInvestor));

        return transferable;
    }

    function getTransferableTokensForInvestor(string memory, uint64) public view returns (uint256) {
        return 0;
    }

    function lockInfoForInvestor(string memory, uint256) public view returns (uint256 reasonCode, string memory reasonString, uint256 value, uint256 autoReleaseTime) {
        return (0, "", 0, 0);
    }

    function lockCountForInvestor(string memory) public view returns (uint256) {
        return 0;
    }

    function createLockForInvestor(string memory, uint256, uint256, string memory, uint256) public onlyIssuerOrAboveOrToken {
        revertInvestorLevelMethod();
    }

    function removeLockRecordForInvestor(string memory, uint256) public onlyIssuerOrAbove returns (bool) {
        revertInvestorLevelMethod();
    }

    function pauseInvestor(
        string memory /*_investorId*/
    ) public returns (bool) {
        revertInvestorLevelMethod();
    }
    function unpauseInvestor(
        string memory /*_investorId*/
    ) public returns (bool) {
        revertInvestorLevelMethod();
    }
    function isInvestorPaused(
        string memory /*_investorId*/
    ) public view returns (bool) {
        revertInvestorLevelMethod();
    }

    function revertInvestorLevelMethod() internal pure {
        revert("lock manager supports only wallet locks");
    }
}
