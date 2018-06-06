pragma solidity ^0.4.23;

import "../token/ESBasicToken.sol";



// mock class using BasicToken
contract ESBasicTokenMock is ESBasicToken {

  bool public initialized = false;

  function initialize(address initialAccount, uint256 initialBalance) public onlyOwner {
    require(!initialized);
    setUint("balances", initialAccount, initialBalance);
    setUint("totalSupply", initialBalance);
    initialized = true;
  }

}
