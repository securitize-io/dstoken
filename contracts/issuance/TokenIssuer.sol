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

pragma solidity 0.8.22;

import "./IDSTokenIssuer.sol";
import "../utils/BaseDSContract.sol";

contract TokenIssuer is IDSTokenIssuer, BaseDSContract {
    function initialize() public override onlyProxy initializer {
        __BaseDSContract_init();
    }

    function issueTokens(
        string memory _id,
        address _to,
        uint256[] memory _issuanceValues,
        string calldata _reason,
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
        // all parameters required or none for Token Issuer
        require(_attributeValues.length == 0 || _attributeValues.length == 3, "Wrong length of parameters");
        uint8[] memory attributesIds;
        if (_attributeValues.length == 3) {
            attributesIds = new uint8[](3);
            attributesIds[0] = KYC_APPROVED;
            attributesIds[1] = ACCREDITED;
            attributesIds[2] = QUALIFIED;
        } else {
            attributesIds = new uint8[](0);
        }
        address[] memory investorWallets = new address[](1);
        investorWallets[0] = _wallet;
        getRegistryService().updateInvestor(
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
