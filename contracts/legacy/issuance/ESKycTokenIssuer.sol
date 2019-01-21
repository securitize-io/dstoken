pragma solidity ^0.4.23;

import "./DSKycTokenIssuerInterface.sol";
import "../service/ESServiceConsumer.sol";

contract ESKycTokenIssuer is DSKycTokenIssuerInterface, ESServiceConsumer {
  constructor(address _address, string _namespace) public ESServiceConsumer(_address, _namespace) {}

  function issueTokensWithAttributes(string _id, address _to, uint _value, uint _issuanceTime, uint256 _valueLocked, string _reason, uint64 _releaseTime, string _collisionHash, string _country, uint256 _kycApprovedExpiry, uint256 _accreditedQualifiedValue) public onlyIssuerOrAbove returns (bool) {
    if (getRegistryService().isWallet(_to)) {
      require(keccak256(abi.encodePacked(getRegistryService().getInvestor(_to))) == keccak256(abi.encodePacked(_id)), "Wallet does not belong to investor");
    } else {
      if (!getRegistryService().isInvestor(_id)) {
        getRegistryService().registerInvestor(_id, _collisionHash);
        getRegistryService().setCountry(_id, _country);
      }

      getRegistryService().addWallet(_to, _id);
    }

    getRegistryService().setAttribute(_id, getRegistryService().KYC_APPROVED(), getRegistryService().APPROVED(), _kycApprovedExpiry, "");
    getRegistryService().setAttribute(_id, getRegistryService().ACCREDITED(), _accreditedQualifiedValue, 0, "");
    getRegistryService().setAttribute(_id, getRegistryService().QUALIFIED(), _accreditedQualifiedValue, 0, "");

    return getToken().issueTokensCustom(_to, _value, _issuanceTime, _valueLocked, _reason, _releaseTime);
  }
}