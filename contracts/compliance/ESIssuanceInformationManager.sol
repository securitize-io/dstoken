pragma solidity ^0.4.23;

import '../ESServiceConsumer.sol';
import "./DSComplianceServiceInterface.sol";

/**
 * @title ESIssuanceInformationManager
 * @dev An issuance information manager which allows managing compliance information.
 * @dev Implements DSIssuanceInformationManagerInterface and ESServiceConsumer.
 */
contract ESIssuanceInformationManager is DSComplianceServiceInterface, ESServiceConsumer {
  /**
   * @dev The constructor delegates the paramters to ESServiceConsumer.
   */
  //constructor(address _address, string _namespace) public ESServiceConsumer(_address, _namespace) {}

  /**
   * @dev Sets information about an investor.
   * @param _id The investor identifier.
   * @param _informationId The type of information needed to be set.
   * @param _hash The value to be set.
   * @return A boolean that indicates if the operation was successful.
   */
  function setInvestorInformation(string _id, uint8 _informationId, string _hash) public onlyExchangeOrAbove returns (bool) {
    setString8("investors", _id, "compliance", _informationId, _hash);

    emit DSIssuanceInformationManagerInvestorInformationSet(_id, _informationId, _hash, msg.sender);

    return true;
  }

  /**
   * @dev Gets information about an investor.
   * @param _id The investor identifier.
   * @param _informationId The type of information needed to be fetched.
   * @return The value.
   */
  function getInvestorInformation(string _id, uint8 _informationId) public returns (string) {
    return getString8("investors", _id, "compliance", _informationId);
  }

  /**
   * @dev Sets compliance information.
   * @param _informationId The type of information needed to be fetched.
   * @param _value The value to be set.
   * @return A boolean that indicates if the operation was successful.
   */
  function setComplianceInformation(uint8 _informationId, string _value) public onlyIssuerOrAbove returns (bool) {
    setString8("compliance", _informationId, _value);

    emit DSIssuanceInformationManagerComplianceInformationSet(_informationId, _value, msg.sender);

    return true;
  }

  /**
   * @dev Gets compliance information.
   * @param _informationId The type of information needed to be fetched.
   * @return The value.
   */
  function getComplianceInformation(uint8 _informationId) public returns (string) {
    return getString8("compliance", _informationId);
  }
}