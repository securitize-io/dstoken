pragma solidity ^0.5.0;

import "./ServiceConsumerDataStore.sol";

contract OmnibusControllerDataStore is ServiceConsumerDataStore {
    address public omnibusWallet;
    uint8 internal assetTrackingMode;
    mapping(address => uint256) internal balances;
}
