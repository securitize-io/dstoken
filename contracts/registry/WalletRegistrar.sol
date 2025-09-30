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

import {IDSWalletRegistrar} from "./IDSWalletRegistrar.sol";
import {BaseDSContract} from "../utils/BaseDSContract.sol";
import {IDSRegistryService} from "./IDSRegistryService.sol";
import {CommonUtils} from "../utils/CommonUtils.sol";

contract WalletRegistrar is IDSWalletRegistrar, BaseDSContract {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public override onlyProxy initializer {
        __BaseDSContract_init();
    }

    function registerWallet(
        string memory _id,
        address[] calldata _wallets,
        string calldata _collisionHash,
        string memory _country,
        uint8[] memory _attributeIds,
        uint256[] memory _attributeValues,
        uint256[] memory _attributeExpirations
    ) public override onlyOwnerOrIssuerOrAbove returns (bool) {
        IDSRegistryService registryService = getRegistryService();

        registryService.updateInvestor(
            _id,
            _collisionHash,
            _country,
            _wallets,
            _attributeIds,
            _attributeValues,
            _attributeExpirations
        );

        return true;
    }
}
