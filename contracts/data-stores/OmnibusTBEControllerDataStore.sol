pragma solidity ^0.8.13;

import "./ServiceConsumerDataStore.sol";

//SPDX-License-Identifier: UNLICENSED
contract OmnibusTBEControllerDataStore is ServiceConsumerDataStore {
    address internal omnibusWallet;
    bool internal isPartitionedToken;
}
