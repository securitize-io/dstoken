pragma solidity ^0.5.0;

contract Initializable {
    bool public initialized = false;

    modifier initializer() {
        require(!initialized, "Contract instance has already been initialized");

        _;

        initialized = true;
    }

    modifier isNotInitialized() {
        require(!initialized, "Contract instance has already been initialized");

        _;
    }
}
