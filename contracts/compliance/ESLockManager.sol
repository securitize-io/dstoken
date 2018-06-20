pragma solidity ^0.4.23;

import "./DSLockManagerInterface.sol";
import "../ESServiceConsumer.sol";
import "./DSComplianceServiceInterface.sol";


/**
 * @title DSLockManagerInterface
 * @dev An interface for controlling and getting information about locked funds in a compliance manager
 */
contract ESLockManager is DSComplianceServiceInterface {

    uint256 constant MAX_LOCKS_PER_ADDRESS = 30;

    function createLock(address _to, uint _valueLocked,uint reasonCode, string _reasonString,uint _releaseTime) internal{

        //Get total count
        uint lockCount = getUint("lockCount",_to);

        //Only allow MAX_LOCKS_PER_ADDRESS locks per address, to prevent out-of-gas at transfer scenarios
        require(lockCount < MAX_LOCKS_PER_ADDRESS);

        //Add the lock
        setUint("locks_value",_to,lockCount,_valueLocked);
        setUint("locks_reason",_to,lockCount,reasonCode);
        setString("locks_reasonString",_to,lockCount,_reasonString);
        setUint("locks_releaseTime",_to,lockCount,_releaseTime);

        //Increase the lock counter for the user
        setUint("lockCount",_to,lockCount.add(1));

        emit Locked(_who, _value, _reason, _releaseTime, lockId);
    }
    function addManualLockRecord(address _to, uint _valueLocked, string _reason, uint _releaseTime) issuerOrAbove public returns (uint64){
        require(_to != address(0));
        require(_valueLocked > 0);
        require(_releaseTime == 0 || _releaseTime > uint(now));
        return createLock(_to,_valueLocked,0,_reason,_releaseTime);
    }

    /**
    * @dev Releases a specific lock record
    * @param to address to release the tokens for
    * @param lockId the unique lock-id to release
    *
    * note - this may change the order of the locks on an address, so if iterating the iteration should be restarted.
    * @return true on success
    */
    function removeLockRecord(address _to, uint64 _lockIndex) issuerOrAbove public returns (bool){

        require (_to != address(0));
        //Put the last lock instead of the lock to remove (this will work even with 1 lock in the list)
        uint lastLockNumber = getUint("lockCount",_to);

        require(_lockIndex > 0 && lockIndex < lastLockNumber);

        lastLockNumber -= 1;

        //Move the  the lock
        setUint("locks_value",_to,_lockIndex,getUint("locks_value",_to,lastLockNumber));
        uint reasonCode = getUint("locks_reason",_to,lastLockNumber);
        setUint("locks_reason",_to,_lockIndex,reasonCode);
        setString("locks_reasonString",_to,_lockIndex,getString("locks_reasonString",_to,lastLockNumber));
        setUint("locks_releaseTime",_to,_lockIndex,getUint("locks_releaseTime",_to,lastLockNumber));

        //delete the last _lock
        //Remove from reverse index
        deleteUint("locks_value",_to,lastLockNumber);
        deleteUint("locks_reason",_to,lastLockNumber);
        deleteString("locks_reasonString",_to,lastLockNumber);
        deleteUint("locks_releaseTime",_to,lastLockNumber);

        //decrease the lock counter for the user
        setUint("lockCount",_to,lastLockNumber);
    }

    /**
   * @dev Get number of locks currently associated with an address
   * @param who address to get token lock for
   *
   * @return number of locks
   *
   * Note - a lock can be inactive (due to its time expired) but still exists for a specific address
   */
    function lockCount(address _who) public view returns (uint64){
        require (_who != address(0));
        return getUint("lockCount",_to);
    }

    /**
    * @dev Get details of a specific lock associated with an address
    * can be used to iterate through the locks of a user
    * @param who address to get token lock for
    * @param index the 0 based index of the lock.
    * @return id the unique lock id
    * @return type the lock type (manual or other)
    * @return reason the reason for the lock
    * @return value the value of tokens locked
    * @return autoReleaseTime the timestamp in which the lock will be inactive (or 0 if it's always active until removed)
    *
    * Note - a lock can be inactive (due to its time expired) but still exists for a specific address
    */
    function lockInfo(address _who, uint64 _lockIndex) public constant returns (uint8 reasonCode, string reasonString, uint value, uint autoReleaseTime){
        require (_who != address(0));
        uint lastLockNumber = getUint("lockCount",_to);
        require(_lockIndex > 0 && lockIndex < lastLockNumber);
        reasonCode = getUint("locks_reason",_who,_lockIndex);
        reasonString= getString("locks_reasonString",_who,_lockIndex);
        value = getUint("locks_value",_who,_lockIndex);
        autoReleaseTime = getUint("locks_releaseTime",_who,_lockIndex);
    }


}