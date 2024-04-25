pragma solidity ^0.8.20;

import "./ServiceConsumerDataStore.sol";

//SPDX-License-Identifier: GPL-3.0
contract OmnibusControllerDataStore is ServiceConsumerDataStore {
    address public omnibusWallet;
    uint8 internal assetTrackingMode;
    mapping(address => uint256) internal balances;
}
