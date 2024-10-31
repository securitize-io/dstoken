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

import "./IDSTokenReallocator.sol";
import "../utils/BaseDSContract.sol";

contract TokenReallocator is IDSTokenReallocator, BaseDSContract {

    function initialize() public override(IDSTokenReallocator) onlyProxy initializer {
        __BaseDSContract_init();
    }

    function reallocateTokens (
        string memory _id,
        address _wallet,
        string memory _collisionHash,
        string memory _country,
        uint8[] memory _attributeIds,
        uint256[] memory _attributeValues,
        uint256[] memory _attributeExpirations,
        uint256 _value,
        bool isAffiliate
    ) public override onlyIssuerOrTransferAgentOrAbove returns (bool) {
        require(_attributeValues.length == _attributeIds.length, "Wrong length of parameters");
        require(_attributeIds.length == _attributeExpirations.length, "Wrong length of parameters");
        IDSRegistryService registryService = getRegistryService();

        if (registryService.isWallet(_wallet)) {
            require(CommonUtils.isEqualString(registryService.getInvestor(_wallet), _id), "Wallet belongs to a different investor");
        } else {
            if (!registryService.isInvestor(_id)) {
                registryService.registerInvestor(_id, _collisionHash);
                registryService.setCountry(_id, _country);

                for (uint256 i = 0; i < _attributeIds.length; i++) {
                    registryService.setAttribute(_id, _attributeIds[i], _attributeValues[i], _attributeExpirations[i], "");
                }
            }
            registryService.addWallet(_wallet, _id);
        }

        address[] memory addresses = new address[](1);
        uint256[] memory values = new uint256[](1);
        addresses[0] = _wallet;
        values[0] = _value;
        getOmnibusTBEController().bulkTransfer(addresses, values);

        if (isAffiliate && !getLockManager().isInvestorLocked(_id)) {
            getLockManager().lockInvestor(_id);
        }
        return true;
    }
}
