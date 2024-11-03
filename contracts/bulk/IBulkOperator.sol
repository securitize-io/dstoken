pragma solidity 0.8.20;

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

interface IBulkOperator {

    struct BulkRegisterAndIssuance {
        string id;
        address to;
        uint256[] issuanceValues;
        string reason;
        uint256[] locksValues;
        uint64[] lockReleaseTimes;
        string country;
        uint256[] attributeValues;
        uint256[] attributeExpirations;
    }

    /**
     * @dev Function to be invoked by the proxy contract when the BulkOperator is deployed.
     * @param _dsToken dsToken to issue
    **/
    function initialize(address _dsToken) external;

    /**
     * @dev Get the contract version
     * @return Contract version
    **/
    function getVersion() external pure returns (uint8);

    /**
     * @dev Bulk Issuance to existing investors
     * @param addresses - Array of addresses to be issued to
     * @param values - Array of values to be issue
     * @param issuanceTime - Issuance time for all issuances
    **/
    function bulkIssuance(address[] memory addresses, uint256[] memory values, uint256 issuanceTime) external;

    /**
     * @dev Bulk Issuance and registration of new investors
     * @param data - Array of BulkRegisterAndIssuance struct
    **/
    function bulkRegisterAndIssuance(BulkRegisterAndIssuance[] memory data) external;

    /**
     * @dev Bulk Burn
     * @param addresses - Array of addresses to be burn to
     * @param values - Array of values to be burned
    **/
    function bulkBurn(address[] memory addresses, uint256[] memory values) external;
}
