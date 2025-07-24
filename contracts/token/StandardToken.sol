/**
 * Copyright 2024 Securitize Inc. All rights reserved.
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

import "../data-stores/TokenDataStore.sol";
import {ISecuritizeRebasingProvider} from "../rebasing/ISecuritizeRebasingProvider.sol";
import {BaseDSContract} from "../utils/BaseDSContract.sol";
import "../rebasing/RebasingLibrary.sol";

abstract contract StandardToken is IDSToken, TokenDataStore, BaseDSContract {
    event Pause();
    event Unpause();

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    modifier whenPaused() {
        require(paused, "Contract is not paused");
        _;
    }

    function __StandardToken_init() public onlyProxy onlyInitializing {
        __BaseDSContract_init();
    }

    function pause() public onlyTransferAgentOrAbove whenNotPaused {
        paused = true;
        emit Pause();
    }

    function unpause() public onlyTransferAgentOrAbove whenPaused {
        paused = false;
        emit Unpause();
    }

    function isPaused() public view override returns (bool) {
        return paused;
    }

    /**
     * @dev Gets the balance of the specified address.
     * @param _owner The address to query the the balance of.
     * @return An uint256 representing the amount owned by the passed address.
     */
    function balanceOf(address _owner) public view returns (uint256) {
        ISecuritizeRebasingProvider rebasingProvider = ISecuritizeRebasingProvider(getDSService(REBASING_PROVIDER));
        uint256 shares = tokenData.walletsBalances[_owner];

        uint256 tokens = rebasingProvider.convertSharesToTokens(shares);

        return tokens;
    }

    function totalSupply() public view returns (uint256) {
        ISecuritizeRebasingProvider rebasingProvider = ISecuritizeRebasingProvider(getDSService(REBASING_PROVIDER));

        uint256 totalSupplyTokens = rebasingProvider.convertSharesToTokens(tokenData.totalSupply);

        return totalSupplyTokens;
    }

    /**
     * @dev transfer token for a specified address
     * @param _to The address to transfer to.
     * @param _value The amount to be transferred.
     */
    function transfer(address _to, uint256 _value) public virtual returns (bool) {
        return transferImpl(msg.sender, _to, _value);
    }

    function transferFrom(
        address _from,
        address _to,
        uint256 _value
    ) public virtual returns (bool) {
        return transferImpl(_from, _to, _value);
    }

    function transferImpl(
        address _from,
        address _to,
        uint256 _value
    ) internal returns (bool) {
        require(_to != address(0));
        ISecuritizeRebasingProvider rebasingProvider = ISecuritizeRebasingProvider(getDSService(REBASING_PROVIDER));

        uint256 _shares = rebasingProvider.convertTokensToShares(_value);

        require(_shares <= tokenData.walletsBalances[_from]);

        tokenData.walletsBalances[_from] -= _shares;
        tokenData.walletsBalances[_to] += _shares;

        emit Transfer(_from, _to, _value);
        emit TxShares(_from, _to, _shares, rebasingProvider.multiplier());
        return true;
    }

    function approve(address _spender, uint256 _value) public returns (bool) {
        allowances[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
        return true;
    }

    function allowance(address _owner, address _spender) public view returns (uint256) {
        return allowances[_owner][_spender];
    }

    function increaseApproval(address _spender, uint256 _addedValue) public returns (bool) {
        allowances[msg.sender][_spender] = allowances[msg.sender][_spender] + _addedValue;
        emit Approval(msg.sender, _spender, allowances[msg.sender][_spender]);
        return true;
    }

    function decreaseApproval(address _spender, uint256 _subtractedValue) public returns (bool) {
        uint256 oldValue = allowances[msg.sender][_spender];
        if (_subtractedValue > oldValue) {
            allowances[msg.sender][_spender] = 0;
        } else {
            allowances[msg.sender][_spender] = oldValue - _subtractedValue;
        }
        emit Approval(msg.sender, _spender, allowances[msg.sender][_spender]);
        return true;
    }
}
