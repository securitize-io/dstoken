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
import {IDSComplianceServiceGlobalWhitelisted} from "./IDSComplianceServiceGlobalWhitelisted.sol";
import {ComplianceServiceGlobalWhitelistedDataStore} from "../data-stores/ComplianceServiceGlobalWhitelistedDataStore.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/**
 * @title Compliance service with blacklist functionality
 *
 * This compliance service extends ComplianceServiceWhitelisted to add blacklist functionality.
 * Blacklisted wallets are prevented from receiving tokens through transfers or issuances,
 * while maintaining all existing whitelist functionality.
 *
 * Follows the project's data store pattern for upgradeability and maintainability.
 */
contract ComplianceServiceGlobalWhitelisted is ComplianceServiceWhitelisted, IDSComplianceServiceGlobalWhitelisted, ComplianceServiceGlobalWhitelistedDataStore {
    using EnumerableSet for EnumerableSet.AddressSet;

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

    function isBlacklisted(address _wallet) public view returns (bool) {
        return _blacklistedWallets.contains(_wallet);
    }

    function getBlacklistedWalletsCount() public view returns (uint256) {
        return _blacklistedWallets.length();
    }

    function getBlacklistedWallets() public view returns (address[] memory) {
        return _blacklistedWallets.values();
    }

    function getBlacklistReason(address _wallet) public view returns (string memory) {
        return _blacklistReasons[_wallet];
    }

    function newPreTransferCheck(
        address _from,
        address _to,
        uint256 _value,
        uint256 _balanceFrom,
        bool _pausedToken
    ) public view virtual override returns (uint256 code, string memory reason) {
        // First check if recipient is blacklisted
        (uint256 blacklistCode, string memory blacklistReason) = _getBlacklistCheckResult(_to);
        if (blacklistCode != 0) {
            return (blacklistCode, blacklistReason);
        }

        // Then perform the standard whitelist check
        return super.newPreTransferCheck(_from, _to, _value, _balanceFrom, _pausedToken);
    }

    function preTransferCheck(address _from, address _to, uint256 _value) public view virtual override returns (uint256 code, string memory reason) {
        // First check if recipient is blacklisted
        (uint256 blacklistCode, string memory blacklistReason) = _getBlacklistCheckResult(_to);
        if (blacklistCode != 0) {
            return (blacklistCode, blacklistReason);
        }

        // Then perform the standard whitelist check
        return super.preTransferCheck(_from, _to, _value);
    }

    function checkWhitelisted(address _who) public view override returns (bool) {
        // First check if wallet is blacklisted
        if (isBlacklisted(_who)) {
            return false;
        }

        // Then perform the standard whitelist check using parent implementation
        return super.checkWhitelisted(_who);
    }

    function preIssuanceCheck(address _to, uint256 _value) public view virtual override returns (uint256 code, string memory reason) {
        // First check if recipient is blacklisted
        (uint256 blacklistCode, string memory blacklistReason) = _getBlacklistCheckResult(_to);
        if (blacklistCode != 0) {
            return (blacklistCode, blacklistReason);
        }

        // Then perform the standard whitelist check
        return super.preIssuanceCheck(_to, _value);
    }

    function addToBlacklist(address _wallet, string calldata _reason) public onlyTransferAgentOrAbove returns (bool) {
        _addToBlacklist(_wallet, _reason);
        return true;
    }

    function removeFromBlacklist(address _wallet) public onlyTransferAgentOrAbove returns (bool) {
        _removeFromBlacklist(_wallet);
        return true;
    }

    function batchAddToBlacklist(address[] calldata _wallets, string[] calldata _reasons) public onlyTransferAgentOrAbove returns (bool) {
        if (_wallets.length != _reasons.length) revert ArraysLengthMismatch();

        for (uint256 i = 0; i < _wallets.length; i++) {
            _addToBlacklist(_wallets[i], _reasons[i]);
        }

        return true;
    }

    function batchRemoveFromBlacklist(address[] calldata _wallets) public onlyTransferAgentOrAbove returns (bool) {
        for (uint256 i = 0; i < _wallets.length; i++) {
            _removeFromBlacklist(_wallets[i]);
        }

        return true;
    }

    function _addToBlacklist(address _wallet, string memory _reason) private {
        if (_wallet == address(0)) revert ZeroAddressInvalid();
        if (_blacklistedWallets.contains(_wallet)) revert WalletAlreadyBlacklisted();

        _blacklistedWallets.add(_wallet);
        _blacklistReasons[_wallet] = _reason;

        emit WalletAddedToBlacklist(_wallet, _reason, msg.sender);
    }

    function _removeFromBlacklist(address _wallet) private {
        if (!_blacklistedWallets.contains(_wallet)) revert WalletNotBlacklisted();

        _blacklistedWallets.remove(_wallet);
        delete _blacklistReasons[_wallet];

        emit WalletRemovedFromBlacklist(_wallet, msg.sender);
    }

    function _getBlacklistCheckResult(address _to) private view returns (uint256, string memory) {
        if (isBlacklisted(_to)) {
            return (100, WALLET_BLACKLISTED);
        }
        return (0, "");
    }
}
