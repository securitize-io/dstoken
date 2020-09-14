pragma solidity 0.5.17;

import "./BaseLockManagerDataStore.sol";

contract LockManagerDataStore is BaseLockManagerDataStore {
    mapping(address => uint256) internal locksCounts;
    mapping(address => mapping(uint256 => Lock)) internal locks;
}
