pragma solidity ^0.5.0;

import "./ServiceConsumerDataStore.sol";


contract ComplianceConfigurationDataStore is ServiceConsumerDataStore {
    mapping(string => uint256) public countriesCompliances;
    uint256 public totalInvestorLimit;
    uint256 public minUSTokens;
    uint256 public minEUTokens;
    uint256 public usInvestorsLimit;
    uint256 public jpInvestorsLimit;
    uint256 public usAccreditedInvestorsLimit;
    uint256 public nonAccreditedInvestorsLimit;
    uint256 public maxUsInvestorsPercentage;
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
}
