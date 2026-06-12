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

import {IDSToken} from "./IDSToken.sol";
import {IDSMintThrottle} from "./IDSMintThrottle.sol";
import {StandardToken} from "./StandardToken.sol";
import {ISecuritizeRebasingProvider} from "../rebasing/ISecuritizeRebasingProvider.sol";
import {RebasingLibrary} from "../rebasing/RebasingLibrary.sol";
import {TokenLibrary} from "./TokenLibrary.sol";
import {CommonUtils} from "../utils/CommonUtils.sol";

contract DSToken is StandardToken, IDSMintThrottle {
    // using FeaturesLibrary for SupportedFeatures;
    using TokenLibrary for TokenLibrary.SupportedFeatures;
    uint256 internal constant DEPRECATED_OMNIBUS_NO_ACTION = 0;  // Deprecated, kept for backward compatibility

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        string calldata _name,
        string calldata _symbol,
        uint8 _decimals
        ) public virtual override onlyProxy initializer {
        __StandardToken_init(_name);

        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }

    /******************************
       TOKEN CONFIGURATION
   *******************************/

    function setFeature(uint8 featureIndex, bool enable) public onlyMaster {
        supportedFeatures.setFeature(featureIndex, enable);
    }

    function setFeatures(uint256 features) public onlyMaster {
        supportedFeatures.value = features;
    }

    function totalIssued() public view returns (uint256) {
        ISecuritizeRebasingProvider rebasingProvider = getRebasingProvider();
        uint256 tokens = rebasingProvider.convertSharesToTokens(tokenData.totalIssued);
        return tokens;
    }

    /******************************
       TOKEN ISSUANCE (MINTING)
   *******************************/

    /**
     * @dev Issues unlocked tokens
     * @param _to address The address which is going to receive the newly issued tokens
     * @param _value uint256 the value of tokens to issue
     * @return true if successful
     */
    function issueTokens(
        address _to,
        uint256 _value /*onlyIssuerOrAbove*/
    ) public override returns (bool) {
        issueTokensCustom(_to, _value, block.timestamp, 0, "", 0);
        return true;
    }

    /**
     * @notice Issues tokens with optional locking parameters
     * @dev Issues tokens to an address with custom issuance time and optional single lock
     * @param _to The address which will receive the newly issued tokens
     * @param _value The amount of tokens to issue
     * @param _issuanceTime The timestamp when tokens are considered issued
     * @param _valueLocked The amount of tokens to be locked (0 for no lock)
     * @param _reason The reason for token issuance
     * @param _releaseTime The timestamp when locked tokens will be released
     * @return bool Returns true if successful
     */
    function issueTokensCustom(address _to, uint256 _value, uint256 _issuanceTime, uint256 _valueLocked, string memory _reason, uint64 _releaseTime)
    public
    virtual
    override
    returns (
    /*onlyIssuerOrAbove*/
        bool
    )
    {
        uint256[] memory valuesLocked;
        uint64[] memory releaseTimes;
        if (_valueLocked > 0) {
            valuesLocked = new uint256[](1);
            releaseTimes = new uint64[](1);
            valuesLocked[0] = _valueLocked;
            releaseTimes[0] = _releaseTime;
        }

        issueTokensWithMultipleLocks(_to, _value, _issuanceTime, valuesLocked, _reason, releaseTimes);
        return true;
    }

    function issueTokensWithMultipleLocks(address _to, uint256 _value, uint256 _issuanceTime, uint256[] memory _valuesLocked, string memory _reason, uint64[] memory _releaseTimes)
    public
    virtual
    override
    onlyIssuerOrAbove
    returns (bool)
    {
        _checkThrottle(_value);
        ISecuritizeRebasingProvider rebasingProvider = getRebasingProvider();
        TokenLibrary.IssueParams memory params = TokenLibrary.IssueParams({
            _to: _to,
            _value: _value,
            _issuanceTime: _issuanceTime,
            _valuesLocked: _valuesLocked,
            _releaseTimes: _releaseTimes,
            _reason: _reason,
            _rebasingProvider: rebasingProvider
        });
        uint256 shares = TokenLibrary.issueTokensCustom(
            tokenData,
            getCommonServices(),
            getLockManager(),
            params
            );

        emit Transfer(address(0), _to, _value);
        emit TxShares(address(0), _to, shares, rebasingProvider.multiplier());

        checkWalletsForList(address(0), _to);
        return true;
    }

    //*********************
    // TOKEN BURNING
    //*********************

    function burn(address _who, uint256 _value, string calldata _reason) public virtual override onlyIssuerOrTransferAgentOrAbove {
        ISecuritizeRebasingProvider rebasingProvider = getRebasingProvider();
        uint256 shares = TokenLibrary.burn(tokenData, getCommonServices(), _who, _value, rebasingProvider);
        emit Burn(_who, _value, _reason);
        emit Transfer(_who, address(0), _value);
        emit TxShares(_who, address(0), shares, rebasingProvider.multiplier());
        checkWalletsForList(_who, address(0));
    }

    //*********************
    // TOKEN SEIZING
    //*********************

    function seize(address _from, address _to, uint256 _value, string calldata _reason) public virtual override onlyTransferAgentOrAbove {
        ISecuritizeRebasingProvider rebasingProvider = getRebasingProvider();
        uint256 shares = rebasingProvider.convertTokensToShares(_value);

        TokenLibrary.seize(tokenData, getCommonServices(), _from, _to, _value, shares);

        emit Seize(_from, _to, _value, _reason);
        emit Transfer(_from, _to, _value);
        emit TxShares(_from, _to, shares, rebasingProvider.multiplier());
        checkWalletsForList(_from, _to);
    }

    //*********************
    // TRANSFER RESTRICTIONS
    //*********************

    /**
     * @dev Checks whether it can transfer with the compliance manager, if not -throws.
     */
    modifier canTransfer(address _sender, address _receiver, uint256 _value) {
        getComplianceService().validateTransfer(_sender, _receiver, _value, paused, super.balanceOf(_sender));
        _;
    }

    /**
     * @dev override for transfer with modifiers:
     * whether the token is not paused (checked in super class)
     * and that the sender is allowed to transfer tokens
     * @param _to The address that will receive the tokens.
     * @param _value The amount of tokens to be transferred.
     */
    function transfer(address _to, uint256 _value) public virtual override canTransfer(msg.sender, _to, _value) returns (bool) {
        return postTransferImpl(super.transfer(_to, _value), msg.sender, _to, _value);
    }

    /**
     * @dev override for transfer with modifiers:
     * whether the token is not paused (checked in super class)
     * and that the sender is allowed to transfer tokens
     * @param _from The address that will send the tokens.
     * @param _to The address that will receive the tokens.
     * @param _value The amount of tokens to be transferred.
     */
    function transferFrom(address _from, address _to, uint256 _value) public virtual override canTransfer(_from, _to, _value) returns (bool) {
        return postTransferImpl(super.transferFrom(_from, _to, _value), _from, _to, _value);
    }

    function postTransferImpl(bool _superResult, address _from, address _to, uint256 _value) internal returns (bool) {
        if (_superResult) {
            updateInvestorsBalancesOnTransfer(_from, _to, _value);
        }

        checkWalletsForList(_from, _to);

        return _superResult;
    }

    //*********************
    // WALLET ENUMERATION
    //****

    function getWalletAt(uint256 _index) public view override returns (address) {
        require(_index > 0 && _index <= walletsCount);
        return walletsList[_index];
    }

    function walletCount() public view override returns (uint256) {
        return walletsCount;
    }

    function checkWalletsForList(address _from, address _to) private {
        if (super.balanceOf(_from) == 0) {
            removeWalletFromList(_from);
        }
        if (super.balanceOf(_to) > 0) {
            addWalletToList(_to);
        }
    }

    function addWalletToList(address _address) private {
        //Check if it's already there
        uint256 existingIndex = walletsToIndexes[_address];
        if (existingIndex == 0) {
            //If not - add it
            uint256 index = walletsCount + 1;
            walletsList[index] = _address;
            walletsToIndexes[_address] = index;
            walletsCount = index;
        }
    }

    function removeWalletFromList(address _address) private {
        //Make sure it's there
        uint256 existingIndex = walletsToIndexes[_address];
        if (existingIndex != 0) {
            uint256 lastIndex = walletsCount;
            if (lastIndex != existingIndex) {
                //Put the last wallet instead of it (this will work even with 1 wallet in the list)
                address lastWalletAddress = walletsList[lastIndex];
                walletsList[existingIndex] = lastWalletAddress;
                walletsToIndexes[lastWalletAddress] = existingIndex;
            }

            delete walletsToIndexes[_address];
            delete walletsList[lastIndex];
            walletsCount = lastIndex - 1;
        }
    }

    //**************************************
    // MISCELLANEOUS FUNCTIONS
    //**************************************

    function balanceOfInvestor(string memory _id) public view override returns (uint256) {
        ISecuritizeRebasingProvider rebasingProvider = getRebasingProvider();

        uint256 tokens = rebasingProvider.convertSharesToTokens(tokenData.investorsBalances[_id]);

        return tokens;
    }


    function updateInvestorsBalancesOnTransfer(address _from, address _to, uint256 _value) internal {
        updateInvestorBalance(_from, _value, CommonUtils.IncDec.Decrease);
        updateInvestorBalance(_to, _value, CommonUtils.IncDec.Increase);
    }

    function updateInvestorBalance(address _wallet, uint256 _value, CommonUtils.IncDec _increase) internal override {
        string memory investor = getRegistryService().getInvestor(_wallet);
        if (!CommonUtils.isEmptyString(investor)) {
            uint256 balance = balanceOfInvestor(investor);
            if (_increase == CommonUtils.IncDec.Increase) {
                balance += _value;
            } else {
                balance -= _value;
            }

            ISecuritizeRebasingProvider rebasingProvider = getRebasingProvider();

            uint256 sharesBalance = rebasingProvider.convertTokensToShares(balance);

            tokenData.investorsBalances[investor] = sharesBalance;
        }
    }

    function preTransferCheck(address _from, address _to, uint256 _value) public view override returns (uint256 code, string memory reason) {
        return getComplianceService().preTransferCheck(_from, _to, _value);
    }

    function getCommonServices() internal view returns (address[] memory) {
        address[] memory services = new address[](2);
        services[0] = getDSService(COMPLIANCE_SERVICE);
        services[1] = getDSService(REGISTRY_SERVICE);
        return services;
    }

    /******************************
       MINT THROTTLE (BC-2132)
    *******************************/

    /// @inheritdoc IDSMintThrottle
    function setMintCap(uint256 _mintCapAmount, uint256 _mintCapWindow) external override onlyMaster {
        require(_mintCapAmount == 0 || _mintCapWindow > 0, "Window must be > 0 when cap is active");
        mintCapAmount = _mintCapAmount;
        mintCapWindow = _mintCapWindow;
        // Always reset the window on parameter change to avoid mid-window underflow
        // and to give a clean slate from the new configuration.
        windowStart = block.timestamp;
        mintedInWindow = 0;
        emit MintCapUpdated(_mintCapAmount, _mintCapWindow);
    }

    /// @inheritdoc IDSMintThrottle
    function setOverCapDelay(uint256 _overCapDelay) external override onlyMaster {
        overCapDelay = _overCapDelay;
        emit OverCapDelayUpdated(_overCapDelay);
    }

    /// @inheritdoc IDSMintThrottle
    function setOverCapGracePeriod(uint256 _overCapGracePeriod) external override onlyMaster {
        overCapGracePeriod = _overCapGracePeriod;
        emit OverCapGracePeriodUpdated(_overCapGracePeriod);
    }

    /// @inheritdoc IDSMintThrottle
    function scheduleOverCapIssuance(address _to, uint256 _amount, bytes32 _salt)
        external
        override
        onlyIssuerOrAbove
        returns (bytes32 operationId)
    {
        require(_to != address(0), "Invalid address");
        require(_amount > 0, "Amount is zero");

        operationId = keccak256(abi.encode(_to, _amount, _salt, block.timestamp));
        if (pendingMints[operationId].readyAt != 0) revert OverCapMintInvalidState(operationId);

        uint256 readyAt = block.timestamp + overCapDelay;
        // overCapGracePeriod == 0 means no expiry; store expiresAt = 0 as the sentinel.
        uint256 expiresAt = overCapGracePeriod > 0 ? readyAt + overCapGracePeriod : 0;

        pendingMints[operationId] = PendingMint({
            to: _to,
            executed: false,
            cancelled: false,
            amount: _amount,
            readyAt: readyAt,
            expiresAt: expiresAt
        });

        emit OverCapMintScheduled(operationId, _to, _amount, readyAt);
    }

    /// @inheritdoc IDSMintThrottle
    function executeOverCapMint(bytes32 _operationId) external override onlyIssuerOrAbove {
        PendingMint storage op = pendingMints[_operationId];
        if (op.readyAt == 0)                                      revert OverCapMintInvalidState(_operationId);
        if (op.executed)                                           revert OverCapMintInvalidState(_operationId);
        if (op.cancelled)                                          revert OverCapMintInvalidState(_operationId);
        if (block.timestamp < op.readyAt)                          revert OverCapMintNotReady(op.readyAt, block.timestamp);
        if (op.expiresAt != 0 && block.timestamp >= op.expiresAt)  revert OverCapMintExpired(_operationId);

        // CEI: mark executed before any external call to prevent reentrancy.
        op.executed = true;
        emit OverCapMintExecuted(_operationId);
        _issueUncapped(op.to, op.amount);
    }

    /// @inheritdoc IDSMintThrottle
    function cancelOverCapMint(bytes32 _operationId) external override onlyMaster {
        PendingMint storage op = pendingMints[_operationId];
        if (op.readyAt == 0)  revert OverCapMintInvalidState(_operationId);
        if (op.executed)       revert OverCapMintInvalidState(_operationId);
        if (op.cancelled)      revert OverCapMintInvalidState(_operationId);

        op.cancelled = true;
        emit OverCapMintCancelled(_operationId);
    }

    /// @dev Checks the tumbling-window mint cap and updates state. Called by issueTokensWithMultipleLocks.
    ///      mintCapAmount == 0 is the fast-exit (disabled) path — single SLOAD.
    function _checkThrottle(uint256 _amount) internal {
        if (mintCapAmount == 0) return;
        if (block.timestamp >= windowStart + mintCapWindow) {
            windowStart = block.timestamp;
            mintedInWindow = 0;
        }
        // Defensive subtraction: handles the edge case where mintCapAmount was lowered
        // below mintedInWindow via setMintCap (which resets the window, making this 0).
        uint256 remaining = mintedInWindow >= mintCapAmount ? 0 : mintCapAmount - mintedInWindow;
        if (_amount > remaining) revert MintCapExceeded(_amount, remaining);
        mintedInWindow += _amount;
        emit MintCapConsumed(_amount, mintedInWindow, windowStart);
    }

    /// @dev Mints tokens bypassing the cap check. Used by executeOverCapMint.
    ///      Compliance (validateIssuance) is still enforced — recipient status is
    ///      re-validated at execution time, not at schedule time.
    ///      No locks are applied; over-cap mints are always unlocked.
    function _issueUncapped(address _to, uint256 _value) internal {
        ISecuritizeRebasingProvider rebasingProvider = getRebasingProvider();
        TokenLibrary.IssueParams memory params = TokenLibrary.IssueParams({
            _to: _to,
            _value: _value,
            _issuanceTime: block.timestamp,
            _valuesLocked: new uint256[](0),
            _releaseTimes: new uint64[](0),
            _reason: "",
            _rebasingProvider: rebasingProvider
        });
        uint256 shares = TokenLibrary.issueTokensCustom(
            tokenData,
            getCommonServices(),
            getLockManager(),
            params
        );
        emit Transfer(address(0), _to, _value);
        emit TxShares(address(0), _to, shares, rebasingProvider.multiplier());
        checkWalletsForList(address(0), _to);
    }
}
