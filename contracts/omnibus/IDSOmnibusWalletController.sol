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

abstract contract IDSOmnibusWalletController {
    uint8 public constant BENEFICIARY = 0;
    uint8 public constant HOLDER_OF_RECORD = 1;

    function initialize(address _omnibusWallet) public virtual;

    function setAssetTrackingMode(uint8 _assetTrackingMode) public virtual;

    function getAssetTrackingMode() public view virtual returns (uint8);

    function isHolderOfRecord() public view virtual returns (bool);

    function balanceOf(address _who) public view virtual returns (uint256);

    function transfer(
        address _from,
        address _to,
        uint256 _value /*onlyOperator*/
    ) public virtual;

    function deposit(
        address _to,
        uint256 _value /*onlyToken*/
    ) public virtual;

    function withdraw(
        address _from,
        uint256 _value /*onlyToken*/
    ) public virtual;

    function seize(
        address _from,
        uint256 _value /*onlyToken*/
    ) public virtual;

    function burn(
        address _from,
        uint256 _value /*onlyToken*/
    ) public virtual;
}
