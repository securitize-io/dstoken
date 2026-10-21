/**
 * Copyright 2026 Securitize Inc. All rights reserved.
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

// ERC-8056: Scaled UI Amount Extension for ERC-20 Tokens (Draft, CC0).
// https://eips.ethereum.org/EIPS/eip-8056
//
// The four interfaces below are copied from the EIP so that type(I).interfaceId yields the ids the
// spec publishes (0xa60bf13d, 0x4bd27648, 0x57854fc3, 0xd890fd71). The multiplier has 18 decimals
// (1e18 = 1.0) and only affects what integrators display: balanceOf, transfer and Transfer events
// keep raw amounts.

/// @title ERC-8056 core interface (required)
interface IScaledUIAmount {
    /// @notice Emitted whenever a multiplier update is scheduled or applied.
    event UIMultiplierUpdated(uint256 oldMultiplier, uint256 newMultiplier, uint256 effectiveAtTimestamp);

    /// @notice Optional in the spec; DSToken does not emit it (see BC-2599).
    event TransferWithUIAmount(address indexed from, address indexed to, uint256 amount, uint256 uiAmount);

    /// @notice Emitted when a scheduled update is cancelled or superseded before it took effect.
    event UIMultiplierUpdateCancelled(uint256 cancelledMultiplier, uint256 cancelledEffectiveAt);

    /// @notice The multiplier integrators should apply to raw amounts right now (18 decimals).
    function uiMultiplier() external view returns (uint256);
}

/// @title ERC-8056 pending-multiplier extension (required by the spec)
interface IScaledUIAmountNewUIMultiplier {
    /// @notice The multiplier that becomes (or already is) current at effectiveAt().
    function newUIMultiplier() external view returns (uint256);

    /// @notice Timestamp at which newUIMultiplier() takes effect. In the past once applied.
    function effectiveAt() external view returns (uint256);
}

/// @title ERC-8056 conversion extension (optional)
interface IScaledUIAmountConversion {
    function toUIAmount(uint256 rawAmount) external view returns (uint256);

    function fromUIAmount(uint256 uiAmount) external view returns (uint256);
}

/// @title ERC-8056 balances extension (optional)
interface IScaledUIAmountBalances {
    function balanceOfUI(address account) external view returns (uint256);

    function totalSupplyUI() external view returns (uint256);
}

/// @title DS Token administration of the ERC-8056 multiplier (Securitize-specific, not part of the EIP)
/// @dev A token is either SCALED_UI (the default for new tokens: balanceOf is raw, the ERC-8056
///      multiplier is a display hint) or REBASING (SecuritizeRebasingProvider scales balanceOf).
///      MASTER may switch the mode, but only while both multipliers are at 1.0 and nothing is
///      pending, so no balance anyone reads changes meaning at the switch. In SCALED_UI mode the
///      rebasing multiplier is frozen at 1e18 so a balance can never be scaled twice.
interface IDSScaledUIAmount {
    /// @notice Emitted when the token switches between SCALED_UI (true) and REBASING (false).
    event ScaledUIAmountModeChanged(bool enabled);

    /// @notice Switches the mode. MASTER only.
    ///         Enabling requires the rebasing multiplier to be exactly 1e18 and resets the UI multiplier
    ///         to 1e18 (emits UIMultiplierUpdated(0, 1e18, now)).
    ///         Disabling requires the UI multiplier to be 1e18 with no pending update.
    function setScaledUIAmountMode(bool enabled) external;

    /// @notice True when the token is in SCALED_UI mode.
    function scaledUIAmountEnabled() external view returns (bool);

    /// @notice Schedules a multiplier change. ISSUER or above. `effectiveAtTimestamp` must be in the
    ///         future; a still-pending update is superseded (UIMultiplierUpdateCancelled is emitted first).
    function setUIMultiplier(uint256 newMultiplier, uint256 effectiveAtTimestamp) external;

    /// @notice Cancels a pending update. ISSUER or above. Reverts if nothing is pending.
    function cancelUIMultiplierUpdate() external;
}
