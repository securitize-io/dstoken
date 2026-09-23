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

import {ServiceConsumerDataStore} from "./ServiceConsumerDataStore.sol";
import {TokenLibrary} from '../token/TokenLibrary.sol';

contract TokenDataStore is ServiceConsumerDataStore {

    TokenLibrary.TokenData internal tokenData;
    mapping(address owner => mapping(address spender => uint256 allowance)) internal allowances;
    mapping(uint256 index => address wallet) internal walletsList;
    uint256 internal walletsCount;
    mapping(address wallet => uint256 index) internal walletsToIndexes;
    // These two variables replace the 2-slot TokenPartitions struct to preserve storage layout
    address internal DEPRECATED_PARTITIONS_WALLETS;
    address internal DEPRECATED_PARTITIONS_BALANCES;
    uint256 public DEPRECATED_CAP;
    string public name;
    string public symbol;
    uint8 public decimals;
    TokenLibrary.SupportedFeatures public supportedFeatures;
    bool internal paused;

    // ─── Mint throttle & over-cap timelock (BC-2132) ─────────────────────────
    // Storage appended here, consuming 7 slots from __gap (35 → 28). Safe for
    // existing proxy upgrades: all new vars default to 0, which means cap
    // disabled and no pending mints — identical behaviour to pre-upgrade state.

    /// @dev Packed: address (20 bytes) + executed bool (1 byte) + cancelled bool (1 byte) = 22/32 bytes in slot 0.
    struct PendingMint {
        address to;
        bool executed;
        bool cancelled;
        uint256 amount;
        uint256 readyAt;
        uint256 expiresAt; // 0 = never expires
    }

    /// @notice Maximum SHARES mintable in a single window. 0 = throttle disabled.
    uint256 public mintCapAmount;
    /// @notice Duration of each tumbling window in seconds. Must be > 0 when mintCapAmount > 0.
    uint256 public mintCapWindow;
    /// @notice Timestamp when the current mint window started.
    uint256 public windowStart;
    /// @notice Shares already minted in the current window.
    uint256 public mintedInWindow;
    /// @notice Seconds between scheduling and executing an over-cap mint. 0 = no wait.
    uint256 public overCapDelay;
    /// @notice Seconds after readyAt before a scheduled mint expires. 0 = never expires.
    uint256 public overCapGracePeriod;
    /// @notice Pending over-cap mints keyed by operationId.
    mapping(bytes32 => PendingMint) public pendingMints;

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[28] private __gap;
}
