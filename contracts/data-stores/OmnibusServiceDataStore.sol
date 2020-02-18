pragma solidity ^0.5.0;

import "./ServiceConsumerDataStore.sol";

contract OmnibusServiceDataStore is ServiceConsumerDataStore {
    struct OmnibusWallet {
        mapping(address => uint256) balances;
        uint8 assetTrackingMode;
    }

    mapping(address => OmnibusWallet) internal wallets;
}
