pragma solidity ^0.8.13;

import "./ServiceConsumerDataStore.sol";

//SPDX-License-Identifier: UNLICENSED
contract OmnibusControllerDataStore is ServiceConsumerDataStore {
    address public omnibusWallet;
    uint8 internal assetTrackingMode;
    mapping(address => uint256) internal balances;
}
