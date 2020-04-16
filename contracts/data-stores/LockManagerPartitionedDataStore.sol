pragma solidity ^0.5.0;

import "./BaseLockManagerDataStore.sol";

contract LockManagerPartitionedDataStore is BaseLockManagerDataStore {
    mapping(string => mapping(bytes32 => mapping(uint256 => Lock))) internal investorsLocks;
    mapping(string => mapping(bytes32 => uint256)) internal investorsLocksCounts;
    mapping(string => bool) internal investorsLocked;
}
