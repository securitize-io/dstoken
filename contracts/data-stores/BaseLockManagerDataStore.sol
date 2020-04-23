pragma solidity ^0.5.0;

import "./ServiceConsumerDataStore.sol";

contract BaseLockManagerDataStore is ServiceConsumerDataStore {
    struct Lock {
        uint256 value;
        uint256 reason;
        string reasonString;
        uint256 releaseTime;
    }
}
