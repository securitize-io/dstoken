pragma solidity ^0.8.20;

import "./BaseLockManagerDataStore.sol";

//SPDX-License-Identifier: GPL-3.0
contract LockManagerDataStore is BaseLockManagerDataStore {
    mapping(address => uint256) internal locksCounts;
    mapping(address => mapping(uint256 => Lock)) internal locks;

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[48] private __gap;
}
