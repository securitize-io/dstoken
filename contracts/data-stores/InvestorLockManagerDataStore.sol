pragma solidity 0.5.17;

import "./BaseLockManagerDataStore.sol";

contract InvestorLockManagerDataStore is BaseLockManagerDataStore {
    mapping(string => mapping(uint256 => Lock)) internal investorsLocks;
    mapping(string => uint256) internal investorsLocksCounts;
    mapping(string => bool) internal investorsLocked;
    mapping(string => mapping(bytes32 => mapping(uint256 => Lock))) internal investorsPartitionsLocks;
    mapping(string => mapping(bytes32 => uint256)) internal investorsPartitionsLocksCounts;
}
