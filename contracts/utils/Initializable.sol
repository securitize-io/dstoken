pragma solidity ^0.8.13;

//SPDX-License-Identifier: UNLICENSED
contract Initializable {
    bool public initialized = false;

    modifier initializer() {
        require(!initialized, "Contract instance has already been initialized");

        _;

        initialized = true;
    }
}
