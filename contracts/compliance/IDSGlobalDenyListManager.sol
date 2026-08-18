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

/**
 * @title Interface for GlobalDenyListManager
 *
 * Minimal read-only interface for the single wallet denylist shared across every
 * permissionless token that registers a GlobalDenyListManager as its
 * GLOBAL_DENYLIST_MANAGER service. dstoken only ever queries this contract — it is
 * deployed and administered from a separate repo
 * (https://github.com/securitize-io/bc-global-denylist-manager-sc), so this interface
 * declares only the function ComplianceServicePermissionless actually calls.
 */
abstract contract IDSGlobalDenyListManager {
    function isGloballyDenylisted(address _wallet) external view virtual returns (bool);
}
