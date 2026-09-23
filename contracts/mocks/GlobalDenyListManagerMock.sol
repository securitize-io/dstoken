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
 * @title GlobalDenyListManagerMock
 * @notice Trivial settable stand-in for the real GlobalDenyListManager (which lives in
 * https://github.com/securitize-io/bc-global-denylist-manager-sc, not this
 * repo). Exists solely so ComplianceServicePermissionless's own integration tests
 * (short-circuit ordering, distinct rejection codes, fail-open/fail-closed behavior) can
 * toggle a wallet's global-denylist status without pulling in the real contract's
 * AccessControl/idempotency machinery, which is tested independently in the other repo.
 */
contract GlobalDenyListManagerMock is IDSGlobalDenyListManager {
    mapping(address wallet => bool denylisted) private _denylisted;

    function setGloballyDenylisted(address wallet, bool denylisted) external {
        _denylisted[wallet] = denylisted;
    }

    function isGloballyDenylisted(address wallet) external view override returns (bool) {
        return _denylisted[wallet];
    }
}
