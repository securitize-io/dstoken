pragma solidity ^0.8.20;

import "./BaseLockManagerDataStore.sol";

//SPDX-License-Identifier: UNLICENSED
contract LockManagerDataStore is BaseLockManagerDataStore {
    mapping(address => uint256) internal locksCounts;
    mapping(address => mapping(uint256 => Lock)) internal locks;
}
