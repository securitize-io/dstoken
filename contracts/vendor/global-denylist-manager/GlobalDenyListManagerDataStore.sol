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

// VENDORED COPY — do not edit directly.
// Source: https://github.com/securitize-io/bc-global-denylist-manager-sc
// Path:   contracts/data-stores/GlobalDenyListManagerDataStore.sol
// Commit: d96f85cfad7a5dfc390e5b56d1ea5aa70caa257a
//
// Copied in verbatim (instead of pulled via a git devDependency) because CI runners
// don't have SSH access to the sibling repo. To pick up a newer version of the sibling
// repo, re-copy these 4 files from the same commit/branch and bump the "Commit:" line
// above — see docs/runbooks/global-denylist-admin.md.

pragma solidity 0.8.22;

import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

abstract contract GlobalDenyListManagerDataStore {
    using EnumerableSet for EnumerableSet.AddressSet;

    // EnumerableSet.AddressSet wraps a Set{bytes32[] _values; mapping(bytes32 => uint256) _positions;}
    // struct — 2 storage slots (one for the array header, one for the mapping), not 1.
    EnumerableSet.AddressSet internal _globallyDenylistedWallets;

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     *
     * Slot budget for this module: 2 (EnumerableSet.AddressSet) + 48 (__gap) = 50 slots total,
     * matching BaseRBACContract's own uint256[50] __gap convention for a standalone module.
     * Adding a new variable here must decrement this gap by exactly its slot count to keep
     * the 50-slot total — e.g. one new uint256 takes __gap from 48 to 47.
     */
    uint256[48] private __gap;
}
