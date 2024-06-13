pragma solidity ^0.8.20;

import "./ServiceConsumerDataStore.sol";

//SPDX-License-Identifier: GPL-3.0
contract BaseLockManagerDataStore is ServiceConsumerDataStore {
    struct Lock {
        uint256 value;
        uint256 reason;
        string reasonString;
        uint256 releaseTime;
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[50] private __gap;
}
