pragma solidity ^0.4.23;

import "../ESServiceConsumer.sol";
import "./DSLockManagerInterface.sol";
import "../zeppelin/math/Math.sol";
import "../zeppelin/math/SafeMath.sol";


/**
 * @title ESLockManager
 * @dev An interface for controlling and getting information about locked funds in a compliance manager
 */
contract ESLockManager is DSLockManagerInterface,ESServiceConsumer {

   constructor(address _address, string _namespace) public ESServiceConsumer(_address, _namespace) {}

    using SafeMath for uint256;

    uint256 constant MAX_LOCKS_PER_ADDRESS = 30;

    function setLockInfoImpl(address _to, uint _lockCount, uint _valueLocked, uint _reasonCode, string _reasonString, uint _releaseTime) internal {
      setUint(LOCKS_VALUE,_to,_lockCount,_valueLocked);
      setUint(LOCKS_REASON,_to,_lockCount,_reasonCode);
      setString(LOCKS_REASON_STRING,_to,_lockCount,_reasonString);
      setUint(LOCKS_RELEASE_TIME,_to,_lockCount,_releaseTime);
    }

    function createLock(address _to, uint _valueLocked,uint _reasonCode, string _reasonString,uint _releaseTime) internal{

        //Get total count
        uint lockCount = getUint(LOCK_COUNT,_to);

        //Only allow MAX_LOCKS_PER_ADDRESS locks per address, to prevent out-of-gas at transfer scenarios
        require(lockCount < MAX_LOCKS_PER_ADDRESS,"Too many locks for this address");

        //Add the lock
        setLockInfoImpl(_to, lockCount, _valueLocked, _reasonCode, _reasonString, _releaseTime);

        //Increase the lock counter for the user
        setUint(LOCK_COUNT,_to,lockCount.add(1));

        emit Locked(_to,_valueLocked,_reasonCode,_reasonString,_releaseTime);
    }

    function addManualLockRecord(address _to, uint _valueLocked, string _reason, uint _releaseTime) onlyIssuerOrAboveOrToken public{
        require(_to != address(0));
        require(_valueLocked > 0);
        require(_releaseTime == 0 || _releaseTime > uint(now),"Release time is in the past");
        createLock(_to,_valueLocked,0,_reason,_releaseTime);
    }

    /**
    * @dev Releases a specific lock record
    * @param _to address to release the tokens for
    * @param _lockIndex the index of the lock
    *
    * note - this may change the order of the locks on an address, so if iterating the iteration should be restarted.
    * @return true on success
    */
    function removeLockRecord(address _to, uint _lockIndex) onlyIssuerOrAbove public returns (bool){

        require (_to != address(0));
        //Put the last lock instead of the lock to remove (this will work even with 1 lock in the list)
        uint lastLockNumber = getUint(LOCK_COUNT,_to);

        require(_lockIndex > 0 && _lockIndex < lastLockNumber,"Index is greater than the number of locks");

        lastLockNumber -= 1;

        //Emit must be done on start ,because we're going to overwrite this value
        emit Unlocked(_to,getUint(LOCKS_VALUE,_to,_lockIndex),getUint(LOCKS_REASON,_to,_lockIndex),getString(LOCKS_REASON_STRING,_to,_lockIndex),getUint(LOCKS_RELEASE_TIME,_to,_lockIndex));

        //Move the  the lock
        uint reasonCode = getUint(LOCKS_REASON,_to,lastLockNumber);

        setLockInfoImpl(_to, _lockIndex, getUint(LOCKS_VALUE,_to,lastLockNumber), reasonCode, getString(LOCKS_REASON_STRING,_to,lastLockNumber), getUint(LOCKS_RELEASE_TIME,_to,lastLockNumber));

        //delete the last _lock
        //Remove from reverse index
        deleteUint(LOCKS_VALUE,_to,lastLockNumber);
        deleteUint(LOCKS_REASON,_to,lastLockNumber);
        deleteString(LOCKS_REASON_STRING,_to,lastLockNumber);
        deleteUint(LOCKS_RELEASE_TIME,_to,lastLockNumber);

        //decrease the lock counter for the user
        setUint(LOCK_COUNT,_to,lastLockNumber);
    }

    /**
   * @dev Get number of locks currently associated with an address
   * @param _who address to get token lock for
   *
   * @return number of locks
   *
   * Note - a lock can be inactive (due to its time expired) but still exists for a specific address
   */
    function lockCount(address _who) public view returns (uint){
        require (_who != address(0));
        return getUint(LOCK_COUNT,_who);
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
    function lockInfo(address _who, uint _lockIndex) public view returns (uint reasonCode, string reasonString, uint value, uint autoReleaseTime){
        require (_who != address(0));
        uint lastLockNumber = getUint(LOCK_COUNT,_who);
        require(_lockIndex > 0 && _lockIndex < lastLockNumber,"Index is greater than the number of locks");
        reasonCode = getUint(LOCKS_REASON,_who,_lockIndex);
        reasonString= getString(LOCKS_REASON_STRING,_who,_lockIndex);
        value = getUint(LOCKS_VALUE,_who,_lockIndex);
        autoReleaseTime = getUint(LOCKS_RELEASE_TIME,_who,_lockIndex);
    }

    function getTransferableTokens(address _who, uint64 _time) public view returns (uint) {
      require(_time > 0, "time must be greater than zero");

      uint balanceOfHolder = getToken().balanceOf(_who);

      uint holderLockCount = getUint(LOCK_COUNT, _who);

      //No locks, go to base class implementation
      if (holderLockCount == 0) {
        return balanceOfHolder;
      }

      uint totalLockedTokens = 0;
      for (uint i = 0; i < holderLockCount; i ++) {

        uint autoReleaseTime = getUint(LOCKS_RELEASE_TIME, _who, i);

        if (autoReleaseTime == 0 || autoReleaseTime > _time) {
          totalLockedTokens = totalLockedTokens.add(getUint(LOCKS_VALUE, _who, i));
        }
      }

      //there may be more locked tokens than actual tokens, so the minimum between the two
      uint transferable = SafeMath.sub(balanceOfHolder, Math.min256(totalLockedTokens, balanceOfHolder));

      return transferable;
    }
}