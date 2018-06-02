pragma solidity ^0.4.23;


import "../token/ERC20/ESBasicToken.sol";


// mock class using BasicToken
contract ESBasicTokenMock is ESBasicToken {

  constructor(address storageAddress, address initialAccount, uint256 initialBalance) EternalStorageUser(storageAddress) public {
    _storage.setUint(keccak256("balances", initialAccount), initialBalance);
    _storage.setUint(keccak256("totalSupply"), initialBalance);
  }

}
