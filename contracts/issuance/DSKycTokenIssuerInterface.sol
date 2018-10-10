pragma solidity ^0.4.23;

import "../DSServiceConsumerInterface.sol";

contract DSKycTokenIssuerInterface is DSServiceConsumerInterface {
  function issueTokensWithAttributes(string _id, address _to, uint _value, uint _issuanceTime, uint256 _valueLocked, string _reason, uint64 _releaseTime, string _collisionHash, string _country, uint256 _kycApprovedExpiry, uint256 _accreditedQualifiedValue) public /*onlyIssuerOrAbove*/ returns (bool);
}
