pragma solidity ^0.8.20;

import "./ServiceConsumerDataStore.sol";

//SPDX-License-Identifier: UNLICENSED
contract BaseLockManagerDataStore is ServiceConsumerDataStore {
    struct Lock {
        uint256 value;
        uint256 reason;
        string reasonString;
        uint256 releaseTime;
    }
}
