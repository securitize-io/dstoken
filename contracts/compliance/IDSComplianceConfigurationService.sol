pragma solidity ^0.5.0;

import "../utils/VersionedContract.sol";
import "../utils/Initializable.sol";


contract IDSComplianceConfigurationService is Initializable, VersionedContract {
    constructor() internal {}

    function initialize() public {
        VERSIONS.push(4);
    }

    function getCountryCompliance(string memory _country) public view returns (uint256);

    function setCountryCompliance(
        string memory _country,
        uint256 _value /*onlyIssuerOrAbove*/
    ) public;

    function getTotalInvestorsLimit() public view returns (uint256);

    function setTotalInvestorsLimit(
        uint256 _value /*onlyIssuerOrAbove*/
    ) public;

    function getMinUsTokens() public view returns (uint256);

    function setMinUsTokens(
        uint256 _value /*onlyIssuerOrAbove*/
    ) public;

    function getMinEuTokens() public view returns (uint256);

    function setMinEuTokens(
        uint256 _value /*onlyIssuerOrAbove*/
    ) public;

    function getUsInvestorsLimit() public view returns (uint256);

    function setUsInvestorsLimit(
        uint256 _value /*onlyIssuerOrAbove*/
    ) public;

    function getJPInvestorsLimit() public view returns (uint256);

    function setJPInvestorsLimit(
        uint256 _value /*onlyIssuerOrAbove*/
    ) public;

    function getUsAccreditedInvestorsLimit() public view returns (uint256);

    function setUsAccreditedInvestorsLimit(
        uint256 _value /*onlyIssuerOrAbove*/
    ) public;

    function getNonAccreditedInvestorsLimit() public view returns (uint256);

    function setNonAccreditedInvestorsLimit(
        uint256 _value /*onlyIssuerOrAbove*/
    ) public;

    function getMaxUsInvestorsPercentage() public view returns (uint256);

    function setMaxUsInvestorsPercentage(
        uint256 _value /*onlyIssuerOrAbove*/
    ) public;

    function getBlockFlowbackEndTime() public view returns (uint256);

    function setBlockFlowbackEndTime(
        uint256 _value /*onlyIssuerOrAbove*/
    ) public;

    function getNonUsLockPeriod() public view returns (uint256);

    function setNonUsLockPeriod(
        uint256 _value /*onlyIssuerOrAbove*/
    ) public;

    function getMinimumTotalInvestors() public view returns (uint256);

    function setMinimumTotalInvestors(
        uint256 _value /*onlyIssuerOrAbove*/
    ) public;

    function getMinimumHoldingsPerInvestor() public view returns (uint256);

    function setMinimumHoldingsPerInvestor(
        uint256 _value /*onlyIssuerOrAbove*/
    ) public;

    function getMaximumHoldingsPerInvestor() public view returns (uint256);

    function setMaximumHoldingsPerInvestor(
        uint256 _value /*onlyIssuerOrAbove*/
    ) public;

    function getEURetailInvestorsLimit() public view returns (uint256);

    function setEURetailInvestorsLimit(
        uint256 _value /*onlyIssuerOrAbove*/
    ) public;

    function getUsLockPeriod() public view returns (uint256);

    function setUsLockPeriod(
        uint256 _value /*onlyIssuerOrAbove*/
    ) public;

    function getForceFullTransfer() public view returns (bool);

    function setForceFullTransfer(
        bool _value /*onlyIssuerOrAbove*/
    ) public;

    function getForceAccredited() public view returns (bool);

    function setForceAccredited(
        bool _value /*onlyIssuerOrAbove*/
    ) public;

    function setForceAccreditedUS(
        bool _value /*onlyIssuerOrAbove*/
    ) public;

    function getForceAccreditedUS() public view returns (bool);

    function setAll(
        uint256[] memory _uint_values,
        bool[] memory _bool_values /*onlyIssuerOrAbove*/
    ) public;

    function getAll() public view returns (uint256[] memory, bool[] memory);
}
