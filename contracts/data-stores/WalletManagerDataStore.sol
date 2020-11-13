pragma solidity 0.5.17;

import "./ServiceConsumerDataStore.sol";

contract WalletManagerDataStore is ServiceConsumerDataStore {
    mapping(address => uint8) internal walletsTypes;
    mapping(address => mapping(string => mapping(uint8 => uint256))) internal walletsSlots;
}
