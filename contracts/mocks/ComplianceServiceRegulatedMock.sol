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

import {ComplianceServiceRegulated} from "../compliance/ComplianceServiceRegulated.sol";

/**
 * @title ComplianceServiceRegulatedMock
 * @notice Mock contract for testing ComplianceServiceRegulated internal state
 * @dev This contract exposes internal storage variables for testing purposes only
 */
contract ComplianceServiceRegulatedMock is ComplianceServiceRegulated {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public override onlyProxy initializer {
        super.initialize();
    }

    /**
     * @notice Get the number of issuances for an investor
     * @param investor The investor ID
     * @return The number of issuances
     */
    function getIssuancesCount(string memory investor) public view returns (uint256) {
        return issuancesCounters[investor];
    }

    /**
     * @notice Get the timestamp of a specific issuance
     * @param investor The investor ID
     * @param index The index of the issuance
     * @return The timestamp of the issuance
     */
    function getIssuanceTimestamp(string memory investor, uint256 index) public view returns (uint256) {
        return issuancesTimestamps[investor][index];
    }

    /**
     * @notice Get the value (in shares) of a specific issuance
     * @param investor The investor ID
     * @param index The index of the issuance
     * @return The value in shares of the issuance
     */
    function getIssuanceValue(string memory investor, uint256 index) public view returns (uint256) {
        return issuancesValues[investor][index];
    }
}
