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

/**
 * @title Data store for ComplianceServicePermissionless
 *
 * Mirrors the issuance-lockup storage pattern of ComplianceServiceDataStore but
 * keyed by wallet address instead of investor ID string, since the Permissionless
 * model has no on-chain investor identity.
 *
 * Declared without a parent to avoid diamond inheritance with the ComplianceService
 * chain. Storage slots are appended after the full ComplianceService hierarchy.
 */
contract ComplianceServicePermissionlessDataStore {
    mapping(address wallet => uint256 count) internal walletIssuancesCounters;
    mapping(address wallet => mapping(uint256 issuanceId => uint256 shares)) internal walletIssuancesValues;
    mapping(address wallet => mapping(uint256 issuanceId => uint256 timestamp)) internal walletIssuancesTimestamps;

    /**
     * @dev Reserved space for future variables without shifting storage in the inheritance chain.
     * 3 slots used above + 47 gap = 50 total, matching ComplianceServiceDataStore's budget.
     */
    uint256[47] private __gap;
}
