pragma solidity ^0.4.23;


import "../token/ERC20/ESBasicToken.sol";


// mock class using BasicToken
contract ESBasicTokenMock is ESBasicToken {

  constructor(address storageAddress, string namespace, address initialAccount, uint256 initialBalance) EternalStorageUser(storageAddress, namespace) public {
    setUint(keccak256("balances", initialAccount), initialBalance);
    setUint(keccak256("totalSupply"), initialBalance);
  }

}
