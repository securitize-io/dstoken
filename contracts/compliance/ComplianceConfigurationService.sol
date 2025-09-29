/**
 * Copyright 2025 Securitize Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

pragma solidity 0.8.22;

import {IDSComplianceConfigurationService} from "./IDSComplianceConfigurationService.sol";
import {ComplianceConfigurationDataStore} from "../data-stores/ComplianceConfigurationDataStore.sol";
import {BaseDSContract} from "../utils/BaseDSContract.sol";

contract ComplianceConfigurationService is IDSComplianceConfigurationService, ComplianceConfigurationDataStore, BaseDSContract {

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public override onlyProxy initializer {
        __BaseDSContract_init();
    }

    function setCountriesCompliance(string[] calldata _countries, uint256[] calldata _values) public override onlyTransferAgentOrAbove {
        require(_countries.length <= 35, "Exceeded the maximum number of countries");
        require(_countries.length == _values.length, "Wrong length of parameters");
        for (uint i = 0; i < _countries.length; i++) {
            setCountryCompliance(_countries[i], _values[i]);
        }
    }

    function setCountryCompliance(string calldata _country, uint256 _value) public override onlyTransferAgentOrAbove {
        emit DSComplianceStringToUIntMapRuleSet("countryCompliance", _country, countriesCompliances[_country], _value);
        countriesCompliances[_country] = _value;
    }

    function getCountryCompliance(string calldata _country) public view override returns (uint256) {
        return countriesCompliances[_country];
    }

    function getTotalInvestorsLimit() public view override returns (uint256) {
        return totalInvestorsLimit;
    }

    function setTotalInvestorsLimit(uint256 _value) public override onlyTransferAgentOrAbove {
        emit DSComplianceUIntRuleSet("totalInvestorsLimit", totalInvestorsLimit, _value);
        totalInvestorsLimit = _value;
    }

    function getMinUSTokens() public view override returns (uint256) {
        return minUSTokens;
    }

    function setMinUSTokens(uint256 _value) public override onlyTransferAgentOrAbove {
        emit DSComplianceUIntRuleSet("minUSTokens", minUSTokens, _value);
        minUSTokens = _value;
    }

    function getMinEUTokens() public view override returns (uint256) {
        return minEUTokens;
    }

    function setMinEUTokens(uint256 _value) public override onlyTransferAgentOrAbove {
        emit DSComplianceUIntRuleSet("minEUTokens", minEUTokens, _value);
        minEUTokens = _value;
    }

    function getUSInvestorsLimit() public view override returns (uint256) {
        return usInvestorsLimit;
    }

    function setUSInvestorsLimit(uint256 _value) public override onlyTransferAgentOrAbove {
        emit DSComplianceUIntRuleSet("usInvestorsLimit", usInvestorsLimit, _value);
        usInvestorsLimit = _value;
    }

    function getJPInvestorsLimit() public view override returns (uint256) {
        return jpInvestorsLimit;
    }

    function setJPInvestorsLimit(uint256 _value) public override onlyTransferAgentOrAbove {
        emit DSComplianceUIntRuleSet("jpInvestorsLimit", jpInvestorsLimit, _value);
        jpInvestorsLimit = _value;
    }

    function getUSAccreditedInvestorsLimit() public view override returns (uint256) {
        return usAccreditedInvestorsLimit;
    }

    function setUSAccreditedInvestorsLimit(uint256 _value) public override onlyTransferAgentOrAbove {
        emit DSComplianceUIntRuleSet("usAccreditedInvestorsLimit", usAccreditedInvestorsLimit, _value);
        usAccreditedInvestorsLimit = _value;
    }

    function getNonAccreditedInvestorsLimit() public view override returns (uint256) {
        return nonAccreditedInvestorsLimit;
    }

    function setNonAccreditedInvestorsLimit(uint256 _value) public override onlyTransferAgentOrAbove {
        emit DSComplianceUIntRuleSet("nonAccreditedInvestorsLimit", nonAccreditedInvestorsLimit, _value);
        nonAccreditedInvestorsLimit = _value;
    }

    function getMaxUSInvestorsPercentage() public view override returns (uint256) {
        return maxUSInvestorsPercentage;
    }

    function setMaxUSInvestorsPercentage(uint256 _value) public override onlyTransferAgentOrAbove {
        emit DSComplianceUIntRuleSet("maxUSInvestorsPercentage", maxUSInvestorsPercentage, _value);
        maxUSInvestorsPercentage = _value;
    }

    function getBlockFlowbackEndTime() public view override returns (uint256) {
        return blockFlowbackEndTime;
    }

    function setBlockFlowbackEndTime(uint256 _value) public override onlyTransferAgentOrAbove {
        emit DSComplianceUIntRuleSet("blockFlowbackEndTime", blockFlowbackEndTime, _value);
        blockFlowbackEndTime = _value;
    }

    function getNonUSLockPeriod() public view override returns (uint256) {
        return nonUSLockPeriod;
    }

    function setNonUSLockPeriod(uint256 _value) public override onlyTransferAgentOrAbove {
        emit DSComplianceUIntRuleSet("nonUSLockPeriod", nonUSLockPeriod, _value);
        nonUSLockPeriod = _value;
    }

    function getMinimumTotalInvestors() public view override returns (uint256) {
        return minimumTotalInvestors;
    }

    function setMinimumTotalInvestors(uint256 _value) public override onlyTransferAgentOrAbove {
        emit DSComplianceUIntRuleSet("minimumTotalInvestors", minimumTotalInvestors, _value);
        minimumTotalInvestors = _value;
    }

    function getMinimumHoldingsPerInvestor() public view override returns (uint256) {
        return minimumHoldingsPerInvestor;
    }

    function setMinimumHoldingsPerInvestor(uint256 _value) public override onlyTransferAgentOrAbove {
        emit DSComplianceUIntRuleSet("minimumHoldingsPerInvestor", minimumHoldingsPerInvestor, _value);
        minimumHoldingsPerInvestor = _value;
    }

    function getMaximumHoldingsPerInvestor() public view override returns (uint256) {
        return maximumHoldingsPerInvestor;
    }

    function setMaximumHoldingsPerInvestor(uint256 _value) public override onlyTransferAgentOrAbove {
        emit DSComplianceUIntRuleSet("maximumHoldingsPerInvestor", maximumHoldingsPerInvestor, _value);
        maximumHoldingsPerInvestor = _value;
    }

    function getEURetailInvestorsLimit() public view override returns (uint256) {
        return euRetailInvestorsLimit;
    }

    function setEURetailInvestorsLimit(uint256 _value) public override onlyTransferAgentOrAbove {
        emit DSComplianceUIntRuleSet("euRetailInvestorsLimit", euRetailInvestorsLimit, _value);
        euRetailInvestorsLimit = _value;
    }

    function getUSLockPeriod() public view override returns (uint256) {
        return usLockPeriod;
    }

    function setUSLockPeriod(uint256 _value) public override onlyTransferAgentOrAbove {
        emit DSComplianceUIntRuleSet("usLockPeriod", usLockPeriod, _value);
        usLockPeriod = _value;
    }

    function getForceFullTransfer() public view override returns (bool) {
        return forceFullTransfer;
    }

    function setForceFullTransfer(bool _value) public override onlyTransferAgentOrAbove {
        emit DSComplianceBoolRuleSet("forceFullTransfer", forceFullTransfer, _value);
        forceFullTransfer = _value;
    }

    function getForceAccreditedUS() public view override returns (bool) {
        return forceAccreditedUS;
    }

    function setForceAccreditedUS(bool _value) public override onlyTransferAgentOrAbove {
        emit DSComplianceBoolRuleSet("forceAccreditedUS", forceAccreditedUS, _value);
        forceAccreditedUS = _value;
    }

    function getForceAccredited() public view override returns (bool) {
        return forceAccredited;
    }

    function setForceAccredited(bool _value) public override onlyTransferAgentOrAbove {
        emit DSComplianceBoolRuleSet("forceAccredited", forceAccredited, _value);
        forceAccredited = _value;
    }

    function getWorldWideForceFullTransfer() public view override returns (bool) {
        return worldWideForceFullTransfer;
    }

    function setWorldWideForceFullTransfer(bool _value) public override onlyTransferAgentOrAbove {
        emit DSComplianceBoolRuleSet("worldWideForceFullTransfer", worldWideForceFullTransfer, _value);
        worldWideForceFullTransfer = _value;
    }

    function getAuthorizedSecurities() public view override returns (uint256) {
        return authorizedSecurities;
    }

    function setAuthorizedSecurities(uint256 _value) public override onlyTransferAgentOrAbove {
        emit DSComplianceUIntRuleSet("authorizedSecurities", authorizedSecurities, _value);
        authorizedSecurities = _value;
    }

    function getDisallowBackDating() public view override returns (bool) {
        return disallowBackDating;
    }

    function setDisallowBackDating(bool _value) public override onlyTransferAgentOrAbove {
        emit DSComplianceBoolRuleSet("disallowBackDating", disallowBackDating, _value);
        disallowBackDating = _value;
    }

    function setAll(uint256[] calldata _uint_values, bool[] calldata _bool_values) public override onlyTransferAgentOrAbove {
        require(_uint_values.length == 16, "Wrong length of parameters");
        require(_bool_values.length == 5, "Wrong length of parameters");
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
        setAuthorizedSecurities(_uint_values[15]);
        setForceFullTransfer(_bool_values[0]);
        setForceAccredited(_bool_values[1]);
        setForceAccreditedUS(_bool_values[2]);
        setWorldWideForceFullTransfer(_bool_values[3]);
        setDisallowBackDating(_bool_values[4]);
    }

    function getAll() public view override returns (uint256[] memory, bool[] memory) {
        uint256[] memory uintValues = new uint256[](16);
        bool[] memory boolValues = new bool[](5);

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
        uintValues[15] = getAuthorizedSecurities();
        boolValues[0] = getForceFullTransfer();
        boolValues[1] = getForceAccredited();
        boolValues[2] = getForceAccreditedUS();
        boolValues[3] = getWorldWideForceFullTransfer();
        boolValues[4] = getDisallowBackDating();
        return (uintValues, boolValues);
    }
}
