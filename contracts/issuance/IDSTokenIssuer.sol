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

abstract contract IDSTokenIssuer {

    function initialize() public virtual;

    //Same values as IDSRegistryService
    uint8 public constant KYC_APPROVED = 1;
    uint8 public constant ACCREDITED = 2;
    uint8 public constant QUALIFIED = 4;


    function issueTokens(
        string memory _id,
        address _to,
        uint256[] memory _issuanceValues,
        string calldata _reason,
        uint256[] memory _locksValues,
        uint64[] memory _lockReleaseTimes,
        string memory _collisionHash,
        string memory _country,
        uint256[] memory attributeValues,
        uint256[] memory attributeExpirations /*onlyIssuerOrAbove*/
    ) public virtual returns (bool);
}
