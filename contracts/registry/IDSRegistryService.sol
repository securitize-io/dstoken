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

import {CommonUtils} from "../utils/CommonUtils.sol";

abstract contract IDSRegistryService {

    function initialize() public virtual;

    event DSRegistryServiceInvestorAdded(string investorId, address sender);
    event DSRegistryServiceInvestorRemoved(string investorId, address sender);
    event DSRegistryServiceInvestorCountryChanged(string investorId, string country, address sender);
    event DSRegistryServiceInvestorAttributeChanged(string investorId, uint256 attributeId, uint256 value, uint256 expiry, string proofHash, address sender);
    event DSRegistryServiceWalletAdded(address wallet, string investorId, address sender);
    event DSRegistryServiceWalletRemoved(address wallet, string investorId, address sender);

    uint8 public constant NONE = 0;
    uint8 public constant KYC_APPROVED = 1;
    uint8 public constant ACCREDITED = 2;
    uint8 public constant QUALIFIED = 4;
    uint8 public constant PROFESSIONAL = 8;

    uint8 public constant PENDING = 0;
    uint8 public constant APPROVED = 1;
    uint8 public constant REJECTED = 2;

    uint8 public constant EXCHANGE = 4;

    modifier investorExists(string memory _id) {
        require(isInvestor(_id), "Unknown investor");
        _;
    }

    modifier newInvestor(string memory _id) {
        require(!CommonUtils.isEmptyString(_id), "Investor id must not be empty");
        require(!isInvestor(_id), "Investor already exists");
        _;
    }

    modifier walletExists(address _address) {
        require(isWallet(_address), "Unknown wallet");
        _;
    }

    modifier newWallet(address _address) {
        require(!isWallet(_address), "Wallet already exists");
        _;
    }

    modifier walletBelongsToInvestor(address _address, string memory _id) {
        require(CommonUtils.isEqualString(getInvestor(_address), _id), "Wallet does not belong to investor");
        _;
    }

    function registerInvestor(
        string calldata _id,
        string calldata _collision_hash /*onlyExchangeOrAbove newInvestor(_id)*/
    ) public virtual returns (bool);

    function updateInvestor(
        string calldata _id,
        string calldata _collisionHash,
        string memory _country,
        address[] memory _wallets,
        uint8[] memory _attributeIds,
        uint256[] memory _attributeValues,
        uint256[] memory _attributeExpirations /*onlyIssuerOrAbove*/
    ) public virtual returns (bool);

    function removeInvestor(
        string calldata _id /*onlyExchangeOrAbove investorExists(_id)*/
    ) public virtual returns (bool);

    function setCountry(
        string calldata _id,
        string memory _country /*onlyExchangeOrAbove investorExists(_id)*/
    ) public virtual returns (bool);

    function getCountry(string memory _id) public view virtual returns (string memory);

    function getCollisionHash(string calldata _id) public view virtual returns (string memory);

    function setAttribute(
        string calldata _id,
        uint8 _attributeId,
        uint256 _value,
        uint256 _expiry,
        string memory _proofHash /*onlyExchangeOrAbove investorExists(_id)*/
    ) public virtual returns (bool);

    function getAttributeValue(string memory _id, uint8 _attributeId) public view virtual returns (uint256);

    function getAttributeExpiry(string memory _id, uint8 _attributeId) public view virtual returns (uint256);

    function getAttributeProofHash(string memory _id, uint8 _attributeId) public view virtual returns (string memory);

    function addWallet(
        address _address,
        string memory _id /*onlyExchangeOrAbove newWallet(_address)*/
    ) public virtual returns (bool);

    function addWalletByInvestor(address _address) public virtual returns (bool);

    function removeWallet(
        address _address,
        string memory _id /*onlyExchangeOrAbove walletExists walletBelongsToInvestor(_address, _id)*/
    ) public virtual returns (bool);

    function getInvestor(address _address) public view virtual returns (string memory);

    function getInvestorDetails(address _address) public view virtual returns (string memory, string memory);

    function getInvestorDetailsFull(string memory _id)
        public
        view
        virtual
        returns (string memory, uint256[] memory, uint256[] memory, string memory, string memory, string memory, string memory);

    function isInvestor(string memory _id) public view virtual returns (bool);

    function isWallet(address _address) public view virtual returns (bool);

    function isAccreditedInvestor(string calldata _id) external view virtual returns (bool);

    function isQualifiedInvestor(string calldata _id) external view virtual returns (bool);

    function isAccreditedInvestor(address _wallet) external view virtual returns (bool);

    function isQualifiedInvestor(address _wallet) external view virtual returns (bool);

    function getInvestors(address _from, address _to) external view virtual returns (string memory, string memory);
}
