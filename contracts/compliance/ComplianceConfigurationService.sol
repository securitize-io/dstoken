pragma solidity ^0.5.0;

import "./IDSComplianceConfigurationService.sol";
import "../data-stores/ComplianceConfigurationDataStore.sol";
import "../service/ServiceConsumer.sol";
import "../utils/ProxyTarget.sol";

contract ComplianceConfigurationService is ProxyTarget, IDSComplianceConfigurationService, ServiceConsumer, ComplianceConfigurationDataStore {
    function initialize() public initializer onlyFromProxy {
        IDSComplianceConfigurationService.initialize();
        ServiceConsumer.initialize();
        VERSIONS.push(4);
    }

    string internal constant COUNTRIES = "countries";
    string internal constant FORCE_FULL_TRANSFER = "force_full_transfer";
    string internal constant MIN_US_TOKENS = "min_us_tokens";
    string internal constant MIN_EU_TOKENS = "min_eu_tokens";
    string internal constant TOTAL_INVESTORS_LIMIT = "total_investors_limit";
    string internal constant US_INVESTORS_LIMIT = "us_investors_limit";
    string internal constant US_ACCREDITED_INVESTORS_LIMIT = "us_accredited_investors_limit";
    string internal constant NON_ACCREDITED_INVESTORS_LIMIT = "non_accredited_investors_limit";
    string internal constant MAX_US_INVESTORS_PERCENTAGE = "max_us_investors_percentage";
    string internal constant BLOCK_FLOWBACK_END_TIME = "block_flowback_end_time";
    string internal constant NON_US_LOCK_PERIOD = "non_us_lock_period";
    string internal constant MINIMUM_TOTAL_INVESTORS = "minimum_total_investors";
    string internal constant MINIMUM_HOLDINGS_PER_INVESTOR = "minimum_holdings_per_investor";
    string internal constant MAXIMUM_HOLDINGS_PER_INVESTOR = "maximum_holdings_per_investor";
    string internal constant FORCE_ACCREDITED = "force_accredited";
    string internal constant FORCE_ACCREDITED_US = "force_accredited_us";
    string internal constant EU_RETAIL_LIMIT = "eu_retail_limit";
    string internal constant US_LOCK_PERIOD = "us_lock_period";

    function setCountryCompliance(string memory _country, uint256 _value) public onlyIssuerOrAbove {
        countriesCompliances[_country] = _value;
    }

    function getCountryCompliance(string memory _country) public view returns (uint256) {
        return countriesCompliances[_country];
    }

    function getTotalInvestorsLimit() public view returns (uint256) {
        return totalInvestorLimit;
    }

    function setTotalInvestorsLimit(uint256 _value) public onlyIssuerOrAbove {
        totalInvestorLimit = _value;
    }

    function getMinUsTokens() public view returns (uint256) {
        return minUsTokens;
    }

    function setMinUsTokens(uint256 _value) public onlyIssuerOrAbove {
        minUsTokens = _value;
    }

    function getMinEuTokens() public view returns (uint256) {
        return minEuTokens;
    }

    function setMinEuTokens(uint256 _value) public onlyIssuerOrAbove {
        minEuTokens = _value;
    }

    function getUsInvestorsLimit() public view returns (uint256) {
        return usInvestorsLimit;
    }

    function setUsInvestorsLimit(uint256 _value) public onlyIssuerOrAbove {
        usInvestorsLimit = _value;
    }

    function getUsAccreditedInvestorsLimit() public view returns (uint256) {
        return usAccreditedInvestorsLimit;
    }

    function setUsAccreditedInvestorsLimit(uint256 _value) public onlyIssuerOrAbove {
        usAccreditedInvestorsLimit = _value;
    }

    function getNonAccreditedInvestorsLimit() public view returns (uint256) {
        return nonAccreditedInvestorsLimit;
    }

    function setNonAccreditedInvestorsLimit(uint256 _value) public onlyIssuerOrAbove {
        nonAccreditedInvestorsLimit = _value;
    }

    function getMaxUsInvestorsPercentage() public view returns (uint256) {
        return maxUsInvestorsPercentage;
    }

    function setMaxUsInvestorsPercentage(uint256 _value) public onlyIssuerOrAbove {
        maxUsInvestorsPercentage = _value;
    }

    function getBlockFlowbackEndTime() public view returns (uint256) {
        return blockFlowbackEndTime;
    }

    function setBlockFlowbackEndTime(uint256 _value) public onlyIssuerOrAbove {
        blockFlowbackEndTime = _value;
    }

    function getNonUsLockPeriod() public view returns (uint256) {
        return nonUsLockPeriod;
    }

    function setNonUsLockPeriod(uint256 _value) public onlyIssuerOrAbove {
        nonUsLockPeriod = _value;
    }

    function getMinimumTotalInvestors() public view returns (uint256) {
        return minimumTotalInvestors;
    }

    function setMinimumTotalInvestors(uint256 _value) public onlyIssuerOrAbove {
        minimumTotalInvestors = _value;
    }

    function getMinimumHoldingsPerInvestor() public view returns (uint256) {
        return minimumHoldingsPerInvestor;
    }

    function setMinimumHoldingsPerInvestor(uint256 _value) public onlyIssuerOrAbove {
        minimumHoldingsPerInvestor = _value;
    }

    function getMaximumHoldingsPerInvestor() public view returns (uint256) {
        return maximumHoldingsPerInvestor;
    }

    function setMaximumHoldingsPerInvestor(uint256 _value) public onlyIssuerOrAbove {
        maximumHoldingsPerInvestor = _value;
    }

    function getEuRetailLimit() public view returns (uint256) {
        return euRetailLimit;
    }

    function setEuRetailLimit(uint256 _value) public onlyIssuerOrAbove {
        euRetailLimit = _value;
    }

    function getUsLockPeriod() public view returns (uint256) {
        return usLockPeriod;
    }

    function setUsLockPeriod(uint256 _value) public onlyIssuerOrAbove {
        usLockPeriod = _value;
    }

    function getForceFullTransfer() public view returns (bool) {
        return forceFullTransfer;
    }

    function setForceFullTransfer(bool _value) public onlyIssuerOrAbove {
        forceFullTransfer = _value;
    }

    function getForceAccreditedUS() public view returns (bool) {
        return forceAccreditedUS;
    }

    function setForceAccreditedUS(bool _value) public onlyIssuerOrAbove {
        forceAccreditedUS = _value;
    }

    function getForceAccredited() public view returns (bool) {
        return forceAccredited;
    }

    function setForceAccredited(bool _value) public onlyIssuerOrAbove {
        forceAccredited = _value;
    }

    function setAll(uint256[] memory _uint_values, bool[] memory _bool_values) public onlyIssuerOrAbove {
        require(_uint_values.length == 14);
        require(_bool_values.length == 3);
        setTotalInvestorsLimit(_uint_values[0]);
        setMinUsTokens(_uint_values[1]);
        setMinEuTokens(_uint_values[2]);
        setUsInvestorsLimit(_uint_values[3]);
        setUsAccreditedInvestorsLimit(_uint_values[4]);
        setNonAccreditedInvestorsLimit(_uint_values[5]);
        setMaxUsInvestorsPercentage(_uint_values[6]);
        setBlockFlowbackEndTime(_uint_values[7]);
        setNonUsLockPeriod(_uint_values[8]);
        setMinimumTotalInvestors(_uint_values[9]);
        setMinimumHoldingsPerInvestor(_uint_values[10]);
        setMaximumHoldingsPerInvestor(_uint_values[11]);
        setEuRetailLimit(_uint_values[12]);
        setUsLockPeriod(_uint_values[13]);
        setForceFullTransfer(_bool_values[0]);
        setForceAccredited(_bool_values[1]);
        setForceAccreditedUS(_bool_values[2]);
    }

    function getAll() public view returns (uint256[] memory, bool[] memory) {
        uint256[] memory uintValues = new uint256[](14);
        bool[] memory boolValues = new bool[](3);

        uintValues[0] = getTotalInvestorsLimit();
        uintValues[1] = getMinUsTokens();
        uintValues[2] = getMinEuTokens();
        uintValues[3] = getUsInvestorsLimit();
        uintValues[4] = getUsAccreditedInvestorsLimit();
        uintValues[5] = getNonAccreditedInvestorsLimit();
        uintValues[6] = getMaxUsInvestorsPercentage();
        uintValues[7] = getBlockFlowbackEndTime();
        uintValues[8] = getNonUsLockPeriod();
        uintValues[9] = getMinimumTotalInvestors();
        uintValues[10] = getMinimumHoldingsPerInvestor();
        uintValues[11] = getMaximumHoldingsPerInvestor();
        uintValues[12] = getEuRetailLimit();
        uintValues[13] = getUsLockPeriod();
        boolValues[0] = getForceFullTransfer();
        boolValues[1] = getForceAccredited();
        boolValues[2] = getForceAccreditedUS();
        return (uintValues, boolValues);
    }
}
