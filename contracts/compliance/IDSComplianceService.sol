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

abstract contract IDSComplianceService {

    uint256 internal constant NONE = 0;
    uint256 internal constant US = 1;
    uint256 internal constant EU = 2;
    uint256 internal constant FORBIDDEN = 4;
    uint256 internal constant JP = 8;
    string internal constant TOKEN_PAUSED = "Token Paused";
    string internal constant NOT_ENOUGH_TOKENS = "Not Enough Tokens";
    string internal constant TOKENS_LOCKED = "Tokens Locked";
    string internal constant WALLET_NOT_IN_REGISTRY_SERVICE = "Wallet not in registry Service";
    string internal constant DESTINATION_RESTRICTED = "Destination restricted";
    string internal constant VALID = "Valid";
    string internal constant HOLD_UP = "Under lock-up";
    string internal constant ONLY_FULL_TRANSFER = "Only Full Transfer";
    string internal constant FLOWBACK = "Flowback";
    string internal constant MAX_INVESTORS_IN_CATEGORY = "Max Investors in category";
    string internal constant AMOUNT_OF_TOKENS_UNDER_MIN = "Amount of tokens under min";
    string internal constant AMOUNT_OF_TOKENS_ABOVE_MAX = "Amount of tokens above max";
    string internal constant ONLY_ACCREDITED = "Only accredited";
    string internal constant ONLY_US_ACCREDITED = "Only us accredited";
    string internal constant NOT_ENOUGH_INVESTORS = "Not enough investors";
    string internal constant MAX_AUTHORIZED_SECURITIES_EXCEEDED = "Max authorized securities exceeded";

    function initialize() public virtual;

    function adjustInvestorCountsAfterCountryChange(
        string memory _id,
        string memory _country,
        string memory _prevCountry
    ) public virtual returns (bool);

    //*****************************************
    // TOKEN ACTION VALIDATIONS
    //*****************************************

    function validateTransfer(
        address _from,
        address _to,
        uint256 _value /*onlyToken*/
    ) public virtual returns (bool);

    function validateTransfer(
        address _from,
        address _to,
        uint256 _value, /*onlyToken*/
        bool _pausedToken,
        uint256 _balanceFrom
    ) public virtual returns (bool);

    function validateIssuance(
        address _to,
        uint256 _value,
        uint256 _issuanceTime /*onlyToken*/
    ) public virtual returns (bool);

    function validateIssuanceWithNoCompliance(
        address _to,
        uint256 _value,
        uint256 _issuanceTime /*onlyToken*/
    ) public virtual returns (bool);

    function validateBurn(
        address _who,
        uint256 _value /*onlyToken*/
    ) public virtual returns (bool);

    function validateSeize(
        address _from,
        address _to,
        uint256 _value /*onlyToken*/
    ) public virtual returns (bool);

    function preIssuanceCheck(address _to, uint256 _value) public view virtual returns (uint256 code, string memory reason);

    function preTransferCheck(
        address _from,
        address _to,
        uint256 _value
    ) public view virtual returns (uint256 code, string memory reason);

    function newPreTransferCheck(
        address _from,
        address _to,
        uint256 _value,
        uint256 _balanceFrom,
        bool _pausedToken
    ) public view virtual returns (uint256 code, string memory reason);

    function preInternalTransferCheck(
        address _from,
        address _to,
        uint256 _value
    ) public view virtual returns (uint256 code, string memory reason);

    function validateIssuanceTime(uint256 _issuanceTime) public view virtual returns (uint256 issuanceTime);

    function getComplianceTransferableTokens(
        address _who,
        uint256 _time,
        uint64 _lockTime
    ) public view virtual returns (uint256);
}
