pragma solidity ^0.8.20;

import "./BaseLockManagerDataStore.sol";

//SPDX-License-Identifier: GPL-3.0
contract InvestorLockManagerDataStore is BaseLockManagerDataStore {
    mapping(string => mapping(uint256 => Lock)) internal investorsLocks;
    mapping(string => uint256) internal investorsLocksCounts;
    mapping(string => bool) internal investorsLocked;
    mapping(string => mapping(bytes32 => mapping(uint256 => Lock))) internal investorsPartitionsLocks;
    mapping(string => mapping(bytes32 => uint256)) internal investorsPartitionsLocksCounts;

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[45] private __gap;
}
