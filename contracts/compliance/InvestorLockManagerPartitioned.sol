pragma solidity ^0.5.0;

import "./LockManager.sol";
import "./IDSLockManagerPartitioned.sol";
import "../utils/ProxyTarget.sol";
import "../zeppelin/math/Math.sol";
import "../service/ServiceConsumer.sol";
import "../data-stores/LockManagerPartitionedDataStore.sol";

contract InvestorLockManagerPartitioned is ProxyTarget, Initializable, IDSLockManagerPartitioned, ServiceConsumer, LockManager, LockManagerPartitionedDataStore {
  uint256 constant MAX_LOCKS_PER_INVESTOR_PARTITION = 30;

  function initialize() public initializer onlyFromProxy {
    IDSLockManagerPartitioned.initialize();
    ServiceConsumer.initialize();
    VERSIONS.push(1);
  }

  function createLock(address _to, uint _valueLocked, uint _reasonCode, string memory _reasonString, uint _releaseTime, bytes32 _partition) internal {

    string memory investor = getRegistryService().getInvestor(_to);
    uint lockCount = investorsLocksCounts[investor][_partition];

    //Only allow MAX_LOCKS_PER_INVESTOR locks per address, to prevent out-of-gas at transfer scenarios
    require(lockCount < MAX_LOCKS_PER_INVESTOR_PARTITION,"Too many locks for this investor partition");

    investorsLocks[investor][_partition][lockCount] = Lock(_valueLocked, _reasonCode, _reasonString, _releaseTime);
    investorsLocksCounts[investor][_partition] += 1;

    emit LockedPartitioned(_to,_valueLocked,_reasonCode,_reasonString,_releaseTime,_partition);
  }

  function addManualLockRecord(address _to, uint _valueLocked, string memory _reason, uint _releaseTime, bytes32 _partition) onlyIssuerOrAboveOrToken public {
    require(_to != address(0));
    require(_valueLocked > 0);
    require(_releaseTime == 0 || _releaseTime > uint(now),"Release time is in the past");

    createLock(_to,_valueLocked,0,_reason,_releaseTime,_partition);
  }

  function removeLockRecord(address _to, uint _lockIndex, bytes32 _partition) onlyIssuerOrAbove public returns (bool) {
    //Put the last lock instead of the lock to remove (this will work even with 1 lock in the list)
    require (_to != address(0));

    string memory investor = getRegistryService().getInvestor(_to);
    uint lastLockNumber = investorsLocksCounts[investor][_partition];

    require(_lockIndex < lastLockNumber,"Index is greater than the number of locks");
    lastLockNumber -= 1;

    //Emit must be done on start ,because we're going to overwrite this value
    emit UnlockedPartitioned(_to,investorsLocks[investor][_partition][_lockIndex].value,investorsLocks[investor][_partition][_lockIndex].reason,investorsLocks[investor][_partition][_lockIndex].reasonString,investorsLocks[investor][_partition][_lockIndex].releaseTime,_partition);
    investorsLocks[investor][_partition][_lockIndex] = investorsLocks[investor][_partition][lastLockNumber];

    //delete the last _lock
    delete investorsLocks[investor][_partition][lastLockNumber];
    investorsLocksCounts[investor][_partition] = lastLockNumber;
  }

  function lockCount(address _who, bytes32 _partition) public view returns (uint){
    require (_who != address(0));
    string memory investor = getRegistryService().getInvestor(_who);
    return investorsLocksCounts[investor][_partition];
  }

  function lockInfo(address _who, uint _lockIndex, bytes32 _partition) public view returns (uint reasonCode, string memory reasonString, uint value, uint autoReleaseTime){
    require (_who != address(0));
    string memory investor = getRegistryService().getInvestor(_who);
    uint lastLockNumber = investorsLocksCounts[investor][_partition];
    require(_lockIndex < lastLockNumber,"Index is greater than the number of locks");

    reasonCode = investorsLocks[investor][_partition][_lockIndex].reason;
    reasonString= investorsLocks[investor][_partition][_lockIndex].reasonString;
    value = investorsLocks[investor][_partition][_lockIndex].value;
    autoReleaseTime = investorsLocks[investor][_partition][_lockIndex].releaseTime;
  }

  function getTransferableTokens(address _who, uint256 _time, bytes32 _partition) public view returns (uint) {
    require(_time > 0, "time must be greater than zero");
    string memory investor = getRegistryService().getInvestor(_who);
    uint balanceOfHolderByPartition = getTokenPartitioned().balanceOfInvestorByPartition(investor, _partition);

    if (investorsLocksCounts[investor][_partition] == 0) {
      return balanceOfHolderByPartition;
    }

    uint totalLockedTokens = 0;
    for (uint i = 0; i < investorsLocksCounts[investor][_partition]; i++) {
      uint256 autoReleaseTime = investorsLocks[investor][_partition][i].releaseTime;
      if (autoReleaseTime == 0 || autoReleaseTime > _time) {
        totalLockedTokens = totalLockedTokens.add(investorsLocks[investor][_partition][i].value);
      }
    }

    //there may be more locked tokens than actual tokens, so the minimum between the two
    return SafeMath.sub(balanceOfHolderByPartition, Math.min(totalLockedTokens, balanceOfHolderByPartition));
  }

  function getTransferableTokens(address _who, uint256 _time) public view returns (uint transferable) {
    uint countOfPartitions = getTokenPartitioned().partitionCountOf(_who);
    for (uint index = 0; index < countOfPartitions; ++index) {
      transferable = SafeMath.add(transferable, getTransferableTokens(_who, _time, getTokenPartitioned().partitionOf(_who, index)));
    }
  }

}
