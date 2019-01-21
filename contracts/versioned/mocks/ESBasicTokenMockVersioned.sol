pragma solidity ^0.4.23;

import "../token/ESBasicTokenVersioned.sol";



// mock class using BasicToken
contract ESBasicTokenMockVersioned is ESBasicTokenVersioned {
    constructor(address _address, string _namespace) public EternalStorageClientVersioned(_address, _namespace) {
      VERSIONS.push(1);
    }

    bool public initialized = false;

    function initialize(address initialAccount, uint256 initialBalance) public onlyOwner {
        require(!initialized);
        setUint("balances", initialAccount, initialBalance);
        setUint("totalSupply", initialBalance);
        initialized = true;
    }

}
