pragma solidity ^0.8.20;

import "./BaseLockManagerDataStore.sol";

//SPDX-License-Identifier: GPL-3.0
contract LockManagerDataStore is BaseLockManagerDataStore {
    mapping(address => uint256) internal locksCounts;
    mapping(address => mapping(uint256 => Lock)) internal locks;
}
