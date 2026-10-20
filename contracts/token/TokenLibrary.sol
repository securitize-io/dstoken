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
import {IDSLockManager} from "../compliance/IDSLockManager.sol";
import {IDSComplianceService} from "../compliance/IDSComplianceService.sol";
import {IDSRegistryService} from "../registry/IDSRegistryService.sol";
import {CommonUtils} from "../utils/CommonUtils.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";


library TokenLibrary {
    event Issue(address indexed to, uint256 value, uint256 valueLocked);

    uint256 internal constant COMPLIANCE_SERVICE = 0;
    uint256 internal constant REGISTRY_SERVICE = 1;
    uint256 internal constant DEPRECATED_OMNIBUS_NO_ACTION = 0; // Deprecated, keep for backwards compatibility
    uint256 internal constant DEPRECATED_OMNIBUS_DEPOSIT = 1; // Deprecated, keep for backwards compatibility
    uint256 internal constant DEPRECATED_OMNIBUS_WITHDRAW = 2; // Deprecated, keep for backwards compatibility

    struct TokenData {
        mapping(address wallet => uint256 balance) walletsBalances;
        mapping(string investor => uint256 balance) investorsBalances;
        uint256 totalSupply;
        uint256 totalIssued;
    }

    struct SupportedFeatures {
        uint256 value;
    }

    // ─── Mint throttle & over-cap timelock (BC-2132) ─────────────────────────
    // Over-cap state transitions live here (external library, delegatecall from DSToken) so the
    // token stays under the EIP-170 size limit. Storage is DSToken's (TokenDataStore.pendingMints);
    // the events below mirror IDSMintThrottle's and are therefore emitted by the token.

    /// @dev Packed: address (20 bytes) + executed bool (1 byte) + cancelled bool (1 byte) = 22/32 bytes in slot 0.
    struct PendingMint {
        address to;
        bool executed;
        bool cancelled;
        uint256 amount;
        uint256 readyAt;
        uint256 expiresAt; // 0 = never expires
    }

    event OverCapMintScheduled(bytes32 indexed operationId, address indexed to, uint256 amount, uint256 readyAt);
    event OverCapMintExecuted(bytes32 indexed operationId);
    event OverCapMintCancelled(bytes32 indexed operationId);

    // ─── ERC-8056 scaled UI amount (BC-2599) ─────────────────────────────────
    // State transitions and conversions for SCALED_UI mode. Storage is DSToken's
    // (TokenDataStore.scaledUIAmount); the events mirror IScaledUIAmount's and are emitted by the token.

    /// @dev 18-decimal fixed point: 1e18 = 1.0, as required by ERC-8056.
    uint256 internal constant UI_MULTIPLIER_ONE = 1e18;

    /// @dev bounds on a scheduled multiplier, 1e-6 to 1e6 in 18-decimal fixed point
    uint256 internal constant MIN_UI_MULTIPLIER = 1e12;
    uint256 internal constant MAX_UI_MULTIPLIER = 1e24;

    struct ScaledUIAmountData {
        uint256 multiplier;    // current until effectiveAt
        uint256 newMultiplier; // current from effectiveAt on
        uint256 effectiveAt;   // 0 = nothing pending
    }

    event UIMultiplierUpdated(uint256 oldMultiplier, uint256 newMultiplier, uint256 effectiveAtTimestamp);
    event UIMultiplierUpdateCancelled(uint256 cancelledMultiplier, uint256 cancelledEffectiveAt);

    struct IssueParams {
        address _to;
        uint256 _value;
        uint256 _issuanceTime;
        uint256[] _valuesLocked;
        uint64[] _releaseTimes;
        string _reason;
        ISecuritizeRebasingProvider _rebasingProvider;
    }

    function setFeature(SupportedFeatures storage supportedFeatures, uint8 featureIndex, bool enable) public {
        uint256 base = 2;
        uint256 mask = base**featureIndex;

        // Enable only if the feature is turned off and disable only if the feature is turned on
        if (enable && (supportedFeatures.value & mask == 0)) {
            supportedFeatures.value = supportedFeatures.value ^ mask;
        } else if (!enable && (supportedFeatures.value & mask >= 1)) {
            supportedFeatures.value = supportedFeatures.value ^ mask;
        }
    }

    function issueTokensCustom(
        TokenData storage _tokenData,
        address[] memory _services,
        IDSLockManager _lockManager,
        IssueParams memory _params
    ) public returns (uint256) {
        //Check input values
        require(_params._to != address(0), "Invalid address");
        require(_params._value > 0, "Value is zero");
        require(_params._valuesLocked.length == _params._releaseTimes.length, "Wrong length of parameters");

        //Check issuance is allowed (and inform the compliance manager, possibly adding locks)
        IDSComplianceService(_services[COMPLIANCE_SERVICE]).validateIssuance(_params._to, _params._value, _params._issuanceTime);

        uint256 shares =  _params._rebasingProvider.convertTokensToShares(_params._value);

        _tokenData.totalSupply += shares;
        _tokenData.totalIssued += shares;
        _tokenData.walletsBalances[_params._to] += shares;

        updateInvestorBalance(_tokenData, IDSRegistryService(_services[REGISTRY_SERVICE]), _params._to, shares, CommonUtils.IncDec.Increase);

        uint256 totalLocked = 0;
        for (uint256 i = 0; i < _params._valuesLocked.length; i++) {
            totalLocked += _params._valuesLocked[i];
            _lockManager.addManualLockRecord(_params._to, _params._valuesLocked[i], _params._reason, _params._releaseTimes[i]);
        }
        require(totalLocked <= _params._value, "valueLocked must be smaller than value");
        emit Issue(_params._to, _params._value, totalLocked);
        return shares;
    }

    modifier validSeizeParameters(TokenData storage _tokenData, address _from, address _to, uint256 _shares) {
        require(_from != address(0), "Invalid address");
        require(_to != address(0), "Invalid address");
        require(_shares <= _tokenData.walletsBalances[_from], "Not enough balance");

        _;
    }

    function burn(
        TokenData storage _tokenData,
        address[] memory _services,
        address _who,
        uint256 _value,
        ISecuritizeRebasingProvider _rebasingProvider
    ) public returns (uint256) {
        uint256 sharesToBurn = _rebasingProvider.convertTokensToShares(_value);

        require(sharesToBurn <= _tokenData.walletsBalances[_who], "Not enough balance");
        // no need to require value <= totalSupply, since that would imply the
        // sender's balance is greater than the totalSupply, which *should* be an assertion failure

        IDSComplianceService(_services[COMPLIANCE_SERVICE]).validateBurn(_who, _value);

        _tokenData.walletsBalances[_who] -= sharesToBurn;
        updateInvestorBalance(
            _tokenData,
            IDSRegistryService(_services[REGISTRY_SERVICE]),
            _who,
            sharesToBurn,
            CommonUtils.IncDec.Decrease
        );

        _tokenData.totalSupply -= sharesToBurn;
        return sharesToBurn;
    }

    function seize(
        TokenData storage _tokenData,
        address[] memory _services,
        address _from,
        address _to,
        uint256 _value,
        uint256 _shares
)
    public
    validSeizeParameters(_tokenData, _from, _to, _shares)
    {
        IDSRegistryService registryService = IDSRegistryService(_services[REGISTRY_SERVICE]);
        IDSComplianceService(_services[COMPLIANCE_SERVICE]).validateSeize(_from, _to, _value);

        _tokenData.walletsBalances[_from] -= _shares;
        _tokenData.walletsBalances[_to] += _shares;
        updateInvestorBalance(_tokenData, registryService, _from, _shares, CommonUtils.IncDec.Decrease);
        updateInvestorBalance(_tokenData, registryService, _to, _shares, CommonUtils.IncDec.Increase);
    }

    function updateInvestorBalance(TokenData storage _tokenData, IDSRegistryService _registryService, address _wallet, uint256 _shares, CommonUtils.IncDec _increase) internal {
        string memory investor = _registryService.getInvestor(_wallet);
        if (!CommonUtils.isEmptyString(investor)) {
            uint256 balance = _tokenData.investorsBalances[investor];
            if (_increase == CommonUtils.IncDec.Increase) {
                balance += _shares;
            } else {
                balance -= _shares;
            }
            _tokenData.investorsBalances[investor] = balance;
        }
    }

    // ─── Mint throttle & over-cap timelock (BC-2132) ─────────────────────────

    /// @dev See IDSMintThrottle.scheduleOverCapIssuance. Role check is done by the token.
    function scheduleOverCapIssuance(
        mapping(bytes32 => PendingMint) storage _pendingMints,
        address _to,
        uint256 _amount,
        bytes32 _salt,
        uint256 _overCapDelay,
        uint256 _overCapGracePeriod
    ) public returns (bytes32 operationId) {
        require(_to != address(0), "Invalid address");
        require(_amount > 0, "Amount is zero");

        // Deliberately excludes block.timestamp. With it, the id changed between blocks, so the
        // guard below bound only within a single block and two accidental submissions of one
        // request — a retried job, a replaced transaction, a reorg re-mining at a different
        // timestamp — each created a live, independently executable pending mint. The salt is the
        // disambiguator, matching the convention the governance runbook documents for the
        // administrative timelocks. Keeping the id a pure function of its arguments also makes it
        // computable before broadcasting, so a caller can correlate its request without parsing
        // the emitted event. Executed, cancelled and expired operations all retain readyAt != 0,
        // so a spent salt stays spent and a retry after expiry needs a fresh one.
        operationId = keccak256(abi.encode(_to, _amount, _salt));
        require(_pendingMints[operationId].readyAt == 0, "Operation already scheduled");

        uint256 readyAt = block.timestamp + _overCapDelay;
        // overCapGracePeriod == 0 means no expiry; store expiresAt = 0 as the sentinel.
        uint256 expiresAt = _overCapGracePeriod > 0 ? readyAt + _overCapGracePeriod : 0;

        _pendingMints[operationId] = PendingMint({
            to: _to,
            executed: false,
            cancelled: false,
            amount: _amount,
            readyAt: readyAt,
            expiresAt: expiresAt
        });

        emit OverCapMintScheduled(operationId, _to, _amount, readyAt);
    }

    /// @dev See IDSMintThrottle.executeOverCapMint. Validates and marks the operation executed;
    ///      the token performs the mint with the returned recipient and amount.
    function executeOverCapMint(
        mapping(bytes32 => PendingMint) storage _pendingMints,
        bytes32 _operationId
    ) public returns (address to, uint256 amount) {
        PendingMint storage op = _pendingMints[_operationId];
        require(op.readyAt != 0, "Operation does not exist");
        require(!op.executed, "Operation already executed");
        require(!op.cancelled, "Operation already cancelled");
        require(block.timestamp >= op.readyAt, "Operation not ready");
        require(op.expiresAt == 0 || block.timestamp < op.expiresAt, "Operation expired");

        // CEI: mark executed before any external call to prevent reentrancy.
        op.executed = true;
        emit OverCapMintExecuted(_operationId);
        return (op.to, op.amount);
    }

    /// @dev See IDSMintThrottle.cancelOverCapMint. Role check is done by the token.
    function cancelOverCapMint(
        mapping(bytes32 => PendingMint) storage _pendingMints,
        bytes32 _operationId
    ) public {
        PendingMint storage op = _pendingMints[_operationId];
        require(op.readyAt != 0, "Operation does not exist");
        require(!op.executed, "Operation already executed");
        require(!op.cancelled, "Operation already cancelled");

        op.cancelled = true;
        emit OverCapMintCancelled(_operationId);
    }

    // ─── ERC-8056 scaled UI amount (BC-2599) ─────────────────────────────────

    /// @dev The multiplier in force now. The pending value is current from effectiveAt inclusive.
    function currentUIMultiplier(ScaledUIAmountData storage _data) public view returns (uint256) {
        return block.timestamp >= _data.effectiveAt ? _data.newMultiplier : _data.multiplier;
    }

    /// @dev raw → UI, rounded down so a display never exceeds what the holder owns.
    function toUIAmount(ScaledUIAmountData storage _data, uint256 _rawAmount) public view returns (uint256) {
        return Math.mulDiv(_rawAmount, currentUIMultiplier(_data), UI_MULTIPLIER_ONE);
    }

    /// @dev UI → raw, rounded down so the result never exceeds the raw balance behind a UI amount.
    ///      Round trips are therefore lossy: fromUIAmount(toUIAmount(x)) <= x.
    function fromUIAmount(ScaledUIAmountData storage _data, uint256 _uiAmount) public view returns (uint256) {
        return Math.mulDiv(_uiAmount, UI_MULTIPLIER_ONE, currentUIMultiplier(_data));
    }

    /// @dev Initialises the multiplier at 1.0 and announces it, so indexers have a starting point.
    function enableScaledUIAmount(ScaledUIAmountData storage _data) public {
        _data.multiplier = UI_MULTIPLIER_ONE;
        _data.newMultiplier = UI_MULTIPLIER_ONE;
        _data.effectiveAt = 0;
        emit UIMultiplierUpdated(0, UI_MULTIPLIER_ONE, block.timestamp);
    }

    /// @dev Schedules `_newMultiplier` for `_effectiveAt`. Mirrors the EIP reference implementation:
    ///      a pending update (now < effectiveAt) is superseded and announced as cancelled first; an
    ///      already-applied one is folded into `multiplier` before the new schedule is stored.
    function setUIMultiplier(ScaledUIAmountData storage _data, uint256 _newMultiplier, uint256 _effectiveAt) public {
        require(_newMultiplier >= MIN_UI_MULTIPLIER && _newMultiplier <= MAX_UI_MULTIPLIER, "Multiplier out of range");
        require(_effectiveAt > block.timestamp, "Effective At must be in the future");

        if (block.timestamp >= _data.effectiveAt) {
            // Nothing pending: the previously scheduled value is the current one.
            _data.multiplier = _data.newMultiplier;
        } else {
            emit UIMultiplierUpdateCancelled(_data.newMultiplier, _data.effectiveAt);
        }

        emit UIMultiplierUpdated(_data.multiplier, _newMultiplier, _effectiveAt);
        _data.newMultiplier = _newMultiplier;
        _data.effectiveAt = _effectiveAt;
    }

    /// @dev Drops a pending update; the current multiplier stays in force.
    function cancelUIMultiplierUpdate(ScaledUIAmountData storage _data) public {
        require(block.timestamp < _data.effectiveAt, "No pending update to cancel");

        emit UIMultiplierUpdateCancelled(_data.newMultiplier, _data.effectiveAt);
        _data.newMultiplier = _data.multiplier;
        _data.effectiveAt = 0;
    }
}
