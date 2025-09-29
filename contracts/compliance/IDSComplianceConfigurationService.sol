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

abstract contract IDSComplianceConfigurationService {

    function initialize() public virtual;

    event DSComplianceUIntRuleSet(string ruleName, uint256 prevValue, uint256 newValue);
    event DSComplianceBoolRuleSet(string ruleName, bool prevValue, bool newValue);
    event DSComplianceStringToUIntMapRuleSet(string ruleName, string keyValue, uint256 prevValue, uint256 newValue);

    function getCountryCompliance(string memory _country) public view virtual returns (uint256);

    function setCountriesCompliance(string[] calldata _countries, uint256[] calldata _values) public virtual;

    function setCountryCompliance(
        string calldata _country,
        uint256 _value /*onlyTransferAgentOrAbove*/
    ) public virtual;

    function getTotalInvestorsLimit() public view virtual returns (uint256);

    function setTotalInvestorsLimit(
        uint256 _value /*onlyTransferAgentOrAbove*/
    ) public virtual;

    function getMinUSTokens() public view virtual returns (uint256);

    function setMinUSTokens(
        uint256 _value /*onlyTransferAgentOrAbove*/
    ) public virtual;

    function getMinEUTokens() public view virtual returns (uint256);

    function setMinEUTokens(
        uint256 _value /*onlyTransferAgentOrAbove*/
    ) public virtual;

    function getUSInvestorsLimit() public view virtual returns (uint256);

    function setUSInvestorsLimit(
        uint256 _value /*onlyTransferAgentOrAbove*/
    ) public virtual;

    function getJPInvestorsLimit() public view virtual returns (uint256);

    function setJPInvestorsLimit(
        uint256 _value /*onlyTransferAgentOrAbove*/
    ) public virtual;

    function getUSAccreditedInvestorsLimit() public view virtual returns (uint256);

    function setUSAccreditedInvestorsLimit(
        uint256 _value /*onlyTransferAgentOrAbove*/
    ) public virtual;

    function getNonAccreditedInvestorsLimit() public view virtual returns (uint256);

    function setNonAccreditedInvestorsLimit(
        uint256 _value /*onlyTransferAgentOrAbove*/
    ) public virtual;

    function getMaxUSInvestorsPercentage() public view virtual returns (uint256);

    function setMaxUSInvestorsPercentage(
        uint256 _value /*onlyTransferAgentOrAbove*/
    ) public virtual;

    function getBlockFlowbackEndTime() public view virtual returns (uint256);

    function setBlockFlowbackEndTime(
        uint256 _value /*onlyTransferAgentOrAbove*/
    ) public virtual;

    function getNonUSLockPeriod() public view virtual returns (uint256);

    function setNonUSLockPeriod(
        uint256 _value /*onlyTransferAgentOrAbove*/
    ) public virtual;

    function getMinimumTotalInvestors() public view virtual returns (uint256);

    function setMinimumTotalInvestors(
        uint256 _value /*onlyTransferAgentOrAbove*/
    ) public virtual;

    function getMinimumHoldingsPerInvestor() public view virtual returns (uint256);

    function setMinimumHoldingsPerInvestor(
        uint256 _value /*onlyTransferAgentOrAbove*/
    ) public virtual;

    function getMaximumHoldingsPerInvestor() public view virtual returns (uint256);

    function setMaximumHoldingsPerInvestor(
        uint256 _value /*onlyTransferAgentOrAbove*/
    ) public virtual;

    function getEURetailInvestorsLimit() public view virtual returns (uint256);

    function setEURetailInvestorsLimit(
        uint256 _value /*onlyTransferAgentOrAbove*/
    ) public virtual;

    function getUSLockPeriod() public view virtual returns (uint256);

    function setUSLockPeriod(
        uint256 _value /*onlyTransferAgentOrAbove*/
    ) public virtual;

    function getForceFullTransfer() public view virtual returns (bool);

    function setForceFullTransfer(
        bool _value /*onlyTransferAgentOrAbove*/
    ) public virtual;

    function getForceAccredited() public view virtual returns (bool);

    function setForceAccredited(
        bool _value /*onlyTransferAgentOrAbove*/
    ) public virtual;

    function setForceAccreditedUS(
        bool _value /*onlyTransferAgentOrAbove*/
    ) public virtual;

    function getForceAccreditedUS() public view virtual returns (bool);

    function setWorldWideForceFullTransfer(
        bool _value /*onlyTransferAgentOrAbove*/
    ) public virtual;

    function getWorldWideForceFullTransfer() public view virtual returns (bool);

    function getAuthorizedSecurities() public view virtual returns (uint256);

    function setAuthorizedSecurities(
        uint256 _value /*onlyTransferAgentOrAbove*/
    ) public virtual;

    function getDisallowBackDating() public view virtual returns (bool);

    function setDisallowBackDating(
        bool _value /*onlyTransferAgentOrAbove*/
    ) public virtual;

    function setAll(
        uint256[] calldata _uint_values,
        bool[] calldata _bool_values /*onlyTransferAgentOrAbove*/
    ) public virtual;

    function getAll() public view virtual returns (uint256[] memory, bool[] memory);
}
