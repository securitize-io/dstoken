pragma solidity ^0.8.20;

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
    bool public disallowBackDating;

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[45] private __gap;
}
