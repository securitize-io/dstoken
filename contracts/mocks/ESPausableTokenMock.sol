pragma solidity ^0.4.23;

import "../token/ESPausableToken.sol";



// mock class using PausableToken
contract ESPausableTokenMock is ESPausableToken {
    constructor(address _address, string _namespace) public EternalStorageClient(_address, _namespace) {}

    bool public initialized = false;

    function initialize(address initialAccount, uint256 initialBalance) public onlyOwner {
        require(!initialized);
        setUint("balances", initialAccount, initialBalance);
        setUint("totalSupply", initialBalance);
        initialized = true;
    }
}
