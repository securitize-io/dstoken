pragma solidity ^0.4.23;

import "../DSServiceConsumerInterface.sol";
import "../zeppelin/token/ERC20/ERC20.sol";

contract DSComplianceServiceInterface is DSServiceConsumerInterface {
  uint public constant NONE = 0;
  uint public constant US = 1;
  uint public constant EU = 2;
  uint public constant FORBIDDEN = 4;

  modifier onlyToken() {
    assert(false);
    _;
  }

  //*****************************************
  // TOKEN ACTION VALIDATIONS
  //*****************************************

  function validateIssuance(address _to, uint _value) /*onlyToken*/ public;

  function validateBurn(address _who, uint _value) /*onlyToken*/ public returns (bool);

  function validateSeize(address _from, address _to, uint _value) /*onlyToken*/ public returns (bool);

  function validate(address _from, address _to, uint _value) /*onlyToken*/ public;

  function preIssuanceCheck(address _to, uint _value) view public returns (uint code, string reason);

  function preTransferCheck(address _from, address _to, uint _value) view public returns (uint code, string reason);

  function setCountryCompliance(string _country, uint _value) /*onlyIssuerOrAbove*/ public returns (bool);

  function getCountryCompliance(string _country) view public returns (uint);
}