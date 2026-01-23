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

import {ComplianceServiceGlobalWhitelisted} from "../compliance/ComplianceServiceGlobalWhitelisted.sol";

/**
 * @title Mock Compliance Service Global Whitelisted for testing
 *
 * This mock exposes internal functions for testing purposes.
 */
contract MockComplianceServiceGlobalWhitelisted is ComplianceServiceGlobalWhitelisted {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Override initialize without onlyProxy for testing purposes.
     */
    function initialize() public virtual override initializer {
        _initialize();
    }

    /**
     * @dev Exposes the internal _initialize function for testing onlyInitializing modifier.
     */
    function exposedInitialize() public  {
        _initialize();
    }
}