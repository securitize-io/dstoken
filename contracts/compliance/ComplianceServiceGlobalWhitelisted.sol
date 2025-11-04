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

import {ComplianceServiceWhitelisted} from "./ComplianceServiceWhitelisted.sol";

/**
 * @title Compliance service with blacklist functionality
 *
 * This compliance service extends ComplianceServiceWhitelisted to add blacklist functionality.
 * Blacklisted wallets are prevented from receiving tokens through transfers or issuances,
 * while maintaining all existing whitelist functionality.
 *
 * Follows the project's data store pattern for upgradeability and maintainability.
 */
contract ComplianceServiceGlobalWhitelisted is ComplianceServiceWhitelisted {
    // Error messages
    string internal constant WALLET_BLACKLISTED = "Wallet is blacklisted";

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public virtual override onlyProxy initializer {
        _initialize();
    }

    function _initialize() internal override onlyInitializing {
        super._initialize();
    }

    function newPreTransferCheck(
        address _from,
        address _to,
        uint256 _value,
        uint256 _balanceFrom,
        bool _pausedToken
    ) public view virtual override returns (uint256 code, string memory reason) {
        // First check if the senders or the recipient is blacklisted
        if (getBlackListManager().isBlacklisted(_to) || getBlackListManager().isBlacklisted(_from)) {
            return (100, WALLET_BLACKLISTED);
        }

        // Then perform the standard whitelist check
        return super.newPreTransferCheck(_from, _to, _value, _balanceFrom, _pausedToken);
    }

    function preTransferCheck(address _from, address _to, uint256 _value) public view virtual override returns (uint256 code, string memory reason) {
        // First check if the senders or the recipient is blacklisted
        if (getBlackListManager().isBlacklisted(_to) || getBlackListManager().isBlacklisted(_from)) {
            return (100, WALLET_BLACKLISTED);
        }

        // Then perform the standard whitelist check
        return super.preTransferCheck(_from, _to, _value);
    }

    function checkWhitelisted(address _who) public view override returns (bool) {
        // First check if wallet is blacklisted
        if (getBlackListManager().isBlacklisted(_who)) {
            return false;
        }

        // Then perform the standard whitelist check using parent implementation
        return super.checkWhitelisted(_who);
    }

    function preIssuanceCheck(address _to, uint256 _value) public view virtual override returns (uint256 code, string memory reason) {
        // First check if recipient is blacklisted
        if (getBlackListManager().isBlacklisted(_to)) {
            return (100, WALLET_BLACKLISTED);
        }

        // Then perform the standard whitelist check
        return super.preIssuanceCheck(_to, _value);
    }

    function getComplianceTransferableTokens(
        address _who,
        uint256 _time,
        uint64 /*_lockTime*/
    ) public view virtual override returns (uint256) {
        require(_time > 0, "Time must be greater than zero");

        // Check if the user is blacklisted
        if (getBlackListManager().isBlacklisted(_who)) {
            return 0;
        }

        return getLockManager().getTransferableTokens(_who, _time);
    }
}
