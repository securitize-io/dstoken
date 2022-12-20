pragma solidity ^0.8.13;

import "./ServiceConsumerDataStore.sol";

//SPDX-License-Identifier: UNLICENSED
contract WalletManagerDataStore is ServiceConsumerDataStore {
    mapping(address => uint8) internal walletsTypes;
    mapping(address => mapping(string => mapping(uint8 => uint256))) internal walletsSlots;
}
