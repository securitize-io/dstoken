pragma solidity ^0.5.0;

import "./ServiceConsumerDataStore.sol";

contract ComplianceServiceDataStore is ServiceConsumerDataStore {
    uint256 internal totalInvestors;
    uint256 internal accreditedInvestorsCount;
    uint256 internal usAccreditedInvestorsCount;
    uint256 internal usInvestorsCount;
    mapping(string => uint256) internal euRetailInvestorsCount;
    mapping(string => uint256) internal issuancesCounters;
    mapping(string => mapping(uint256 => uint256)) issuancesValues;
    mapping(string => mapping(uint256 => uint256)) issuancesTimestamps;
}
