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

pragma solidity ^0.8.20;

/**
 * @title ISecuritizeRebasingProvider
 * @dev Defines a common interface to get Rebasing multiplier
 */
interface ISecuritizeRebasingProvider {
    /**
     * @dev Emitted when owner updates multiplier.
     * @param oldValue Old multiplier value
     * @param newValue New multiplier value
     */
    event RebasingRateUpdated(uint256 oldValue, uint256 newValue);

    /**
     * @dev Proxy Initializer.
     * @param _multiplier the initial rebasing multiplier value
     * @param _tokenDecimals the token decimals for conversion calculations
    */
    function initialize(uint256 _multiplier, uint8 _tokenDecimals) external;


    /**
     * @dev Set rebasing multiplier. It is expressed with the same decimal numbers as stable coin
     */
    function setMultiplier(uint256 _multiplier) external;

    /**
     * @dev The asset:rebasing multiplier.
     * @return The asset:rebasing multiplier.
     */
    function multiplier() external view returns (uint256);

    /**
     * @dev Convert tokens to shares using the current multiplier and token decimals.
     * @param _tokens The amount of tokens to convert
     * @return shares The equivalent amount in shares
     */
    function convertTokensToShares(uint256 _tokens) external view returns (uint256 shares);

    /**
     * @dev Convert shares to tokens using the current multiplier and token decimals.
     * @param _shares The amount of shares to convert
     * @return tokens The equivalent amount in tokens
     */
    function convertSharesToTokens(uint256 _shares) external view returns (uint256 tokens);
}
