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
import {MulticallProxy} from "./MulticallProxy.sol";
import {BaseDSContract} from "../utils/BaseDSContract.sol";

contract IssuerMulticall is MulticallProxy, BaseDSContract {

    function initialize() public override onlyProxy initializer {
        __BaseDSContract_init();
    }

    function multicall(address[] memory _targets, bytes[] calldata data) external override onlyIssuerOrAbove returns (bytes[] memory results) {
        results = new bytes[](data.length);
        for (uint256 i = 0; i < data.length; i++) {
            results[i] = _callTarget(_targets[i], data[i], i);
        }
    }
}
