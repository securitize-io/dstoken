pragma solidity ^0.8.13;

import "./ServiceConsumerDataStore.sol";

//SPDX-License-Identifier: UNLICENSED
contract ComplianceConfigurationDataStore is ServiceConsumerDataStore {
    mapping(string => uint256) public countriesCompliances;
    uint256 public totalInvestorsLimit;
    uint256 public minUSTokens;
    uint256 public minEUTokens;
    uint256 public usInvestorsLimit;
    uint256 public jpInvestorsLimit;
    uint256 public usAccreditedInvestorsLimit;
    uint256 public nonAccreditedInvestorsLimit;
    uint256 public maxUSInvestorsPercentage;
    uint256 public blockFlowbackEndTime;
    uint256 public nonUSLockPeriod;
    uint256 public minimumTotalInvestors;
    uint256 public minimumHoldingsPerInvestor;
    uint256 public maximumHoldingsPerInvestor;
    uint256 public euRetailInvestorsLimit;
    uint256 public usLockPeriod;
    bool public forceFullTransfer;
    bool public forceAccreditedUS;
    bool public forceAccredited;
    bool public worldWideForceFullTransfer;
    uint256 public authorizedSecurities;
}
