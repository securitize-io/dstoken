pragma solidity ^0.5.0;

import "./BaseLockManagerDataStore.sol";

contract InvestorLockManagerDataStore is BaseLockManagerDataStore {
    mapping(string => mapping(uint256 => Lock)) internal investorsLocks;
    mapping(string => uint256) internal investorsLocksCounts;
}
