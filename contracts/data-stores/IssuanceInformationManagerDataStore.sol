pragma solidity ^0.5.0;

import "./ServiceConsumerDataStore.sol";

contract IssuanceInformationManagerDataStore is ServiceConsumerDataStore {
    mapping(string => mapping(uint8 => string)) internal investorsInformation;
    mapping(uint8 => string) internal complianceInformation;
}
