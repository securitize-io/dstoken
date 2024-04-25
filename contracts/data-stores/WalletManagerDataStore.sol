pragma solidity ^0.8.20;

import "./ServiceConsumerDataStore.sol";

//SPDX-License-Identifier: GPL-3.0
contract WalletManagerDataStore is ServiceConsumerDataStore {
    mapping(address => uint8) internal walletsTypes;
    mapping(address => mapping(string => mapping(uint8 => uint256))) internal walletsSlots;
}
