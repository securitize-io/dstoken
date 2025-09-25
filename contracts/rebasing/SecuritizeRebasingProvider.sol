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

import {ISecuritizeRebasingProvider} from "../rebasing/ISecuritizeRebasingProvider.sol";
import "../service/ServiceConsumer.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "../utils/BaseDSContract.sol";
import "./RebasingLibrary.sol";

contract SecuritizeRebasingProvider is BaseDSContract, ISecuritizeRebasingProvider {
    uint256 public multiplier; // Multiplier is fixed to 18 decimals
    uint8 public tokenDecimals;
    
    error InvalidMultiplier(uint256 providedMultiplier);

    function initialize(uint256 _multiplier, uint8 _tokenDecimals) public onlyProxy initializer override {
        __BaseDSContract_init();
        
        if (_multiplier == 0) {
            revert InvalidMultiplier(_multiplier);
        }
        
        multiplier = _multiplier;
        tokenDecimals = _tokenDecimals;
    }
    /**
     * 
     * @param _multiplier The new multiplier value, fixed to 18 decimals
     */
    function setMultiplier(uint256 _multiplier) external override onlyMaster {
        if (_multiplier == 0) {
            revert InvalidMultiplier(_multiplier);
        }
        
        uint256 old = multiplier;
        multiplier = _multiplier;
        emit RebasingRateUpdated(old, _multiplier);
    }

    function convertTokensToShares(uint256 _tokens) external view returns (uint256 shares) {
        return RebasingLibrary.convertTokensToShares(_tokens, multiplier, tokenDecimals);
    }

    function convertSharesToTokens(uint256 _shares) external view returns (uint256 tokens) {
        return RebasingLibrary.convertSharesToTokens(_shares, multiplier, tokenDecimals);
    }
}
