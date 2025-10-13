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

import {IDSBlackListManager} from "./IDSBlackListManager.sol";
import {BlackListManagerDataStore} from "../data-stores/BlackListManagerDataStore.sol";
import {BaseDSContract} from "../utils/BaseDSContract.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/**
 * @title BlackListManager
 * @dev A manager for handling blacklisted wallets.
 * @dev Implements IDSBlackListManager and follows the project's data store pattern.
 */
contract BlackListManager is IDSBlackListManager, BlackListManagerDataStore, BaseDSContract {
    using EnumerableSet for EnumerableSet.AddressSet;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public override onlyProxy initializer {
        __BaseDSContract_init();
    }

    function isBlacklisted(address _wallet) public view override returns (bool) {
        return _blacklistedWallets.contains(_wallet);
    }

    function getBlacklistedWalletsCount() public view override returns (uint256) {
        return _blacklistedWallets.length();
    }

    function getBlacklistedWallets() public view override returns (address[] memory) {
        return _blacklistedWallets.values();
    }

    function getBlacklistReason(address _wallet) public view override returns (string memory) {
        return _blacklistReasons[_wallet];
    }

    function addToBlacklist(address _wallet, string calldata _reason) public override onlyTransferAgentOrAbove returns (bool) {
        _addToBlacklist(_wallet, _reason);
        return true;
    }

    function removeFromBlacklist(address _wallet) public override onlyTransferAgentOrAbove returns (bool) {
        _removeFromBlacklist(_wallet);
        return true;
    }

    function _addToBlacklist(address _wallet, string calldata _reason) private {
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
}
