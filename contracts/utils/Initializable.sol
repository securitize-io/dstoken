pragma solidity ^0.8.20;

//SPDX-License-Identifier: GPL-3.0
contract Initializable {
    bool public initialized = false;

    modifier initializer() {
        require(!initialized, "Contract instance has already been initialized");

        _;

        initialized = true;
    }
}
