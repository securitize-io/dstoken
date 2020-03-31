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
    LockManager.initialize();
    IDSLockManagerPartitioned.initialize();
    VERSIONS.push(1);
  }

  function createLock(address _to, uint _valueLocked, uint _reasonCode, string memory _reasonString, uint _releaseTime, bytes32 _partition) internal {
    createLockForInvestor(getRegistryService().getInvestor(_to), _valueLocked, _reasonCode, _reasonString, _releaseTime, _partition);
    emit LockedPartition(_to,_valueLocked,_reasonCode,_reasonString,_releaseTime,_partition);
  }

  function createLockForHolder(string memory _investorId, uint _valueLocked, uint _reasonCode, string memory _reasonString, uint _releaseTime, bytes32 _partition) public {
    return createLockForInvestor(_investorId, _valueLocked, _reasonCode, _reasonString, _releaseTime, _partition);
  }

  function createLockForInvestor(string memory _investorId, uint _valueLocked, uint _reasonCode, string memory _reasonString, uint _releaseTime, bytes32 _partition)
  public
  validLock(_valueLocked, _releaseTime)
  onlyIssuerOrAboveOrToken
  {
    uint lockCount = investorsLocksCounts[_investorId][_partition];

    //Only allow MAX_LOCKS_PER_INVESTOR locks per address, to prevent out-of-gas at transfer scenarios
    require(lockCount < MAX_LOCKS_PER_INVESTOR_PARTITION,"Too many locks for this investor partition");

    investorsLocks[_investorId][_partition][lockCount] = Lock(_valueLocked, _reasonCode, _reasonString, _releaseTime);
    investorsLocksCounts[_investorId][_partition] += 1;

    emit HolderLockedPartition(_investorId,_valueLocked,_reasonCode,_reasonString,_releaseTime,_partition);
  }

  function addManualLockRecord(address _to, uint _valueLocked, string memory _reason, uint _releaseTime, bytes32 _partition)
  public
   {
    require(_to != address(0));
    createLock(_to,_valueLocked,0,_reason,_releaseTime,_partition);
  }

  function removeLockRecord(address _to, uint _lockIndex, bytes32 _partition) public returns (bool) {
    //Put the last lock instead of the lock to remove (this will work even with 1 lock in the list)
    require (_to != address(0));
    string memory investor = getRegistryService().getInvestor(_to);
    emit UnlockedPartition(_to,investorsLocks[investor][_partition][_lockIndex].value,investorsLocks[investor][_partition][_lockIndex].reason,investorsLocks[investor][_partition][_lockIndex].reasonString,investorsLocks[investor][_partition][_lockIndex].releaseTime,_partition);
    return removeLockRecordForInvestor(investor, _lockIndex, _partition);
  }

  function removeLockRecordForHolder(string memory _investorId, uint _lockIndex, bytes32 _partition) public returns (bool) {
    return removeLockRecordForInvestor(_investorId, _lockIndex, _partition);
  }

  function removeLockRecordForInvestor(string memory _investorId, uint _lockIndex, bytes32 _partition) onlyIssuerOrAbove public returns (bool) {
    //Put the last lock instead of the lock to remove (this will work even with 1 lock in the list)
    uint lastLockNumber = investorsLocksCounts[_investorId][_partition];

    require(_lockIndex < lastLockNumber,"Index is greater than the number of locks");
    lastLockNumber -= 1;

    //Emit must be done on start ,because we're going to overwrite this value
    emit HolderUnlockedPartition(_investorId,investorsLocks[_investorId][_partition][_lockIndex].value,investorsLocks[_investorId][_partition][_lockIndex].reason,investorsLocks[_investorId][_partition][_lockIndex].reasonString,investorsLocks[_investorId][_partition][_lockIndex].releaseTime,_partition);
    investorsLocks[_investorId][_partition][_lockIndex] = investorsLocks[_investorId][_partition][lastLockNumber];

    //delete the last _lock
    delete investorsLocks[_investorId][_partition][lastLockNumber];
    investorsLocksCounts[_investorId][_partition] = lastLockNumber;
  }

  function lockCount(address _who, bytes32 _partition) public view returns (uint){
    require (_who != address(0));
    return lockCountForInvestor(getRegistryService().getInvestor(_who), _partition);
  }

  function lockCountForHolder(string memory _investorId, bytes32 _partition) public view returns (uint){
    return lockCountForInvestor(_investorId, _partition);
  }

  function lockCountForInvestor(string memory _investorId, bytes32 _partition) public view returns (uint){
    return investorsLocksCounts[_investorId][_partition];
  }

  function lockInfo(address _who, uint _lockIndex, bytes32 _partition) public view returns (uint reasonCode, string memory reasonString, uint value, uint autoReleaseTime) {
    require (_who != address(0));
    return lockInfoForInvestor(getRegistryService().getInvestor(_who), _lockIndex, _partition);
  }

  function lockInfoForHolder(string memory _investorId, uint _lockIndex, bytes32 _partition) public view returns (uint reasonCode, string memory reasonString, uint value, uint autoReleaseTime) {
    return lockInfoForInvestor(_investorId, _lockIndex, _partition);
  }

  function lockInfoForInvestor(string memory _investorId, uint _lockIndex, bytes32 _partition) public view returns (uint reasonCode, string memory reasonString, uint value, uint autoReleaseTime) {
    uint lastLockNumber = investorsLocksCounts[_investorId][_partition];
    require(_lockIndex < lastLockNumber,"Index is greater than the number of locks");

    reasonCode = investorsLocks[_investorId][_partition][_lockIndex].reason;
    reasonString= investorsLocks[_investorId][_partition][_lockIndex].reasonString;
    value = investorsLocks[_investorId][_partition][_lockIndex].value;
    autoReleaseTime = investorsLocks[_investorId][_partition][_lockIndex].releaseTime;
  }

  function getTransferableTokens(address _who, uint256 _time, bytes32 _partition) public view returns (uint) {
    return getTransferableTokensForInvestor(getRegistryService().getInvestor(_who), _time, _partition);
  }

  function getTransferableTokensForHolder(string memory _investorId, uint256 _time, bytes32 _partition) public view returns (uint) {
    return getTransferableTokensForInvestor(_investorId, _time, _partition);
  }

  function getTransferableTokensForInvestor(string memory _investorId, uint256 _time, bytes32 _partition) public view returns (uint) {
    require(_time > 0, "time must be greater than zero");
    uint balanceOfHolderByPartition = getTokenPartitioned().balanceOfInvestorByPartition(_investorId, _partition);

    if (investorsLocksCounts[_investorId][_partition] == 0) {
      return balanceOfHolderByPartition;
    }

    uint totalLockedTokens = 0;
    for (uint i = 0; i < investorsLocksCounts[_investorId][_partition]; i++) {
      uint256 autoReleaseTime = investorsLocks[_investorId][_partition][i].releaseTime;
      if (autoReleaseTime == 0 || autoReleaseTime > _time) {
        totalLockedTokens = totalLockedTokens.add(investorsLocks[_investorId][_partition][i].value);
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

  function addManualLockRecord(address /*_to*/, uint /*_valueLocked*/, string memory /*_reason*/, uint /*_releaseTime*/) public {
    revertedFunction();
  }

  function removeLockRecord(address /*_to*/, uint /*_index*/) public returns (bool) {
    revertedFunction();
  }

  function lockCount(address /*_who*/) public view returns (uint) {
    revertedFunction();
  }

  function lockInfo(address /*_who*/, uint /*_index*/) public view returns (uint /*reasonCode*/, string memory /*reasonString*/, uint /*value*/, uint /*autoReleaseTime*/) {
    revertedFunction();
  }

  function revertedFunction() internal pure {
    revert('Must specify partition');
  }

}
