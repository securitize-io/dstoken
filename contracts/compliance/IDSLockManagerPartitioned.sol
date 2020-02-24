pragma solidity ^0.5.0;

import "./IDSLockManager.sol";
import "../service/ServiceConsumer.sol";

contract IDSLockManagerPartitioned is IDSLockManager, ServiceConsumer {

    function initialize() public isNotInitialized {
        VERSIONS.push(1);
    }

  event LockedPartitioned(address indexed who, uint256 value, uint indexed reason, string reasonString, uint releaseTime, bytes32 indexed partition);
  event UnlockedPartitioned(address indexed who, uint256 value, uint indexed reason, string reasonString, uint releaseTime, bytes32 indexed partition);

  function addManualLockRecord(address _to, uint _valueLocked, string memory _reason, uint _releaseTime, bytes32 _partition) /*issuerOrAboveOrToken*/ public;
  function removeLockRecord(address _to, uint _index, bytes32 _partition) /*issuerOrAbove*/ public returns (bool);
  function lockCount(address _who, bytes32 _partition) public view returns (uint);
  function lockInfo(address _who, uint _index, bytes32 _partition) public view returns (uint reasonCode, string memory reasonString, uint value, uint autoReleaseTime);
  function getTransferableTokens(address _who, uint256 _time, bytes32 _partition) public view returns (uint);

  function addManualLockRecord(address /*_to*/, uint /*_valueLocked*/, string memory /*_reason*/, uint /*_releaseTime*/) onlyIssuerOrAboveOrToken public {
    require(false, 'Partitioned Lock Manager');
  }

  function removeLockRecord(address /*_to*/, uint /*_index*/) onlyIssuerOrAbove public returns (bool) {
    require(false, 'Partitioned Lock Manager');
  }

  function lockCount(address /*_who*/) public view returns (uint) {
    require(false, 'Partitioned Lock Manager');
  }

  function lockInfo(address /*_who*/, uint /*_index*/) public view returns (uint /*reasonCode*/, string memory /*reasonString*/, uint /*value*/, uint /*autoReleaseTime*/) {
    require(false, 'Partitioned Lock Manager');
  }
}