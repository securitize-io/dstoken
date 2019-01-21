pragma solidity ^0.4.23;

import "../service/DSServiceConsumerInterface.sol";

contract DSWalletRegistrarInterface is DSServiceConsumerInterface {
  function registerWallet(string _id, address _wallet, string _collisionHash, string _country, uint[] _attributeValues, uint[] _attributeExpirations) public /*onlyOwner*/ returns (bool);
}
