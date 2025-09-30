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

import {RebasingLibrary} from "../rebasing/RebasingLibrary.sol";

contract RebasingLibraryMock {
    function convertTokensToShares(
        uint256 tokens,
        uint256 multiplier,
        uint8 decimals
    ) external pure returns (uint256) {
        return RebasingLibrary.convertTokensToShares(tokens, multiplier, decimals);
    }

    function convertSharesToTokens(
        uint256 shares,
        uint256 multiplier,
        uint8 decimals
    ) external pure returns (uint256) {
        return RebasingLibrary.convertSharesToTokens(shares, multiplier, decimals);
    }
}
