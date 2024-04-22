pragma solidity ^0.8.20;

import "./ServiceConsumerDataStore.sol";

//SPDX-License-Identifier: UNLICENSED
contract ComplianceServiceDataStore is ServiceConsumerDataStore {
    uint256 internal totalInvestors;
    uint256 internal accreditedInvestorsCount;
    uint256 internal usAccreditedInvestorsCount;
    uint256 internal usInvestorsCount;
    uint256 internal jpInvestorsCount;
    mapping(string => uint256) internal euRetailInvestorsCount;
    mapping(string => uint256) internal issuancesCounters;
    mapping(string => mapping(uint256 => uint256)) issuancesValues;
    mapping(string => mapping(uint256 => uint256)) issuancesTimestamps;
}
