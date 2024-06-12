pragma solidity ^0.8.20;

import "./ServiceConsumerDataStore.sol";

//SPDX-License-Identifier: GPL-3.0
contract WalletManagerDataStore is ServiceConsumerDataStore {
    mapping(address => uint8) internal walletsTypes;
    mapping(address => mapping(string => mapping(uint8 => uint256))) internal walletsSlots;

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[48] private __gap;
}
