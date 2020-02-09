pragma solidity ^0.4.23;

import "../service/DSServiceConsumerInterfaceVersioned.sol";

contract DSWalletRegistrarInterfaceVersioned is DSServiceConsumerInterfaceVersioned {
  constructor() internal {
    VERSIONS.push(1);
  }

  function registerWallet(string _id, address[] _wallets, string _collisionHash, string _country,uint8[] _attributeIds, uint[] _attributeValues, uint[] _attributeExpirations) public /*onlyOwner*/ returns (bool);
}
