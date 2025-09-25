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

pragma solidity 0.8.22;

import "../nav/ISecuritizeNavProvider.sol";


contract SecuritizeInternalNavProviderMock is ISecuritizeNavProvider {
    /**
     * @dev rate: NAV rate expressed with 6 decimals
     */
    uint256 public rate;

    constructor(uint256 _rate) {
        rate = _rate;
    }

    function initialize(uint256 _rate) public {
        rate = _rate;
    }

    function setRate(uint256 _rate) external override {
        rate = _rate;
    }
}
