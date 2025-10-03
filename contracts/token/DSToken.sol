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
import {StandardToken} from "./StandardToken.sol";
import {ISecuritizeRebasingProvider} from "../rebasing/ISecuritizeRebasingProvider.sol";
import {RebasingLibrary} from "../rebasing/RebasingLibrary.sol";
import {TokenLibrary} from "./TokenLibrary.sol";
import {CommonUtils} from "../utils/CommonUtils.sol";

contract DSToken is StandardToken {
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
        __StandardToken_init();

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
     * @dev Issuing tokens from the fund
     * @param _to address The address which is going to receive the newly issued tokens
     * @param _value uint256 the value of tokens to issue
     * @param _valueLocked uint256 value of tokens, from those issued, to lock immediately.
     * @param _reason reason for token locking
     * @param _releaseTime timestamp to release the lock (or 0 for locks which can only released by an unlockTokens call)
     * @return true if successful
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
}
