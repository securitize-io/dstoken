pragma solidity ^0.5.0;

import "./IDSLockManager.sol";

contract IDSLockManagerPartitioned is IDSLockManager {
  constructor() internal {}

  function initialize() public {
      VERSIONS.push(1);
  }

  event LockedPartition(address indexed who, uint256 value, uint indexed reason, string reasonString, uint releaseTime, bytes32 indexed partition);
  event UnlockedPartition(address indexed who, uint256 value, uint indexed reason, string reasonString, uint releaseTime, bytes32 indexed partition);
  event HolderLockedPartition(string investorId, uint256 value, uint indexed reason, string reasonString, uint releaseTime, bytes32 indexed partition);
  event HolderUnlockedPartition(string investorId, uint256 value, uint indexed reason, string reasonString, uint releaseTime, bytes32 indexed partition);

  function createLockForInvestor(string memory _investorId, uint _valueLocked, uint _reasonCode, string memory _reasonString, uint _releaseTime, bytes32 _partition) public;
  function addManualLockRecord(address _to, uint _valueLocked, string memory _reason, uint _releaseTime, bytes32 _partition) /*issuerOrAboveOrToken*/ public;
  function removeLockRecord(address _to, uint _index, bytes32 _partition) /*issuerOrAbove*/ public returns (bool);
  function removeLockRecordForInvestor(string memory _investorId, uint _index, bytes32 _partition) /*issuerOrAbove*/ public returns (bool);
  function lockCount(address _who, bytes32 _partition) public view returns (uint);
  function lockInfo(address _who, uint _index, bytes32 _partition) public view returns (uint reasonCode, string memory reasonString, uint value, uint autoReleaseTime);
  function lockCountForInvestor(string memory _investorId, bytes32 _partition) public view returns (uint256);
  function lockInfoForInvestor(string memory _investorId, uint _index, bytes32 _partition) public view returns (uint reasonCode, string memory reasonString, uint value, uint autoReleaseTime);
  function getTransferableTokens(address _who, uint256 _time, bytes32 _partition) public view returns (uint);
  function getTransferableTokensForInvestor(string memory _investorId, uint256 _time, bytes32 _partition) public view returns (uint);

  function createLockForHolder(string memory _holderId, uint _valueLocked, uint _reasonCode, string memory _reasonString, uint _releaseTime, bytes32 _partition) public;
  function removeLockRecordForHolder(string memory _holderId, uint _index, bytes32 _partition) /*issuerOrAbove*/ public returns (bool);
  function lockInfoForHolder(string memory _holderId, uint _index, bytes32 _partition) public view returns (uint reasonCode, string memory reasonString, uint value, uint autoReleaseTime);
  function lockCountForHolder(string memory _holderId, bytes32 _partition) public view returns (uint256);
}