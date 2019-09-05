pragma solidity ^0.4.23;

import "./ESLockManagerVersioned.sol";

contract ESInvestorLockManagerVersioned is ESLockManagerVersioned {
  constructor(address _address, string _namespace) public ESLockManagerVersioned(_address, _namespace) {
    VERSIONS.push(1);
  }

  uint256 constant MAX_LOCKS_PER_INVESTOR = 30;

  function setLockInfoImpl(string _investor, uint _lockIndex, uint _valueLocked, uint _reasonCode, string _reasonString, uint _releaseTime) internal {
    setUint(LOCKS_VALUE,_investor,_lockIndex,_valueLocked);
    setUint(LOCKS_REASON,_investor,_lockIndex,_reasonCode);
    setString(LOCKS_REASON_STRING,_investor,_lockIndex,_reasonString);
    setUint(LOCKS_RELEASE_TIME,_investor,_lockIndex,_releaseTime);
  }

  function createLockForHolder(string _holder, uint _valueLocked,uint _reasonCode, string _reasonString,uint _releaseTime) onlyIssuerOrAboveOrToken public {
    //Get total count
    uint lockCount = getUint(LOCK_COUNT, _holder);
    //Only allow MAX_LOCKS_PER_INVESTOR locks per address, to prevent out-of-gas at transfer scenarios
    require(lockCount < MAX_LOCKS_PER_INVESTOR,"Too many locks for this investor");
    setLockInfoImpl(_holder, lockCount, _valueLocked, _reasonCode, _reasonString, _releaseTime);
    lockCount+=1;
    setUint(LOCK_COUNT, _holder, lockCount);
    emit HolderLocked(_holder,_valueLocked,_reasonCode,_reasonString,_releaseTime);

  }
  function createLock(address _to, uint _valueLocked,uint _reasonCode, string _reasonString,uint _releaseTime) internal {
    createLockForHolder(getRegistryService().getInvestor(_to),_valueLocked,_reasonCode,_reasonString,_releaseTime);
    emit Locked(_to,_valueLocked,_reasonCode,_reasonString,_releaseTime);
  }

  function addManualLockRecord(address _to, uint _valueLocked, string _reason, uint _releaseTime) onlyIssuerOrAboveOrToken public {
    require(_to != address(0));
    require(_valueLocked > 0);
    require(_releaseTime == 0 || _releaseTime > uint(now),"Release time is in the past");
    createLock(_to,_valueLocked,0,_reason,_releaseTime);
  }

  function removeLockRecordForHolder(string _holderId, uint _lockIndex) onlyIssuerOrAbove public returns (bool){

    emit HolderUnlocked(_holderId,getUint(LOCKS_VALUE,_holderId,_lockIndex),getUint(LOCKS_REASON,_holderId,_lockIndex),getString(LOCKS_REASON_STRING,_holderId,_lockIndex),getUint(LOCKS_RELEASE_TIME,_holderId,_lockIndex));

    //Put the last lock instead of the lock to remove (this will work even with 1 lock in the list)
    uint lastLockNumber = getUint(LOCK_COUNT, _holderId);
    require(_lockIndex < lastLockNumber,"Index is greater than the number of locks");
    lastLockNumber -= 1;

    //Move the lock
    uint reasonCode = getUint(LOCKS_REASON,_holderId,lastLockNumber);
    setLockInfoImpl(_holderId, _lockIndex, getUint(LOCKS_VALUE,_holderId,lastLockNumber), reasonCode, getString(LOCKS_REASON_STRING,_holderId,lastLockNumber), getUint(LOCKS_RELEASE_TIME,_holderId,lastLockNumber));

    //delete the last _lock
    //Remove from reverse index
    deleteUint(LOCKS_VALUE,_holderId,lastLockNumber);
    deleteUint(LOCKS_VALUE,_holderId,lastLockNumber);
    deleteString(LOCKS_REASON_STRING,_holderId,lastLockNumber);
    deleteUint(LOCKS_RELEASE_TIME,_holderId,lastLockNumber);

    //decrease the lock counter for the user
    setUint(LOCK_COUNT,_holderId,lastLockNumber);

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
  function removeLockRecord(address _to, uint _lockIndex) onlyIssuerOrAbove public returns (bool){
    require (_to != address(0));
    string memory investor = getRegistryService().getInvestor(_to);
    //Emit must be done on start ,because we're going to overwrite this value
    emit Unlocked(_to,getUint(LOCKS_VALUE,investor,_lockIndex),getUint(LOCKS_REASON,investor,_lockIndex),getString(LOCKS_REASON_STRING,investor,_lockIndex),getUint(LOCKS_RELEASE_TIME,investor,_lockIndex));
    removeLockRecordForHolder(investor,_lockIndex);
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
    string memory investor = getRegistryService().getInvestor(_who);
    return getUint(LOCK_COUNT,investor);
  }


  function lockCountForHolder(string _holderId) public view returns (uint){
    return getUint(LOCK_COUNT,_holderId);
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
    string memory investor = getRegistryService().getInvestor(_who);
    return lockInfoForHolder(investor,_lockIndex);
  }

  function lockInfoForHolder(string _holderId, uint _lockIndex) public view returns (uint reasonCode, string reasonString, uint value, uint autoReleaseTime){
    uint lastLockNumber = getUint(LOCK_COUNT,_holderId);
    require(_lockIndex < lastLockNumber,"Index is greater than the number of locks");
    reasonCode = getUint(LOCKS_REASON,_holderId,_lockIndex);
    reasonString= getString(LOCKS_REASON_STRING,_holderId,_lockIndex);
    value = getUint(LOCKS_VALUE,_holderId,_lockIndex);
    autoReleaseTime = getUint(LOCKS_RELEASE_TIME,_holderId,_lockIndex);
  }


  function getTransferableTokens(address _who, uint64 _time) public view returns (uint) {
    string memory investor = getRegistryService().getInvestor(_who);
    return getTransferableTokensForHolder(investor,_time);
  }

  function getTransferableTokensForHolder(string _holderId, uint64 _time) public view returns (uint) {
    require(_time > 0, "time must be greater than zero");

    uint balanceOfHolder = getToken().balanceOfInvestor(_holderId);
    uint holderLockCount = getUint(LOCK_COUNT, _holderId);

    //No locks, go to base class implementation
    if (holderLockCount == 0) {
      return balanceOfHolder;
    }

    uint totalLockedTokens = 0;
    for (uint i = 0; i < holderLockCount; i ++) {

      uint autoReleaseTime = getUint(LOCKS_RELEASE_TIME, _holderId, i);

      if (autoReleaseTime == 0 || autoReleaseTime > _time) {
        totalLockedTokens = totalLockedTokens.add(getUint(LOCKS_VALUE, _holderId, i));
      }
    }

    //there may be more locked tokens than actual tokens, so the minimum between the two
    uint transferable = SafeMath.sub(balanceOfHolder, Math.min256(totalLockedTokens, balanceOfHolder));

    return transferable;
  }
}
