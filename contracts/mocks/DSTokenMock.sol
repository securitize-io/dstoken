pragma solidity ^0.4.23;

import "../token/DSToken.sol";



// mock class using DSToken
contract DSTokenMock is DSToken {
    constructor(address _address) public DSToken("DSTokenMock", "DST", 18, _address, "DSTokenMock") {}

    bool public initialized = false;

    function initialize(address initialAccount, uint256 initialBalance) public onlyOwner {
        require(!initialized);
        setUint("balances", initialAccount, initialBalance);
        setUint("totalSupply", initialBalance);
        initialized = true;
    }

}
