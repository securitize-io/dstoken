pragma solidity ^0.4.23;

import "./DSTokenIssuerInterface.sol";
import "../ESServiceConsumer.sol";

contract ESTokenIssuer is DSTokenIssuerInterface, ESServiceConsumer {
  constructor(address _address, string _namespace) public ESServiceConsumer(_address, _namespace) {}

  function issueTokens(string _id, address _to, uint _value, uint _issuanceTime, uint256 _valueLocked, string _reason, uint64 _releaseTime, string _collisionHash, string _country) public onlyIssuerOrAbove returns (bool) {
    if (getRegistryService().isWallet(_to)) {
      require(keccak256(abi.encodePacked(getRegistryService().getInvestor(_to))) == keccak256(abi.encodePacked(_id)), "Wallet does not belong to investor");
    } else {
      if (!getRegistryService().isInvestor(_id)) {
        getRegistryService().registerInvestor(_id, _collisionHash);
        getRegistryService().setCountry(_id, _country);
      }

      getRegistryService().addWallet(_to, _id);
    }

    return getToken().issueTokensCustom(_to, _value, _issuanceTime, _valueLocked, _reason, _releaseTime);
  }
}