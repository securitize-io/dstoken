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
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/interfaces/IERC20Metadata.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {
    IScaledUIAmount,
    IScaledUIAmountNewUIMultiplier,
    IScaledUIAmountConversion,
    IScaledUIAmountBalances,
    IDSScaledUIAmount
} from "./IScaledUIAmount.sol";

contract DSToken is
    StandardToken,
    IDSMintThrottle,
    IERC165,
    IScaledUIAmount,
    IScaledUIAmountNewUIMultiplier,
    IScaledUIAmountConversion,
    IScaledUIAmountBalances,
    IDSScaledUIAmount
{
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

        // New tokens default to ERC-8056 SCALED_UI mode (BC-2599): raw balances, display multiplier.
        // The rebasing provider wired later must keep its multiplier at 1e18 (deploy-all enforces it,
        // and the provider refuses to move it while this flag is set). MASTER can switch to REBASING
        // with setScaledUIAmountMode(false). Proxies upgraded from older versions never run this
        // initializer again, so they stay in REBASING mode.
        scaledUIAmountMode = true;
        TokenLibrary.enableScaledUIAmount(scaledUIAmount);
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
        // Meter the SHARES this mint creates, not the token amount. Ownership is the share
        // balance, and shares credited scale as 1 / multiplier — a value the same ROLE_ISSUER
        // authority can set. Metering tokens therefore let an issuer redefine the unit the cap is
        // denominated in and acquire an unbounded multiple of the cap in shares while the cap
        // recorded a compliant consumption.
        _checkThrottle(getRebasingProvider().convertTokensToShares(_value));
        _issue(_to, _value, _issuanceTime, _valuesLocked, _reason, _releaseTimes);
        return true;
    }

    function _issue(address _to, uint256 _value, uint256 _issuanceTime, uint256[] memory _valuesLocked, string memory _reason, uint64[] memory _releaseTimes) internal {
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
        // canTransfer only screens _from/_to; the spender exercising the allowance
        // (msg.sender) never reaches compliance otherwise, letting a denylisted/blacklisted
        // address direct a transfer between two clean wallets (OFAC FAQ 400). Same gap,
        // same fix, for both the global list and this token's own local list. The other
        // direction — granting a spender fresh authority in the first place — is screened
        // in StandardToken::_approve (covers approve()/permit()/increaseApproval()).
        _requireSpenderNotDenylisted(msg.sender);
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
       ERC-165 (BC-2599)
    *******************************/

    /// @inheritdoc IERC165
    /// @dev ERC-20 (+ Metadata, Permit) always; the ERC-8056 ids only in SCALED_UI mode, so an
    ///      ERC-8056-aware integrator never applies a UI multiplier on top of a rebased balance.
    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        if (
            interfaceId == type(IERC165).interfaceId ||
            interfaceId == type(IERC20).interfaceId ||
            interfaceId == type(IERC20Metadata).interfaceId ||
            interfaceId == type(IERC20Permit).interfaceId
        ) {
            return true;
        }
        if (!scaledUIAmountMode) {
            return false;
        }
        return
            interfaceId == type(IScaledUIAmount).interfaceId ||
            interfaceId == type(IScaledUIAmountNewUIMultiplier).interfaceId ||
            interfaceId == type(IScaledUIAmountConversion).interfaceId ||
            interfaceId == type(IScaledUIAmountBalances).interfaceId;
    }

    /******************************
       ERC-8056 SCALED UI AMOUNT (BC-2599)
    *******************************/

    /// @inheritdoc IDSScaledUIAmount
    function setScaledUIAmountMode(bool _enabled) external override onlyMaster {
        require(scaledUIAmountMode != _enabled, "Scaled UI amount mode unchanged");
        if (_enabled) {
            // balanceOf must stay raw in this mode; the provider refuses to move away from 1e18 afterwards.
            require(getRebasingProvider().multiplier() == TokenLibrary.UI_MULTIPLIER_ONE, "Rebasing multiplier must be 1e18");
            TokenLibrary.enableScaledUIAmount(scaledUIAmount);
        } else {
            // Leaving the mode must not change any number an integrator reads: the display multiplier
            // has to be identity with nothing scheduled. (The rebasing multiplier is 1e18 already.)
            require(
                block.timestamp >= scaledUIAmount.effectiveAt && scaledUIAmount.newMultiplier == TokenLibrary.UI_MULTIPLIER_ONE,
                "UI multiplier must be 1e18 with no pending update"
            );
        }
        scaledUIAmountMode = _enabled;
        emit ScaledUIAmountModeChanged(_enabled);
    }

    /// @inheritdoc IDSScaledUIAmount
    function scaledUIAmountEnabled() public view override returns (bool) {
        return scaledUIAmountMode;
    }

    /// @inheritdoc IDSScaledUIAmount
    function setUIMultiplier(uint256 _newMultiplier, uint256 _effectiveAt) external override onlyIssuerOrAbove {
        _requireScaledUIAmount();
        TokenLibrary.setUIMultiplier(scaledUIAmount, _newMultiplier, _effectiveAt);
    }

    /// @inheritdoc IDSScaledUIAmount
    function cancelUIMultiplierUpdate() external override onlyIssuerOrAbove {
        _requireScaledUIAmount();
        TokenLibrary.cancelUIMultiplierUpdate(scaledUIAmount);
    }

    /// @inheritdoc IScaledUIAmount
    function uiMultiplier() external view override returns (uint256) {
        _requireScaledUIAmount();
        return TokenLibrary.currentUIMultiplier(scaledUIAmount);
    }

    /// @inheritdoc IScaledUIAmountNewUIMultiplier
    function newUIMultiplier() external view override returns (uint256) {
        _requireScaledUIAmount();
        return scaledUIAmount.newMultiplier;
    }

    /// @inheritdoc IScaledUIAmountNewUIMultiplier
    function effectiveAt() external view override returns (uint256) {
        _requireScaledUIAmount();
        return scaledUIAmount.effectiveAt;
    }

    /// @inheritdoc IScaledUIAmountConversion
    function toUIAmount(uint256 _rawAmount) public view override returns (uint256) {
        _requireScaledUIAmount();
        return TokenLibrary.toUIAmount(scaledUIAmount, _rawAmount);
    }

    /// @inheritdoc IScaledUIAmountConversion
    function fromUIAmount(uint256 _uiAmount) external view override returns (uint256) {
        _requireScaledUIAmount();
        return TokenLibrary.fromUIAmount(scaledUIAmount, _uiAmount);
    }

    /// @inheritdoc IScaledUIAmountBalances
    function balanceOfUI(address _account) external view override returns (uint256) {
        return toUIAmount(balanceOf(_account));
    }

    /// @inheritdoc IScaledUIAmountBalances
    function totalSupplyUI() external view override returns (uint256) {
        return toUIAmount(totalSupply());
    }

    /// @dev One copy of the check instead of an inlined modifier at nine call sites (bytecode).
    function _requireScaledUIAmount() private view {
        require(scaledUIAmountMode, "Scaled UI amount not enabled");
    }

    /******************************
       MINT THROTTLE (BC-2132)
    *******************************/

    /// @inheritdoc IDSMintThrottle
    function setMintCap(uint256 _mintCapAmount, uint256 _mintCapWindow) external override onlyMaster {
        require(_mintCapAmount == 0 || _mintCapWindow > 0, "Window must be > 0 when cap is active");
        // Without a delay the over-cap path is schedule-and-execute in one block, i.e. an
        // unconditional bypass of the allowance. Enable order is therefore setOverCapDelay first,
        // then setMintCap; disabling reverses it.
        require(_mintCapAmount == 0 || overCapDelay > 0, "Over-cap delay must be set when cap is active");
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
        require(_overCapDelay > 0 || mintCapAmount == 0, "Over-cap delay must be > 0 while cap is active");
        overCapDelay = _overCapDelay;
        emit OverCapDelayUpdated(_overCapDelay);
    }

    /// @inheritdoc IDSMintThrottle
    function setOverCapGracePeriod(uint256 _overCapGracePeriod) external override onlyMaster {
        overCapGracePeriod = _overCapGracePeriod;
        emit OverCapGracePeriodUpdated(_overCapGracePeriod);
    }

    /// @inheritdoc IDSMintThrottle
    // Body lives in TokenLibrary (external library, delegatecall) to keep DSToken under the
    // EIP-170 size limit; the role check and the storage stay here.
    function scheduleOverCapIssuance(address _to, uint256 _amount, bytes32 _salt)
        external
        override
        onlyIssuerOrAbove
        returns (bytes32 operationId)
    {
        return TokenLibrary.scheduleOverCapIssuance(pendingMints, _to, _amount, _salt, overCapDelay, overCapGracePeriod);
    }

    /// @inheritdoc IDSMintThrottle
    function executeOverCapMint(bytes32 _operationId) external override onlyIssuerOrAbove {
        (address to, uint256 amount) = TokenLibrary.executeOverCapMint(pendingMints, _operationId);
        _issueUncapped(to, amount);
    }

    /// @inheritdoc IDSMintThrottle
    // Not onlyMaster: after governance handover MASTER is the master timelock, so cancelling would
    // itself be a queued operation and would mature long after a shorter overCapDelay had already
    // let the mint execute. ISSUER already controls the whole over-cap flow (it schedules and
    // executes), so it gains nothing here; TRANSFER_AGENT adds a canceller outside the issuer set,
    // which is what covers a compromised issuer key. Cancelling is fail-safe — the mint can be
    // rescheduled — whereas a missed cancel is unbounded issuance.
    function cancelOverCapMint(bytes32 _operationId) external override onlyIssuerOrTransferAgentOrAbove {
        TokenLibrary.cancelOverCapMint(pendingMints, _operationId);
    }

    /// @dev Checks the tumbling-window mint cap and updates state. Called by issueTokensWithMultipleLocks.
    ///      mintCapAmount == 0 is the fast-exit (disabled) path — single SLOAD.
    /// @dev `_shares` is share-denominated; see mintCapAmount in IDSMintThrottle.
    function _checkThrottle(uint256 _shares) internal {
        if (mintCapAmount == 0) return;
        if (block.timestamp >= windowStart + mintCapWindow) {
            windowStart = block.timestamp;
            mintedInWindow = 0;
        }
        // Defensive subtraction: handles the edge case where mintCapAmount was lowered
        // below mintedInWindow via setMintCap (which resets the window, making this 0).
        uint256 remaining = mintedInWindow >= mintCapAmount ? 0 : mintCapAmount - mintedInWindow;
        require(_shares <= remaining, "Mint cap exceeded");
        mintedInWindow += _shares;
        emit MintCapConsumed(_shares, mintedInWindow, windowStart);
    }

    /// @dev Mints tokens bypassing the cap check. Used by executeOverCapMint.
    ///      Compliance (validateIssuance) is still enforced — recipient status is
    ///      re-validated at execution time, not at schedule time.
    ///      No locks are applied; over-cap mints are always unlocked.
    function _issueUncapped(address _to, uint256 _value) internal {
        _issue(_to, _value, block.timestamp, new uint256[](0), "", new uint64[](0));
    }
}
