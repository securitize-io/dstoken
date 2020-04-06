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

    function getMinUSTokens() public view returns (uint256) {
        return minUSTokens;
    }

    function setMinUSTokens(uint256 _value) public onlyIssuerOrAbove {
        minUSTokens = _value;
    }

    function getMinEUTokens() public view returns (uint256) {
        return minEUTokens;
    }

    function setMinEUTokens(uint256 _value) public onlyIssuerOrAbove {
        minEUTokens = _value;
    }

    function getUSInvestorsLimit() public view returns (uint256) {
        return usInvestorsLimit;
    }

    function setUSInvestorsLimit(uint256 _value) public onlyIssuerOrAbove {
        usInvestorsLimit = _value;
    }

    function getJPInvestorsLimit() public view returns (uint256) {
        return jpInvestorsLimit;
    }

    function setJPInvestorsLimit(uint256 _value) public onlyIssuerOrAbove {
        jpInvestorsLimit = _value;
    }

    function getUSAccreditedInvestorsLimit() public view returns (uint256) {
        return usAccreditedInvestorsLimit;
    }

    function setUSAccreditedInvestorsLimit(uint256 _value) public onlyIssuerOrAbove {
        usAccreditedInvestorsLimit = _value;
    }

    function getNonAccreditedInvestorsLimit() public view returns (uint256) {
        return nonAccreditedInvestorsLimit;
    }

    function setNonAccreditedInvestorsLimit(uint256 _value) public onlyIssuerOrAbove {
        nonAccreditedInvestorsLimit = _value;
    }

    function getMaxUSInvestorsPercentage() public view returns (uint256) {
        return maxUsInvestorsPercentage;
    }

    function setMaxUSInvestorsPercentage(uint256 _value) public onlyIssuerOrAbove {
        maxUsInvestorsPercentage = _value;
    }

    function getBlockFlowbackEndTime() public view returns (uint256) {
        return blockFlowbackEndTime;
    }

    function setBlockFlowbackEndTime(uint256 _value) public onlyIssuerOrAbove {
        blockFlowbackEndTime = _value;
    }

    function getNonUSLockPeriod() public view returns (uint256) {
        return nonUSLockPeriod;
    }

    function setNonUSLockPeriod(uint256 _value) public onlyIssuerOrAbove {
        nonUSLockPeriod = _value;
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

    function getEURetailInvestorsLimit() public view returns (uint256) {
        return euRetailInvestorsLimit;
    }

    function setEURetailInvestorsLimit(uint256 _value) public onlyIssuerOrAbove {
        euRetailInvestorsLimit = _value;
    }

    function getUSLockPeriod() public view returns (uint256) {
        return usLockPeriod;
    }

    function setUSLockPeriod(uint256 _value) public onlyIssuerOrAbove {
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
        require(_uint_values.length == 15);
        require(_bool_values.length == 3);
        setTotalInvestorsLimit(_uint_values[0]);
        setMinUSTokens(_uint_values[1]);
        setMinEUTokens(_uint_values[2]);
        setUSInvestorsLimit(_uint_values[3]);
        setUSAccreditedInvestorsLimit(_uint_values[4]);
        setNonAccreditedInvestorsLimit(_uint_values[5]);
        setMaxUSInvestorsPercentage(_uint_values[6]);
        setBlockFlowbackEndTime(_uint_values[7]);
        setNonUSLockPeriod(_uint_values[8]);
        setMinimumTotalInvestors(_uint_values[9]);
        setMinimumHoldingsPerInvestor(_uint_values[10]);
        setMaximumHoldingsPerInvestor(_uint_values[11]);
        setEURetailInvestorsLimit(_uint_values[12]);
        setUSLockPeriod(_uint_values[13]);
        setJPInvestorsLimit(_uint_values[14]);
        setForceFullTransfer(_bool_values[0]);
        setForceAccredited(_bool_values[1]);
        setForceAccreditedUS(_bool_values[2]);
    }

    function getAll() public view returns (uint256[] memory, bool[] memory) {
        uint256[] memory uintValues = new uint256[](15);
        bool[] memory boolValues = new bool[](3);

        uintValues[0] = getTotalInvestorsLimit();
        uintValues[1] = getMinUSTokens();
        uintValues[2] = getMinEUTokens();
        uintValues[3] = getUSInvestorsLimit();
        uintValues[4] = getUSAccreditedInvestorsLimit();
        uintValues[5] = getNonAccreditedInvestorsLimit();
        uintValues[6] = getMaxUSInvestorsPercentage();
        uintValues[7] = getBlockFlowbackEndTime();
        uintValues[8] = getNonUSLockPeriod();
        uintValues[9] = getMinimumTotalInvestors();
        uintValues[10] = getMinimumHoldingsPerInvestor();
        uintValues[11] = getMaximumHoldingsPerInvestor();
        uintValues[12] = getEURetailInvestorsLimit();
        uintValues[13] = getUSLockPeriod();
        uintValues[14] = getJPInvestorsLimit();
        boolValues[0] = getForceFullTransfer();
        boolValues[1] = getForceAccredited();
        boolValues[2] = getForceAccreditedUS();
        return (uintValues, boolValues);
    }
}
