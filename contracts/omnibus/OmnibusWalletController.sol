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

pragma solidity ^0.8.20;

import "./IDSOmnibusWalletController.sol";
import "../data-stores/OmnibusControllerDataStore.sol";
import "../utils/BaseDSContract.sol";

contract OmnibusWalletController is IDSOmnibusWalletController, OmnibusControllerDataStore, BaseDSContract {

    modifier onlyOperatorOrAbove {
        IDSTrustService trustService = getTrustService();
        require(
            trustService.getRole(msg.sender) == trustService.ISSUER() ||
            trustService.getRole(msg.sender) == trustService.MASTER() ||
            trustService.isResourceOwner(omnibusWallet, msg.sender) ||
            trustService.isResourceOperator(omnibusWallet, msg.sender),
            "Insufficient trust level"
        );
        _;
    }

    modifier enoughBalance(address _who, uint256 _value) {
        require(balances[_who] >= _value, "Not enough balance");
        _;
    }

    function initialize(address _omnibusWallet) public override initializer onlyProxy {
        require(_omnibusWallet != address(0), "Omnibus wallet can not be zero address");
        __BaseDSContract_init();

        omnibusWallet = _omnibusWallet;
    }

    function setAssetTrackingMode(uint8 _assetTrackingMode) public override onlyOperatorOrAbove {
        require(_assetTrackingMode == BENEFICIARY || _assetTrackingMode == HOLDER_OF_RECORD, "Invalid tracking mode value");
        require(getToken().balanceOf(omnibusWallet) == 0, "Omnibus wallet must be empty");

        assetTrackingMode = _assetTrackingMode;
    }

    function getAssetTrackingMode() public view override returns (uint8) {
        return assetTrackingMode;
    }

    function isHolderOfRecord() public view override returns (bool) {
        return assetTrackingMode == HOLDER_OF_RECORD;
    }

    function balanceOf(address _who) public view override returns (uint256) {
        return balances[_who];
    }

    function deposit(address _to, uint256 _value) public override onlyToken {
        balances[_to] += _value;
    }

    function withdraw(address _from, uint256 _value) public override enoughBalance(_from, _value) onlyToken {
        balances[_from] -= _value;
    }

    function transfer(address _from, address _to, uint256 _value) public override onlyOperatorOrAbove enoughBalance(_from, _value) {
        balances[_from] -= _value;
        balances[_to] += _value;

        if (assetTrackingMode == BENEFICIARY) {
            getToken().updateOmnibusInvestorBalance(omnibusWallet, _from, _value, CommonUtils.IncDec.Decrease);
            getToken().updateOmnibusInvestorBalance(omnibusWallet, _to, _value, CommonUtils.IncDec.Increase);
        }

        getToken().emitOmnibusTransferEvent(omnibusWallet, _from, _to, _value);
    }

    function seize(address _from, uint256 _value) public override enoughBalance(_from, _value) onlyToken {
        balances[_from] -= _value;
    }

    function burn(address _who, uint256 _value) public override enoughBalance(_who, _value) onlyToken {
        balances[_who] -= _value;
    }
}
