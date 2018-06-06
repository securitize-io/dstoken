pragma solidity ^0.4.23;


import "../tokens/ESBasicToken.sol";


// mock class using BasicToken
contract ESBasicTokenMock is ESBasicToken {

  bool public initialized = false;

  function initialize(address initialAccount, uint256 initialBalance) public onlyOwner {
    require(!initialized);
    setUint(keccak256(abi.encodePacked("balances", initialAccount)), initialBalance);
    setUint(keccak256(abi.encodePacked("totalSupply")), initialBalance);
    initialized = true;
  }

}
