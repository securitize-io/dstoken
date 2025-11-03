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

import {BaseDSContract} from "../utils/BaseDSContract.sol";
import {CommonUtils} from "../utils/CommonUtils.sol";
import {IDSToken} from "./IDSToken.sol";
import {ISecuritizeRebasingProvider} from "../rebasing/ISecuritizeRebasingProvider.sol";
import {RebasingLibrary} from "../rebasing/RebasingLibrary.sol";
import {TokenDataStore} from "../data-stores/TokenDataStore.sol";
import {ERC20PermitMixin} from "./ERC20PermitMixin.sol";

abstract contract StandardToken is IDSToken, TokenDataStore, BaseDSContract, ERC20PermitMixin {
    event Pause();
    event Unpause();

    /**
     * @dev Emitted when the token symbol is updated
     * @param oldSymbol The previous symbol of the token
     * @param newSymbol The new symbol of the token
     */
    event SymbolUpdated(string oldSymbol, string newSymbol);

    /**
     * @dev Emitted when the token name is updated
     * @param oldName The previous name of the token
     * @param newName The new name of the token
     */
    event NameUpdated(string oldName, string newName);

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    modifier whenPaused() {
        require(paused, "Contract is not paused");
        _;
    }

    function __StandardToken_init(string calldata name_) public onlyProxy onlyInitializing {
        __BaseDSContract_init();
        __ERC20PermitMixin_init(name_);
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
     * @dev Updates the token name and symbol
     * @param _newName New name for the token
     * @param _symbol New symbol for the token
     * @notice Only callable by Master role
     */
    function updateNameAndSymbol(string calldata _newName, string calldata _symbol) external onlyMaster {
        require(!CommonUtils.isEmptyString(_newName), "Name cannot be empty");
        require(!CommonUtils.isEmptyString(_symbol), "Symbol cannot be empty");
        if (!CommonUtils.isEqualString(_newName, name)) {
            _updateName(_newName);
        }
        if (!CommonUtils.isEqualString(_symbol, symbol)) {
            _updateSymbol(_symbol);
        }
    }

    /**
     * @dev Internal function to update the token name
     * @param _newName New name to set
     */
    function _updateName(string calldata _newName) private {
        emit NameUpdated(name, _newName);
        name = _newName;
    }

    /**
     * @dev Internal function to update the token symbol
     * @param _symbol New symbol to set
     */
    function _updateSymbol(string calldata _symbol) private {
        emit SymbolUpdated(symbol, _symbol);
        symbol = _symbol;
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
        require(_value <= allowances[_from][msg.sender], "Not enough allowance");
        allowances[_from][msg.sender] -= _value;
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
        _approve(msg.sender, _spender, _value);
        return true;
    }

    function _approve(address owner, address spender, uint256 value) internal virtual override {
        require(owner != address(0), "Approve from zero");
        require(spender != address(0), "Approve to zero");

        allowances[owner][spender] = value;
        emit Approval(owner, spender, value);
    }

    function _name() internal view virtual override returns (string memory) {
        return name;
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

    /**********************
     * PERMIT EXTENSIONS
     **********************/

    /**
     * @notice Approve and transfer tokens in one transaction using EIP-2612 signature.
     * @param from The owner whose tokens will be transferred.
     * @param to The recipient.
     * @param value The token amount to transfer.
     * @param deadline Signature expiry timestamp.
     * @param v,r,s ECDSA signature components.
     */
    function transferWithPermit(
        address from,
        address to,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external returns (bool) {
        // 1. Use EIP-2612 permit to approve msg.sender
        permit(from, msg.sender, value, deadline, v, r, s);
        // 2. Perform the actual transferFrom
        return transferFrom(from, to, value);
    }
}
