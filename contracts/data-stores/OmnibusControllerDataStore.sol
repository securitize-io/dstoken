pragma solidity ^0.5.0;

import "./ServiceConsumerDataStore.sol";

contract OmnibusControllerDataStore is ServiceConsumerDataStore {
    address internal walletAddress;
    mapping(address => uint256) internal balances;
    uint8 internal assetTrackingMode;
}
