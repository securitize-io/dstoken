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
import {IDSRegistryService} from "./IDSRegistryService.sol";
import {RegistryServiceDataStore} from "../data-stores/RegistryServiceDataStore.sol";
import {BaseDSContract} from "../utils/BaseDSContract.sol";

contract RegistryService is IDSRegistryService, RegistryServiceDataStore, BaseDSContract {

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public override onlyProxy initializer {
        __BaseDSContract_init();
    }

    function registerInvestor(string calldata _id, string calldata _collisionHash) public override onlyExchangeOrAbove newInvestor(_id) returns (bool) {
        investors[_id] = Investor(_id, _collisionHash, msg.sender, msg.sender, "", 0);

        emit DSRegistryServiceInvestorAdded(_id, msg.sender);

        return true;
    }

    function removeInvestor(string calldata _id) public override onlyExchangeOrAbove investorExists(_id) returns (bool) {
        require(getTrustService().getRole(msg.sender) != EXCHANGE || investors[_id].creator == msg.sender, "Insufficient permissions");
        require(investors[_id].walletCount == 0, "Investor has wallets");

        for (uint8 index = 0; index < 16; index++) {
            delete attributes[_id][index];
        }

        delete investors[_id];

        emit DSRegistryServiceInvestorRemoved(_id, msg.sender);

        return true;
    }

    function updateInvestor(
        string calldata _id,
        string calldata _collisionHash,
        string memory _country,
        address[] memory _wallets,
        uint8[] memory _attributeIds,
        uint256[] memory _attributeValues,
        uint256[] memory _attributeExpirations
    ) public override onlyIssuerOrTransferAgentOrAbove returns (bool) {
        require(_attributeValues.length == _attributeIds.length, "Wrong length of parameters");
        require(_attributeIds.length == _attributeExpirations.length, "Wrong length of parameters");

        if (!isInvestor(_id)) {
            registerInvestor(_id, _collisionHash);
        }

        if (bytes(_country).length > 0) {
            setCountry(_id, _country);
        }

        for (uint256 i = 0; i < _wallets.length; i++) {
            if (isWallet(_wallets[i])) {
                require(CommonUtils.isEqualString(getInvestor(_wallets[i]), _id), "Wallet belongs to a different investor");
            } else {
                addWallet(_wallets[i], _id);
            }
        }

        for (uint256 i = 0; i < _attributeIds.length; i++) {
            setAttribute(_id, _attributeIds[i], _attributeValues[i], _attributeExpirations[i], "");
        }

        return true;
    }

    function getInvestorDetailsFull(string memory _id)
        public
        view
        override
        returns (string memory, uint256[] memory, uint256[] memory, string memory, string memory, string memory, string memory)
    {
        string memory country = investors[_id].country;
        uint256[] memory attributeValues = new uint256[](4);
        uint256[] memory attributeExpiries = new uint256[](4);
        string[] memory attributeProofHashes = new string[](4);
        for (uint8 i = 0; i < 4; i++) {
            attributeValues[i] = getAttributeValue(_id, (uint8(2)**i));
            attributeExpiries[i] = getAttributeExpiry(_id, (uint8(2)**i));
            attributeProofHashes[i] = getAttributeProofHash(_id, (uint8(2)**i));
        }
        return (country, attributeValues, attributeExpiries, attributeProofHashes[0], attributeProofHashes[1], attributeProofHashes[2], attributeProofHashes[3]);
    }

    function setCountry(string calldata _id, string memory _country) public override onlyExchangeOrAbove investorExists(_id) returns (bool) {
        string memory prevCountry = getCountry(_id);
        if (!CommonUtils.isEqualString(prevCountry, _country)) {
            getComplianceService().adjustInvestorCountsAfterCountryChange(_id, _country, prevCountry);

            investors[_id].country = _country;

            emit DSRegistryServiceInvestorCountryChanged(_id, _country, msg.sender);
        }
        return true;
    }

    function getCountry(string memory _id) public view override returns (string memory) {
        return investors[_id].country;
    }

    function getCollisionHash(string calldata _id) public view override returns (string memory) {
        return investors[_id].collisionHash;
    }

    function setAttribute(string calldata _id, uint8 _attributeId, uint256 _value, uint256 _expiry, string memory _proofHash)
        public
        override
        onlyExchangeOrAbove
        investorExists(_id)
        returns (bool)
    {
        require(_attributeId < 16, "Unknown attribute");

        attributes[_id][_attributeId].value = _value;
        attributes[_id][_attributeId].expiry = _expiry;
        attributes[_id][_attributeId].proofHash = _proofHash;

        emit DSRegistryServiceInvestorAttributeChanged(_id, _attributeId, _value, _expiry, _proofHash, msg.sender);

        return true;
    }

    function getAttributeValue(string memory _id, uint8 _attributeId) public view override returns (uint256) {
        return attributes[_id][_attributeId].value;
    }

    function getAttributeExpiry(string memory _id, uint8 _attributeId) public view override returns (uint256) {
        return attributes[_id][_attributeId].expiry;
    }

    function getAttributeProofHash(string memory _id, uint8 _attributeId) public view override returns (string memory) {
        return attributes[_id][_attributeId].proofHash;
    }

    function addWallet(address _address, string memory _id) public override onlyExchangeOrAbove investorExists(_id) newWallet(_address) returns (bool) {
        require(!getWalletManager().isSpecialWallet(_address), "Wallet has special role");

        investorsWallets[_address] = Wallet(_id, msg.sender, msg.sender);
        investors[_id].walletCount++;

        emit DSRegistryServiceWalletAdded(_address, _id, msg.sender);

        return true;
    }


    function removeWallet(address _address, string memory _id) public override onlyExchangeOrAbove walletExists(_address) walletBelongsToInvestor(_address, _id) returns (bool) {
        require(getTrustService().getRole(msg.sender) != EXCHANGE || investorsWallets[_address].creator == msg.sender, "Insufficient permissions");

        delete investorsWallets[_address];
        investors[_id].walletCount--;

        emit DSRegistryServiceWalletRemoved(_address, _id, msg.sender);

        return true;
    }

    function getInvestor(address _address) public view override returns (string memory) {
        return investorsWallets[_address].owner;
    }

    function getInvestorDetails(address _address) public view override returns (string memory, string memory) {
        return (getInvestor(_address), getCountry(getInvestor(_address)));
    }

    function isInvestor(string memory _id) public view override returns (bool) {
        return !CommonUtils.isEmptyString(investors[_id].id);
    }

    function isAccreditedInvestor(string calldata _id) external view override returns (bool) {
        return getAttributeValue(_id, ACCREDITED) == APPROVED;
    }

    function isAccreditedInvestor(address _wallet) external view override returns (bool) {
        string memory investor = investorsWallets[_wallet].owner;
        return getAttributeValue(investor, ACCREDITED) == APPROVED;
    }

    function isQualifiedInvestor(address _wallet) external view override returns (bool) {
        string memory investor = investorsWallets[_wallet].owner;
        return getAttributeValue(investor, QUALIFIED) == APPROVED;
    }

    function isQualifiedInvestor(string calldata _id) external view override returns (bool) {
        return getAttributeValue(_id, QUALIFIED) == APPROVED;
    }

    function getInvestors(address _from, address _to) external view override returns (string memory, string memory) {
        return (investorsWallets[_from].owner, investorsWallets[_to].owner);
    }

    function isWallet(address _address) public view override returns (bool) {
        return isInvestor(getInvestor(_address));
    }
}
