pragma solidity ^0.4.23;


import "../token/ERC20/ESBasicToken.sol";


// mock class using BasicToken
contract ESBasicTokenMock is ESBasicToken {
  constructor(address _address, string _namespace) public ESBasicToken(_address, _namespace) {}

  bool public initialized = false;

  function initialize(address initialAccount, uint256 initialBalance) public onlyOwner {
    require(!initialized);
    setUint(keccak256("balances", initialAccount), initialBalance);
    setUint(keccak256("totalSupply"), initialBalance);
    initialized = true;
  }

}
