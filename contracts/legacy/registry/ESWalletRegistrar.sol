pragma solidity ^0.4.23;

import "./DSWalletRegistrarInterface.sol";
import "../service/ESServiceConsumer.sol";

contract ESWalletRegistrar is DSWalletRegistrarInterface, ESServiceConsumer {
  constructor(address _address, string _namespace) public ESServiceConsumer(_address, _namespace) {}

  function registerWallet(string _id, address _wallet, string _collisionHash, string _country, uint[] _attributeValues, uint[] _attributeExpirations) public onlyOwner returns (bool) {
    require(_attributeValues.length == 3);
    require(_attributeExpirations.length == 3);

    if (getRegistryService().isWallet(_wallet)) {
      require(keccak256(abi.encodePacked(getRegistryService().getInvestor(_wallet))) == keccak256(abi.encodePacked(_id)), "Wallet does not belong to investor");
    } else {
      if (!getRegistryService().isInvestor(_id)) {
        getRegistryService().registerInvestor(_id, _collisionHash);
        getRegistryService().setCountry(_id, _country);
      }

      getRegistryService().addWallet(_wallet, _id);
    }

    getRegistryService().setAttribute(_id, getRegistryService().KYC_APPROVED(), _attributeValues[0], _attributeExpirations[0], "");
    getRegistryService().setAttribute(_id, getRegistryService().ACCREDITED(), _attributeValues[1], _attributeExpirations[1], "");
    getRegistryService().setAttribute(_id, getRegistryService().QUALIFIED(), _attributeValues[2], _attributeExpirations[2], "");

    return true;
  }
}