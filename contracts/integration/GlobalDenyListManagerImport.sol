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

// Re-export the real GlobalDenyListManager from bc-global-denylist-manager-sc (a git
// devDependency tracking its `dev` branch — see package.json) so it gets compiled into
// this repo's own artifacts. This exists ONLY so integration tests
// (test/integration/global-denylist-manager-integration.test.ts) can deploy the real
// contract instead of the trivial GlobalDenyListManagerMock, catching any drift between
// the two repos' contracts. dstoken's own runtime code never imports this — it only knows
// the minimal IDSGlobalDenyListManager interface.
import {GlobalDenyListManager} from "bc-global-denylist-manager-sc/contracts/denylist/GlobalDenyListManager.sol";
