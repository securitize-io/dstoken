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

import {IDSTokenIssuer} from "./IDSTokenIssuer.sol";
import {IDSRegistryService} from "../registry/IDSRegistryService.sol";
import {BaseDSContract} from "../utils/BaseDSContract.sol";
import {CommonUtils} from "../utils/CommonUtils.sol";

contract TokenIssuer is IDSTokenIssuer, BaseDSContract {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public override onlyProxy initializer {
        __BaseDSContract_init();
    }

    function issueTokens(
        string calldata _id,
        address _to,
        uint256[] memory _issuanceValues,
        string memory _reason,
        uint256[] memory _locksValues,
        uint64[] memory _lockReleaseTimes,
        string memory _collisionHash,
        string memory _country,
        uint256[] memory _attributeValues,
        uint256[] memory _attributeExpirations
    ) public override onlyIssuerOrAbove returns (bool) {
        require(_issuanceValues.length == 2, "Wrong length of parameters");
        require(_attributeValues.length == _attributeExpirations.length, "Wrong length of parameters");
        require(_locksValues.length == _lockReleaseTimes.length, "Wrong length of parameters");
        if (getRegistryService().isWallet(_to)) {
            require(CommonUtils.isEqualString(getRegistryService().getInvestor(_to), _id), "Wallet does not belong to investor");
        } else {
            registerInvestor(_id, _to, _collisionHash, _country, _attributeValues, _attributeExpirations);
        }

        getToken().issueTokensWithMultipleLocks(_to, _issuanceValues[0], _issuanceValues[1], _locksValues, _reason, _lockReleaseTimes);

        return true;
    }

    function registerInvestor(
        string memory _id,
        address _wallet,
        string memory _collisionHash,
        string memory _country,
        uint256[] memory _attributeValues,
        uint256[] memory _attributeExpirations
    ) private {
        IDSRegistryService registryService = getRegistryService();
        uint8 EXPECTED_NUM_ATTRIBUTES = 3;
        // all parameters required or none for Token Issuer
        require(_attributeValues.length == 0 || _attributeValues.length == EXPECTED_NUM_ATTRIBUTES, "Wrong length of parameters");
        uint8[] memory attributesIds;
        if (_attributeValues.length == EXPECTED_NUM_ATTRIBUTES) {
            attributesIds = new uint8[](EXPECTED_NUM_ATTRIBUTES);
            attributesIds[0] = registryService.KYC_APPROVED();
            attributesIds[1] = registryService.ACCREDITED();
            attributesIds[2] = registryService.QUALIFIED();
        } else {
            attributesIds = new uint8[](0);
        }
        address[] memory investorWallets = new address[](1);
        investorWallets[0] = _wallet;
        registryService.updateInvestor(
            _id,
            _collisionHash,
            _country,
            investorWallets,
            attributesIds,
            _attributeValues,
            _attributeExpirations
        );
    }
}
