pragma solidity ^0.4.23;

import "../DSServiceConsumerInterface.sol";

contract DSOldTokenIssuerInterface is DSServiceConsumerInterface {
  function issueTokens(string _id, address _to, uint _value, uint _issuanceTime, uint256 _valueLocked, string _reason, uint64 _releaseTime, string _collisionHash, string _country) public /*onlyIssuerOrAbove*/ returns (bool);
}
