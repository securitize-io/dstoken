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

import {IDSToken} from "../token/IDSToken.sol";


library RebasingLibrary {
    /*
     * @notice Note for auditors regarding rounding logic in rebasing operations.
     *
     * A finding was raised concerning the "rounding to the nearest" logic in `convertTokensToShares`,
     * which could potentially result in a wei being rounded up in favor of the investor.
     * We have analyzed and tested different options and our conclusions are the following:
     *
     * 1. The risk for the protocol of losing a wei over a `convertTokensToShares` operation
     *    is restricted to tokens with many decimals (17 or 18).
     *
     * 2. Trying to fix this by rounding down on every operation presents many problems:
     *    - Users who deposit 1 token immediately see it reflected as less than 1 token (0.99999...),
     *      which causes confusion and potential complaints.
     *    - When locking 200 tokens for an investor who holds 500, it should leave 300 tokens
     *      transferable. Applying a "round down" fix causes this to fail, as a wei is lost
     *      for the investor who no longer holds the total shares needed to get back their 300 tokens.
     *    - Similar situations happen with other operations of the protocol, none of which happen
     *      with the "rounding to the nearest" approach.
     *
     * 3. Exploiting the wei being rounded up is not economically viable for an attacker. It would
     *    require thousands of transactions, and the associated gas costs (plus any protocol fees,
     *    like bridging fees) would exceed any potential gain.
     *
     * 4. Most of our tokens operate with 6 decimals, while all rebasing operations use 18 decimals
     *    of precision. For a typical 6-decimal token, taking advantage of this is nearly impossible.
     *
     * Conclusion: We are leaving the logic as is ("rounding to the nearest integer"). It works well
     * in all situations, and while it creates a theoretical risk, it is not practically actionable or
     * economically feasible to exploit.
     */    
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
            return (_tokens * DECIMALS_FACTOR + _rebasingMultiplier / 2) / _rebasingMultiplier;
        } else if (_tokenDecimals < 18) {
            uint256 scale = 10**(18 - _tokenDecimals);
            return (_tokens * scale * DECIMALS_FACTOR + _rebasingMultiplier / 2) / _rebasingMultiplier;
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
            return (_shares * _rebasingMultiplier + DECIMALS_FACTOR / 2) / DECIMALS_FACTOR;
        } else if (_tokenDecimals < 18) {
            uint256 scale = 10**(18 - _tokenDecimals);
            return (((_shares * _rebasingMultiplier + DECIMALS_FACTOR / 2) / DECIMALS_FACTOR) + scale / 2) / scale;
        } else {
            revert("Token decimals greater than 18 not supported");
        }
    }
}