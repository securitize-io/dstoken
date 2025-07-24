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

import "../token/IDSToken.sol";


library RebasingLibrary {

    function convertTokensToShares(
        uint256 _tokens,
        uint256 _rebasingMultiplier, // should be fixed to 18 decimals
        uint8 _tokenDecimals
    ) internal pure returns (uint256 shares) {
        require(_rebasingMultiplier > 0, "Invalid rebasing multiplier");
        // Apply rounding to the nearest integer when dividing by 1e18.
        // Adding 1e18 / 2 before division is a common technique to reduce rounding errors
        // caused by Solidity's integer division which always rounds down.
        // This ensures more accurate conversion when working with fractional token values.
        if (_tokenDecimals == 18) {
            return (_tokens * 1e18 + _rebasingMultiplier / 2) / _rebasingMultiplier;
        } else if (_tokenDecimals < 18) {
            uint256 scale = 10**(18 - _tokenDecimals);
            return (_tokens * scale * 1e18 + _rebasingMultiplier / 2) / _rebasingMultiplier;
        } else {
            uint256 scale = 10**(_tokenDecimals - 18);
            return (_tokens * 1e18 + (_rebasingMultiplier * scale) / 2) / (_rebasingMultiplier * scale);
        }
    }

    function convertSharesToTokens(
        uint256 _shares,
        uint256 _rebasingMultiplier,
        uint8 _tokenDecimals
    ) internal pure returns (uint256 tokens) {
        require(_rebasingMultiplier > 0, "Invalid rebasing multiplier");
        // Apply rounding to the nearest integer when dividing by 1e18.
        // Adding 1e18 / 2 before division is a common technique to reduce rounding errors
        // caused by Solidity's integer division which always rounds down.
        // This ensures more accurate conversion when working with fractional token values.
        if (_tokenDecimals == 18) {
            return (_shares * _rebasingMultiplier + 1e18 / 2) / 1e18;
        } else if (_tokenDecimals < 18) {
            uint256 scale = 10**(18 - _tokenDecimals);
            return (((_shares * _rebasingMultiplier + 1e18 / 2) / 1e18) + scale / 2) / scale;
        } else {
            uint256 scale = 10**(_tokenDecimals - 18);
            return (_shares * _rebasingMultiplier * scale + 1e18 / 2) / 1e18;
        }
    }
}
