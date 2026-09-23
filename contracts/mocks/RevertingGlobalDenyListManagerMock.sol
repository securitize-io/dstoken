/**
 * Copyright 2026 Securitize Inc. All rights reserved.
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

import {IDSGlobalDenyListManager} from "../compliance/IDSGlobalDenyListManager.sol";

/**
 * @title RevertingGlobalDenyListManagerMock
 * @notice Simulates a broken/misbehaving GlobalDenyListManager for BC-2349's accepted-risk
 * test: isGloballyDenylisted always reverts, proving ComplianceServicePermissionless does
 * NOT swallow the revert (fail-closed is the deliberate choice for this ticket).
 */
contract RevertingGlobalDenyListManagerMock is IDSGlobalDenyListManager {
    function isGloballyDenylisted(address) external pure override returns (bool) {
        revert("RevertingGlobalDenyListManagerMock: intentional revert");
    }
}
