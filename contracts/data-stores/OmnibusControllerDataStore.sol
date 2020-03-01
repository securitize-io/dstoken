pragma solidity ^0.5.0;

import "./ServiceConsumerDataStore.sol";

contract OmnibusControllerDataStore is ServiceConsumerDataStore {
    address public omnibusWallet;
    mapping(address => uint256) public balances;
    uint8 public assetTrackingMode;
}
