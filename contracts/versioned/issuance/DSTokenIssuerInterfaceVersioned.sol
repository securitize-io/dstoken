pragma solidity ^0.4.23;

import "../service/DSServiceConsumerInterfaceVersioned.sol";

contract DSTokenIssuerInterfaceVersioned is DSServiceConsumerInterfaceVersioned {
  constructor() internal {
    VERSIONS.push(1);
  }

  function issueTokens(string _id, address _to, uint[] _issuanceValues, string _reason, uint[] _locksValues, uint64[] _releaseTimes, string _collisionHash, string _country, uint[] attributeValues, uint[] attributeExpirations) public /*onlyIssuerOrAbove*/ returns (bool);
}
