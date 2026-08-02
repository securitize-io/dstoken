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

/// @title IDSMintThrottle
/// @notice Interface for DSToken's on-chain mint throttling and over-cap timelock controls.
/// @dev Two complementary safety mechanisms:
///      1. Tumbling-window cap — limits cumulative minting within a rolling time window.
///      2. Over-cap timelock — allows large exceptional mints to be pre-scheduled and executed
///         after a mandatory delay, with a cancellation window for the MASTER role.
interface IDSMintThrottle {

    // ─── Events ───────────────────────────────────────────────────────────────

    /// @notice Emitted on every successful throttled mint.
    /// @param amount       Tokens minted in this call.
    /// @param totalInWindow Cumulative tokens minted in the current window after this mint.
    /// @param windowStart  Timestamp when the current window started.
    event MintCapConsumed(uint256 amount, uint256 totalInWindow, uint256 windowStart);

    /// @notice Emitted when the mint cap parameters are updated.
    /// @dev Also resets the current window (windowStart = block.timestamp, mintedInWindow = 0).
    event MintCapUpdated(uint256 mintCapAmount, uint256 mintCapWindow);

    /// @notice Emitted when the over-cap delay is updated.
    event OverCapDelayUpdated(uint256 overCapDelay);

    /// @notice Emitted when the over-cap grace period is updated.
    event OverCapGracePeriodUpdated(uint256 overCapGracePeriod);

    /// @notice Emitted when an over-cap mint is scheduled.
    /// @param operationId Unique identifier for the pending mint.
    /// @param to          Recipient of the scheduled mint.
    /// @param amount      Token amount to be minted.
    /// @param readyAt     Earliest timestamp at which the mint can be executed.
    event OverCapMintScheduled(bytes32 indexed operationId, address indexed to, uint256 amount, uint256 readyAt);

    /// @notice Emitted when a scheduled over-cap mint is successfully executed.
    event OverCapMintExecuted(bytes32 indexed operationId);

    /// @notice Emitted when a scheduled over-cap mint is cancelled.
    event OverCapMintCancelled(bytes32 indexed operationId);

    // ─── Functions ────────────────────────────────────────────────────────────

    /// @notice Pre-schedules a mint that exceeds the current cap.
    /// @dev Only callable by ISSUER or above. The mint cannot be executed until
    ///      block.timestamp >= readyAt (= block.timestamp + overCapDelay at schedule time).
    ///      If overCapGracePeriod > 0 the operation expires at readyAt + overCapGracePeriod.
    ///      operationId = keccak256(abi.encode(to, amount, salt, block.timestamp)).
    /// @param to     Recipient address. Must not be address(0).
    /// @param amount Token amount to mint. Must be > 0.
    /// @param salt   Caller-supplied entropy to prevent operationId collisions.
    /// @return operationId The unique identifier for the scheduled mint.
    function scheduleOverCapIssuance(address to, uint256 amount, bytes32 salt)
        external
        returns (bytes32 operationId);

    /// @notice Executes a previously scheduled over-cap mint once its delay has elapsed.
    /// @dev Only callable by ISSUER or above. Bypasses the mint cap check.
    ///      Compliance (validateIssuance) is still enforced at execution time.
    ///      Uses CEI: marks executed=true before any external call.
    /// @param operationId The identifier returned by scheduleOverCapIssuance.
    function executeOverCapMint(bytes32 operationId) external;

    /// @notice Cancels a pending over-cap mint before it is executed.
    /// @dev Only callable by MASTER. Can be called after readyAt (even within grace period).
    /// @param operationId The identifier returned by scheduleOverCapIssuance.
    function cancelOverCapMint(bytes32 operationId) external;

    /// @notice Sets the tumbling-window mint cap.
    /// @dev Only callable by MASTER. Resets the current window immediately.
    ///      Set mintCapAmount to 0 to disable the cap entirely.
    ///      Once Ticket 2 (governance TimelockController) is deployed, calls to this
    ///      function should be routed through it.
    /// @param mintCapAmount Max tokens mintable per window. 0 = cap disabled.
    /// @param mintCapWindow Window duration in seconds. Must be > 0 when mintCapAmount > 0.
    function setMintCap(uint256 mintCapAmount, uint256 mintCapWindow) external;

    /// @notice Sets the mandatory wait time between scheduling and executing an over-cap mint.
    /// @dev Only callable by MASTER. 0 = no waiting period (useful for testing).
    ///      Once Ticket 2 is deployed, route through governance TimelockController.
    function setOverCapDelay(uint256 delay) external;

    /// @notice Sets how long after readyAt a scheduled mint remains executable before expiring.
    /// @dev Only callable by MASTER. 0 = operations never expire.
    ///      Once Ticket 2 is deployed, route through governance TimelockController.
    function setOverCapGracePeriod(uint256 gracePeriod) external;
}
