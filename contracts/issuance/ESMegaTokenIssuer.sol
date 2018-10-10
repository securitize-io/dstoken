pragma solidity ^0.4.23;

import "./DSMegaTokenIssuerInterface.sol";
import "../ESServiceConsumer.sol";

contract ESMegaTokenIssuer is DSMegaTokenIssuerInterface, ESServiceConsumer {
  constructor(address _address, string _namespace) public ESServiceConsumer(_address, _namespace) {}

  function issueTokens(string _id, address _to, uint[] _issuanceValues, string _reason, uint[] _locksValues, uint64[] _lockReleaseTimes, string _collisionHash, string _country, uint[] _attributeValues, uint[] _attributeExpirations) public onlyIssuerOrAbove returns (bool) {
    require(_issuanceValues.length == 2);
    require(_attributeValues.length == 3);
    require(_attributeExpirations.length == 3);
    require(_locksValues.length == _lockReleaseTimes.length);

    if (getRegistryService().isWallet(_to)) {
      require(keccak256(abi.encodePacked(getRegistryService().getInvestor(_to))) == keccak256(abi.encodePacked(_id)), "Wallet does not belong to investor");
    } else {
      if (!getRegistryService().isInvestor(_id)) {
        getRegistryService().registerInvestor(_id, _collisionHash);
        getRegistryService().setCountry(_id, _country);
      }

      getRegistryService().addWallet(_to, _id);
    }

    getRegistryService().setAttribute(_id, getRegistryService().KYC_APPROVED(), _attributeValues[0], _attributeExpirations[0], "");
    getRegistryService().setAttribute(_id, getRegistryService().ACCREDITED(), _attributeValues[1], _attributeExpirations[1], "");
    getRegistryService().setAttribute(_id, getRegistryService().QUALIFIED(), _attributeValues[2], _attributeExpirations[2], "");

    getToken().issueTokensCustom(_to, _issuanceValues[0], _issuanceValues[1], 0, "", 0);

    for (uint256 i = 0; i < _locksValues.length; i++) {
      getLockManager().addManualLockRecord(_to, _locksValues[i], _reason, _lockReleaseTimes[i]);
    }

    return true;
  }
}