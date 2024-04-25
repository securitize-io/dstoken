pragma solidity ^0.8.20;

import "./BaseLockManagerDataStore.sol";

//SPDX-License-Identifier: GPL-3.0
contract InvestorLockManagerDataStore is BaseLockManagerDataStore {
    mapping(string => mapping(uint256 => Lock)) internal investorsLocks;
    mapping(string => uint256) internal investorsLocksCounts;
    mapping(string => bool) internal investorsLocked;
    mapping(string => mapping(bytes32 => mapping(uint256 => Lock))) internal investorsPartitionsLocks;
    mapping(string => mapping(bytes32 => uint256)) internal investorsPartitionsLocksCounts;
}
