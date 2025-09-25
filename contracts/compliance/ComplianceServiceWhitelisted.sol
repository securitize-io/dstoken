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

import {ComplianceService} from "./ComplianceService.sol";
import {CommonUtils} from "../utils/CommonUtils.sol";

/**
*   @title Concrete compliance service for tokens with whitelisted wallets.
*
*   This simple compliance service is meant to be used for tokens that only need to be validated against an investor registry.
*/

contract ComplianceServiceWhitelisted is ComplianceService {

    function initialize() public virtual override onlyProxy initializer {
        ComplianceService.initialize();
    }

    function newPreTransferCheck(
        address _from,
        address _to,
        uint256 _value,
        uint256 _balanceFrom,
        bool _pausedToken
    ) public view virtual override returns (uint256 code, string memory reason) {
        return doPreTransferCheckWhitelisted(_from, _to, _value, _balanceFrom, _pausedToken);
    }

    function preTransferCheck(
        address _from,
        address _to,
        uint256 _value
    ) public view virtual override returns (uint256 code, string memory reason) {
        return doPreTransferCheckWhitelisted(_from, _to, _value, getToken().balanceOf(_from), getToken().isPaused());
    }

    function checkWhitelisted(address _who) public view returns (bool) {
        return getWalletManager().isPlatformWallet(_who) || !CommonUtils.isEmptyString(getRegistryService().getInvestor(_who));
    }

    function recordIssuance(address, uint256, uint256) internal virtual override returns (bool) {
        return true;
    }

    function recordTransfer(address, address, uint256) internal virtual override returns (bool) {
        return true;
    }

    function checkTransfer(address, address _to, uint256) internal view override returns (uint256, string memory) {
        if (!checkWhitelisted(_to)) {
            return (20, WALLET_NOT_IN_REGISTRY_SERVICE);
        }

        return (0, VALID);
    }

    function preIssuanceCheck(address _to, uint256) public view virtual override returns (uint256, string memory) {
        if (!checkWhitelisted(_to)) {
            return (20, WALLET_NOT_IN_REGISTRY_SERVICE);
        }

        return (0, VALID);
    }

    function recordBurn(address, uint256) internal virtual override returns (bool) {
        return true;
    }

    function recordSeize(address, address, uint256) internal virtual override returns (bool) {
        return true;
    }

    function doPreTransferCheckWhitelisted(
        address _from,
        address _to,
        uint256 _value,
        uint256 _balanceFrom,
        bool _pausedToken
    ) internal view returns (uint256 code, string memory reason) {
        if (_pausedToken) {
            return (10, TOKEN_PAUSED);
        }

        if (_balanceFrom < _value) {
            return (15, NOT_ENOUGH_TOKENS);
        }

        if (!getWalletManager().isPlatformWallet(_from) && getLockManager().getTransferableTokens(_from, block.timestamp) < _value) {
            return (16, TOKENS_LOCKED);
        }

        return checkTransfer(_from, _to, _value);
    }

    function getComplianceTransferableTokens(
        address _who,
        uint256 _time,
        uint64 /*_lockTime*/
    ) public view virtual override returns (uint256) {
        require(_time > 0, "Time must be greater than zero");
        return getLockManager().getTransferableTokens(_who, _time);
    }
}
