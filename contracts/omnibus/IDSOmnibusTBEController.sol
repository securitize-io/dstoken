/**
 * Copyright 2024 Securitize Inc. All rights reserved.
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

pragma solidity ^0.8.20;

import "../service/ServiceConsumer.sol";
import "../data-stores/OmnibusTBEControllerDataStore.sol";

abstract contract IDSOmnibusTBEController {

    function initialize(address _omnibusWallet, bool _isPartitionedToken) public virtual;

    function bulkIssuance(
        uint256 value,
        uint256 issuanceTime,
        uint256 totalInvestors,
        uint256 accreditedInvestors,
        uint256 usAccreditedInvestors,
        uint256 usTotalInvestors,
        uint256 jpTotalInvestors,
        bytes32[] calldata euRetailCountries,
        uint256[] calldata euRetailCountryCounts
    ) public virtual;

    function bulkBurn(
        uint256 value,
        uint256 totalInvestors,
        uint256 accreditedInvestors,
        uint256 usAccreditedInvestors,
        uint256 usTotalInvestors,
        uint256 jpTotalInvestors,
        bytes32[] calldata euRetailCountries,
        uint256[] calldata euRetailCountryCounts
    ) public virtual;

    function bulkTransfer(address[] calldata wallets, uint256[] calldata values) public virtual;

    function adjustCounters(
        int256 totalDelta,
        int256 accreditedDelta,
        int256 usAccreditedDelta,
        int256 usTotalDelta,
        int256 jpTotalDelta,
        bytes32[] calldata euRetailCountries,
        int256[] calldata euRetailCountryDeltas
    ) public virtual;

    function getOmnibusWallet() public view virtual returns (address);
}
