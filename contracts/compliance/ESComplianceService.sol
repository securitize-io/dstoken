pragma solidity ^0.4.23;

import "./DSComplianceServiceInterface.sol";
import "../ESServiceConsumer.sol";
import "./ESLockManager.sol";
import "../token/DSTokenInterface.sol";
import "../zeppelin/math/Math.sol";
import "./ESWalletManager.sol";
import "./ESIssuanceInformationManager.sol";


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
contract ESComplianceService is DSComplianceServiceInterface, ESServiceConsumer {

  constructor(address _address, string _namespace) public ESServiceConsumer(_address, _namespace) {}
  using SafeMath for uint256;

  modifier onlyToken() {
    require(msg.sender == getDSService(DS_TOKEN), "This function can only called by the associated token");
    _;
  }

  function validateIssuance(address _to, uint _value) onlyToken public {
    require(recordIssuance(_to, _value));
  }

  function validate(address _from, address _to, uint _value) onlyToken public {
    uint code;
    string memory reason;

    (code, reason) = preTransferCheck(_from, _to, _value);
    require(code == 0, reason);
    require(recordTransfer(_from, _to, _value));
  }

  function validateBurn(address _who, uint _value) onlyToken public returns (bool){
    require(recordBurn(_who, _value));
  }

  function validateSeize(address _from, address _to, uint _value) onlyToken public returns (bool){

    //Only allow seizing, if the target is an issuer wallet (can be overridden)
    require(getWalletManager().getWalletType(_to) == getWalletManager().ISSUER());
    require(recordSeize(_from, _to, _value));

  }

  function preTransferCheck(address _from, address _to, uint _value) view public returns (uint code, string reason) {
    if (getToken().isPaused()) {
      return (10, "Token Paused");
    }

    if (getToken().balanceOf(_from) < _value) {
      return (15, "Not Enough Tokens");
    }

    if (getLockManager().getTransferableTokens(_from, uint64(now)) < _value) {
      return (16, "Tokens Locked");
    }

    return checkTransfer(_from, _to, _value);
  }



  //These functions should be implemented by the concrete compliance manager

  function recordIssuance(address _to, uint _value) internal returns (bool);
  function checkTransfer(address _from, address _to, uint _value) view internal returns (uint, string);
  function recordTransfer(address _from, address _to, uint _value) internal returns (bool);
  function recordBurn(address _who, uint _value) internal returns (bool);
  function recordSeize(address _from, address _to, uint _value) internal returns (bool);
}