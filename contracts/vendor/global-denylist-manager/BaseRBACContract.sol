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
// Path:   contracts/utils/BaseRBACContract.sol
// Commit: d96f85cfad7a5dfc390e5b56d1ea5aa70caa257a
//
// Copied in verbatim (instead of pulled via a git devDependency) because CI runners
// don't have SSH access to the sibling repo. To pick up a newer version of the sibling
// repo, re-copy these 4 files from the same commit/branch and bump the "Commit:" line
// above — see docs/runbooks/global-denylist-admin.md.

pragma solidity 0.8.22;

import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {UUPSUpgradeable, ERC1967Utils} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

abstract contract BaseRBACContract is UUPSUpgradeable, PausableUpgradeable, AccessControlUpgradeable {
    uint256[50] private __gap;

    function __BaseRBACContract_init() internal onlyInitializing {
        __UUPSUpgradeable_init();
        __Pausable_init();
        __AccessControl_init();
    }

    /**
     * @dev required by the OZ UUPS module
     */
    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    /**
     * @dev returns proxy ERC1967 implementation address
     */
    function getImplementationAddress() external view returns (address) {
        return ERC1967Utils.getImplementation();
    }

    /**
     * @dev Returns the highest version that has been initialized. See {reinitializer}.
     */
    function getInitializedVersion() external view returns (uint64) {
        return _getInitializedVersion();
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
