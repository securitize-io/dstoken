pragma solidity ^0.8.13;

import "../utils/VersionedContract.sol";
import "../utils/Initializable.sol";

//SPDX-License-Identifier: UNLICENSED
abstract contract IDSComplianceConfigurationService is Initializable, VersionedContract {

    function initialize() public virtual {
        VERSIONS.push(7);
    }

    event DSComplianceUIntRuleSet(string ruleName, uint256 prevValue, uint256 newValue);
    event DSComplianceBoolRuleSet(string ruleName, bool prevValue, bool newValue);
    event DSComplianceStringToUIntMapRuleSet(string ruleName, string keyValue, uint256 prevValue, uint256 newValue);

    function getCountryCompliance(string memory _country) public view virtual returns (uint256);

    function setCountriesCompliance(string[] memory _countries, uint256[] memory _values) public virtual;

    function setCountryCompliance(
        string memory _country,
        uint256 _value /*onlyIssuerOrAbove*/
    ) public virtual;

    function getTotalInvestorsLimit() public view virtual returns (uint256);

    function setTotalInvestorsLimit(
        uint256 _value /*onlyIssuerOrAbove*/
    ) public virtual;

    function getMinUSTokens() public view virtual returns (uint256);

    function setMinUSTokens(
        uint256 _value /*onlyIssuerOrAbove*/
    ) public virtual;

    function getMinEUTokens() public view virtual returns (uint256);

    function setMinEUTokens(
        uint256 _value /*onlyIssuerOrAbove*/
    ) public virtual;

    function getUSInvestorsLimit() public view virtual returns (uint256);

    function setUSInvestorsLimit(
        uint256 _value /*onlyIssuerOrAbove*/
    ) public virtual;

    function getJPInvestorsLimit() public view virtual returns (uint256);

    function setJPInvestorsLimit(
        uint256 _value /*onlyIssuerOrAbove*/
    ) public virtual;

    function getUSAccreditedInvestorsLimit() public view virtual returns (uint256);

    function setUSAccreditedInvestorsLimit(
        uint256 _value /*onlyIssuerOrAbove*/
    ) public virtual;

    function getNonAccreditedInvestorsLimit() public view virtual returns (uint256);

    function setNonAccreditedInvestorsLimit(
        uint256 _value /*onlyIssuerOrAbove*/
    ) public virtual;

    function getMaxUSInvestorsPercentage() public view virtual returns (uint256);

    function setMaxUSInvestorsPercentage(
        uint256 _value /*onlyIssuerOrAbove*/
    ) public virtual;

    function getBlockFlowbackEndTime() public view virtual returns (uint256);

    function setBlockFlowbackEndTime(
        uint256 _value /*onlyIssuerOrAbove*/
    ) public virtual;

    function getNonUSLockPeriod() public view virtual returns (uint256);

    function setNonUSLockPeriod(
        uint256 _value /*onlyIssuerOrAbove*/
    ) public virtual;

    function getMinimumTotalInvestors() public view virtual returns (uint256);

    function setMinimumTotalInvestors(
        uint256 _value /*onlyIssuerOrAbove*/
    ) public virtual;

    function getMinimumHoldingsPerInvestor() public view virtual returns (uint256);

    function setMinimumHoldingsPerInvestor(
        uint256 _value /*onlyIssuerOrAbove*/
    ) public virtual;

    function getMaximumHoldingsPerInvestor() public view virtual returns (uint256);

    function setMaximumHoldingsPerInvestor(
        uint256 _value /*onlyIssuerOrAbove*/
    ) public virtual;

    function getEURetailInvestorsLimit() public view virtual returns (uint256);

    function setEURetailInvestorsLimit(
        uint256 _value /*onlyIssuerOrAbove*/
    ) public virtual;

    function getUSLockPeriod() public view virtual returns (uint256);

    function setUSLockPeriod(
        uint256 _value /*onlyIssuerOrAbove*/
    ) public virtual;

    function getForceFullTransfer() public view virtual returns (bool);

    function setForceFullTransfer(
        bool _value /*onlyIssuerOrAbove*/
    ) public virtual;

    function getForceAccredited() public view virtual returns (bool);

    function setForceAccredited(
        bool _value /*onlyIssuerOrAbove*/
    ) public virtual;

    function setForceAccreditedUS(
        bool _value /*onlyIssuerOrAbove*/
    ) public virtual;

    function getForceAccreditedUS() public view virtual returns (bool);

    function setWorldWideForceFullTransfer(
        bool _value /*onlyIssuerOrAbove*/
    ) public virtual;

    function getWorldWideForceFullTransfer() public view virtual returns (bool);

    function getAuthorizedSecurities() public view virtual returns (uint256);

    function setAuthorizedSecurities(
        uint256 _value /*onlyIssuerOrAbove*/
    ) public virtual;

    function setAll(
        uint256[] memory _uint_values,
        bool[] memory _bool_values /*onlyIssuerOrAbove*/
    ) public virtual;

    function getAll() public view virtual returns (uint256[] memory, bool[] memory);
}
