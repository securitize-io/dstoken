pragma solidity ^0.5.0;

import "../service/ServiceConsumer.sol";
import "./IDSIssuanceInformationManager.sol";
import "../utils/ProxyTarget.sol";
import "../utils/Initializable.sol";
import "../data-stores/IssuanceInformationManagerDataStore.sol";

/**
 * @title IssuanceInformationManager
 * @dev An issuance information manager which allows managing compliance information.
 * @dev Implements IDSIssuanceInformationManager and ServiceConsumer.
 */
contract IssuanceInformationManager is ProxyTarget, Initializable, IDSIssuanceInformationManager, ServiceConsumer, IssuanceInformationManagerDataStore {
    function initialize() public initializer onlyFromProxy {
        VERSIONS.push(1);
    }

    /**
   * @dev Sets information about an investor.
   * @param _id The investor identifier.
   * @param _informationId The type of information needed to be set.
   * @param _hash The value to be set.
   * @return A boolean that indicates if the operation was successful.
   */
    function setInvestorInformation(string memory _id, uint8 _informationId, string memory _hash) public onlyExchangeOrAbove returns (bool) {
        investorsInformation[_id][_informationId] = _hash;

        emit DSIssuanceInformationManagerInvestorInformationSet(_id, _informationId, _hash, msg.sender);

        return true;
    }

    /**
   * @dev Gets information about an investor.
   * @param _id The investor identifier.
   * @param _informationId The type of information needed to be fetched.
   * @return The value.
   */
    function getInvestorInformation(string memory _id, uint8 _informationId) public view returns (string memory) {
        return investorsInformation[_id][_informationId];
    }

    /**
   * @dev Sets compliance information.
   * @param _informationId The type of information needed to be fetched.
   * @param _value The value to be set.
   * @return A boolean that indicates if the operation was successful.
   */
    function setComplianceInformation(uint8 _informationId, string memory _value) public onlyIssuerOrAbove returns (bool) {
        complianceInformation[_informationId] = _value;

        emit DSIssuanceInformationManagerComplianceInformationSet(_informationId, _value, msg.sender);

        return true;
    }

    /**
   * @dev Gets compliance information.
   * @param _informationId The type of information needed to be fetched.
   * @return The value.
   */
    function getComplianceInformation(uint8 _informationId) public view returns (string memory) {
        return complianceInformation[_informationId];
    }
}
