pragma solidity ^0.4.23;

import "./DSComplianceServiceInterfaceVersioned.sol";
import "../service/ESServiceConsumerVersioned.sol";
import "./ESLockManagerVersioned.sol";
import "../token/DSTokenInterfaceVersioned.sol";
import "../../zeppelin/math/Math.sol";
import "./ESWalletManagerVersioned.sol";
import "./ESIssuanceInformationManagerVersioned.sol";


/**
*   @title Compliance service main implementation (based on eternal storage).
*
*   Combines the different implementation files for the compliance service and serves as a base class for
*   concrete implementation.
*
*   To create a concrete implementation of a compliance service, one should inherit from this contract,
*   and implement the five functions - recordIssuance,checkTransfer,recordTransfer,recordBurn and recordSeize.
*   The rest of the functions should only be overridden in rare circumstances.
*/
contract ESComplianceServiceVersioned is DSComplianceServiceInterfaceVersioned, ESServiceConsumerVersioned {

  constructor(address _address, string _namespace) public ESServiceConsumerVersioned(_address, _namespace) {
    VERSIONS.push(2);
  }

  using SafeMath for uint256;

  function validateIssuance(address _to, uint _value, uint _issuanceTime) onlyToken public returns (bool) {
    uint code;
    string memory reason;

    (code, reason) = preIssuanceCheck(_to, _value);
    require(code == 0, reason);
    require(recordIssuance(_to, _value, _issuanceTime));

    return true;
  }

  function validate(address _from, address _to, uint _value) onlyToken public returns (bool) {
    uint code;
    string memory reason;

    (code, reason) = preTransferCheck(_from, _to, _value);
    require(code == 0, reason);
    require(recordTransfer(_from, _to, _value));

    return true;
  }

  function validateBurn(address _who, uint _value) onlyToken public returns (bool){
    require(recordBurn(_who, _value));

    return true;
  }

  function validateSeize(address _from, address _to, uint _value) onlyToken public returns (bool){
    require(getWalletManager().getWalletType(_to) == getWalletManager().ISSUER());
    require(recordSeize(_from, _to, _value));

    return true;
  }

  function preTransferCheck(address _from, address _to, uint _value) view public returns (uint code, string reason) {
    if (getToken().isPaused()) {
      return (10, TOKEN_PAUSED);
    }

    if (getToken().balanceOf(_from) < _value) {
      return (15, NOT_ENOUGH_TOKENS);
    }

    if (getLockManager().getTransferableTokens(_from, uint64(now)) < _value) {
      return (16, TOKENS_LOCKED);
    }

    return checkTransfer(_from, _to, _value);
  }

  function preIssuanceCheck(address /*_to*/, uint /*_value*/) view public returns (uint code, string reason) {
    if (getToken().isPaused()) {
      return (10, TOKEN_PAUSED);
    }

    return (0, VALID);
  }

    function adjustInvestorCountsAfterCountryChange(string _id,string _country,string _prevCountry) public returns (bool) {
        return true;
    }

  // These functions should be implemented by the concrete compliance manager

  function recordIssuance(address _to, uint _value, uint _issuanceTime) internal returns (bool);
  function recordTransfer(address _from, address _to, uint _value) internal returns (bool);
  function recordBurn(address _who, uint _value) internal returns (bool);
  function recordSeize(address _from, address _to, uint _value) internal returns (bool);
  function checkTransfer(address _from, address _to, uint _value) view internal returns (uint, string);
}