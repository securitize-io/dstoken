pragma solidity ^0.4.23;

import "../DSServiceConsumerInterface.sol";

contract DSTokenIssuerInterface is DSServiceConsumerInterface {
  function issueTokens(string _id, address _to, uint[] _issuanceValues, string _reason, uint[] _locksValues, uint64[] _releaseTimes, string _collisionHash, string _country, uint[] attributeValues, uint[] attributeExpirations) public /*onlyIssuerOrAbove*/ returns (bool);
}
