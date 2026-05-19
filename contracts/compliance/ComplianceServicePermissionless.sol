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
import {ComplianceServicePermissionlessDataStore} from "../data-stores/ComplianceServicePermissionlessDataStore.sol";

/**
 * @title Permissionless compliance service
 *
 * Tokens can be held and transferred by any wallet with no on-chain investor identity.
 * KYC and investor identity remain off-chain at Securitize.
 *
 * Transfers/issuances are allowed by default. The only on-chain restrictions are:
 * - Blacklist: specific wallets blocked by the BlackListManager
 * - Lockup: newly-issued tokens locked for a configurable window (getNonUSLockPeriod)
 *
 * Design: reuse everything, change zero audited contracts. Pair with StubRegistryService
 * so all investor-keyed bookkeeping in DSToken/TokenLibrary becomes a no-op.
 */
contract ComplianceServicePermissionless is ComplianceService, ComplianceServicePermissionlessDataStore {
    string internal constant WALLET_BLACKLISTED = "Wallet is blacklisted";

    uint256 internal constant MAX_ISSUANCES_PER_WALLET = 30;

    event IssuanceRecorded(address indexed wallet, uint256 shares, uint256 timestamp);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public virtual override onlyProxy initializer {
        _initialize();
    }

    function _initialize() internal onlyInitializing virtual {
        ComplianceService.initialize();
    }

    // ─── Transfer checks ──────────────────────────────────────────────────────

    function newPreTransferCheck(
        address _from,
        address _to,
        uint256 _value,
        uint256 _balanceFrom,
        bool _pausedToken
    ) public view virtual override returns (uint256 code, string memory reason) {
        if (_pausedToken) {
            return (10, TOKEN_PAUSED);
        }

        if (_balanceFrom < _value) {
            return (15, NOT_ENOUGH_TOKENS);
        }

        (code, reason) = checkTransfer(_from, _to, _value);
        if (code != 0) return (code, reason);

        // Lockup check — skip for platform wallets
        if (!getWalletManager().isPlatformWallet(_from)) {
            uint256 locked = _lockedAt(_from, block.timestamp);
            if (locked > 0 && _value > _balanceFrom - locked) {
                return (16, TOKENS_LOCKED);
            }
        }

        return (0, VALID);
    }

    function preTransferCheck(
        address _from,
        address _to,
        uint256 _value
    ) public view virtual override returns (uint256 code, string memory reason) {
        return newPreTransferCheck(_from, _to, _value, getToken().balanceOf(_from), getToken().isPaused());
    }

    // ─── Issuance checks ──────────────────────────────────────────────────────

    function preIssuanceCheck(
        address _to,
        uint256 /*_value*/
    ) public view virtual override returns (uint256 code, string memory reason) {
        if (_to == address(0)) {
            return (101, "Zero address");
        }

        if (getBlackListManager().isBlacklisted(_to)) {
            return (100, WALLET_BLACKLISTED);
        }

        return (0, VALID);
    }

    // Returns _issuanceTime unchanged — no disallowBackDating enforcement
    function validateIssuanceTime(uint256 _issuanceTime)
        public view virtual override returns (uint256) {
        return _issuanceTime;
    }

    // ─── Transferable tokens ──────────────────────────────────────────────────

    function getComplianceTransferableTokens(
        address _who,
        uint256 _time,
        uint64 /*_lockTime*/
    ) public view virtual override returns (uint256) {
        require(_time > 0, "Time must be greater than zero");

        if (getBlackListManager().isBlacklisted(_who)) {
            return 0;
        }

        uint256 balance = getToken().balanceOf(_who);
        uint256 locked = _lockedAt(_who, _time);
        return balance - (locked < balance ? locked : balance);
    }

    // ─── Record operations ────────────────────────────────────────────────────

    function recordIssuance(
        address _to,
        uint256 _value,
        uint256 _issuanceTime
    ) internal virtual override returns (bool) {
        if (getWalletManager().isPlatformWallet(_to)) {
            return true;
        }

        _cleanupIssuances(_to);

        require(walletIssuancesCounters[_to] < MAX_ISSUANCES_PER_WALLET, "Issuance cap reached");

        uint256 shares = getRebasingProvider().convertTokensToShares(_value);
        uint256 count = walletIssuancesCounters[_to];
        walletIssuancesValues[_to][count] = shares;
        walletIssuancesTimestamps[_to][count] = _issuanceTime;
        walletIssuancesCounters[_to] = count + 1;

        emit IssuanceRecorded(_to, shares, _issuanceTime);
        return true;
    }

    function recordTransfer(
        address, /*_from*/
        address, /*_to*/
        uint256 /*_value*/
    ) internal virtual override returns (bool) {
        return true;
    }

    function recordBurn(
        address, /*_who*/
        uint256 /*_value*/
    ) internal virtual override returns (bool) {
        return true;
    }

    function recordSeize(
        address, /*_from*/
        address, /*_to*/
        uint256 /*_value*/
    ) internal virtual override returns (bool) {
        return true;
    }

    // ─── Internal lockup helpers ──────────────────────────────────────────────

    function checkTransfer(
        address _from,
        address _to,
        uint256 /*_value*/
    ) internal view virtual override returns (uint256 code, string memory reason) {
        if (getBlackListManager().isBlacklisted(_from) || getBlackListManager().isBlacklisted(_to)) {
            return (100, WALLET_BLACKLISTED);
        }
        return (0, VALID);
    }

    function _lockedAt(address _wallet, uint256 _time) internal view returns (uint256) {
        uint256 lockPeriod = getComplianceConfigurationService().getNonUSLockPeriod();
        if (lockPeriod == 0) {
            return 0;
        }

        uint256 count = walletIssuancesCounters[_wallet];
        if (count == 0) {
            return 0;
        }

        uint256 totalLockedShares = 0;
        for (uint256 i = 0; i < count; i++) {
            if (walletIssuancesTimestamps[_wallet][i] + lockPeriod > _time) {
                totalLockedShares += walletIssuancesValues[_wallet][i];
            }
        }

        if (totalLockedShares == 0) {
            return 0;
        }

        uint256 locked = getRebasingProvider().convertSharesToTokens(totalLockedShares);
        uint256 balance = getToken().balanceOf(_wallet);
        return locked < balance ? locked : balance;
    }

    function _cleanupIssuances(address _wallet) internal {
        uint256 lockPeriod = getComplianceConfigurationService().getNonUSLockPeriod();
        uint256 currentCount = walletIssuancesCounters[_wallet];

        if (currentCount == 0) return;

        uint256 currentIndex = 0;
        while (currentIndex < currentCount) {
            if (walletIssuancesTimestamps[_wallet][currentIndex] + lockPeriod <= block.timestamp) {
                if (currentIndex != currentCount - 1) {
                    walletIssuancesTimestamps[_wallet][currentIndex] = walletIssuancesTimestamps[_wallet][currentCount - 1];
                    walletIssuancesValues[_wallet][currentIndex] = walletIssuancesValues[_wallet][currentCount - 1];
                }
                delete walletIssuancesTimestamps[_wallet][currentCount - 1];
                delete walletIssuancesValues[_wallet][currentCount - 1];
                currentCount--;
            } else {
                currentIndex++;
            }
        }

        walletIssuancesCounters[_wallet] = currentCount;
    }

    // ─── View helpers for off-chain tooling ───────────────────────────────────

    function lockedAt(address _wallet, uint256 _time) external view returns (uint256) {
        return _lockedAt(_wallet, _time);
    }

    function issuancesCount(address _wallet) external view returns (uint256) {
        return walletIssuancesCounters[_wallet];
    }
}
