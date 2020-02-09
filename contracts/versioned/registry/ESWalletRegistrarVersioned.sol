pragma solidity ^0.4.23;

import "./DSWalletRegistrarInterfaceVersioned.sol";
import "../service/ESServiceConsumerVersioned.sol";

contract ESWalletRegistrarVersioned is DSWalletRegistrarInterfaceVersioned, ESServiceConsumerVersioned {
  constructor(address _address, string _namespace) public ESServiceConsumerVersioned(_address, _namespace) {
    VERSIONS.push(1);
  }

  function registerWallet(string _id, address[] _wallets, string _collisionHash, string _country,uint8[] _attributeIds, uint[] _attributeValues, uint[] _attributeExpirations) public onlyOwner returns (bool) {
    require(_attributeValues.length == _attributeIds.length);
    require(_attributeIds.length == _attributeExpirations.length);

    if (!getRegistryService().isInvestor(_id)) {
      getRegistryService().registerInvestor(_id, _collisionHash);

      if (bytes(_country).length > 0){
        getRegistryService().setCountry(_id, _country);
      }
    }

    for (uint i = 0; i < _wallets.length; i++) {
      if (getRegistryService().isWallet(_wallets[i])) {
        require(keccak256(abi.encodePacked(getRegistryService().getInvestor(_wallets[i]))) == keccak256(abi.encodePacked(_id)), "Wallet does not belong to investor");
      } else {
        getRegistryService().addWallet(_wallets[i], _id);
      }
    }

    for (i = 0 ; i < _attributeIds.length ; i++){
      getRegistryService().setAttribute(_id, _attributeIds[i] ,_attributeValues[i], _attributeExpirations[i], "");
    }

    return true;
  }
}