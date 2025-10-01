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

import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IDSToken} from "../token/IDSToken.sol";


library RebasingLibrary {
    uint256 private constant DECIMALS_FACTOR = 1e18;

    /**
     * @notice Converts a token amount to a share amount.
     * @param _tokens The amount of tokens to convert.
     * @param _rebasingMultiplier The current rebasing multiplier, fixed to 18 decimals.
     * @param _tokenDecimals The number of decimals of the token.
     * @return The corresponding amount of shares.
     */
    function convertTokensToShares(
        uint256 _tokens,
        uint256 _rebasingMultiplier, // should be fixed to 18 decimals
        uint8 _tokenDecimals
    ) internal pure returns (uint256) {
        require(_rebasingMultiplier > 0, "Invalid rebasing multiplier");
        if (_tokenDecimals == 18) {
            return Math.mulDiv(_tokens, DECIMALS_FACTOR, _rebasingMultiplier);
        } else if (_tokenDecimals < 18) {
            uint256 scale = 10**(18 - _tokenDecimals);
            return Math.mulDiv(_tokens * scale, DECIMALS_FACTOR, _rebasingMultiplier);
        } else {
            revert("Token decimals greater than 18 not supported");
        }
    }

    /**
     * @notice Converts a share amount to a token amount.
     * @param _shares The amount of shares to convert.
     * @param _rebasingMultiplier The current rebasing multiplier, fixed to 18 decimals.
     * @param _tokenDecimals The number of decimals of the token.
     * @return The corresponding amount of tokens.
     */
    function convertSharesToTokens(
        uint256 _shares,
        uint256 _rebasingMultiplier,
        uint8 _tokenDecimals
    ) internal pure returns (uint256) {
        require(_rebasingMultiplier > 0, "Invalid rebasing multiplier");
        if (_tokenDecimals == 18) {
            return Math.mulDiv(_shares, _rebasingMultiplier, DECIMALS_FACTOR);
        } else if (_tokenDecimals < 18) {
            uint256 scale = 10**(18 - _tokenDecimals);
            return Math.mulDiv(_shares, _rebasingMultiplier, DECIMALS_FACTOR * scale);
        } else {
            revert("Token decimals greater than 18 not supported");
        }
    }
}
