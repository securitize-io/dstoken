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

import {IBulkOperator} from "./IBulkOperator.sol";
import {IDSToken} from "../token/IDSToken.sol";
import {IDSTrustService} from "../trust/IDSTrustService.sol";
import {TokenIssuer} from "../issuance/TokenIssuer.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {BaseDSContract} from "../utils/BaseDSContract.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

contract BulkOperator is  IBulkOperator, BaseDSContract, PausableUpgradeable {

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    IDSToken public dsToken;

    function initialize(address _dsToken) public override initializer onlyProxy {
        dsToken = IDSToken(_dsToken);
        __Pausable_init();
        __BaseDSContract_init();
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function getVersion() external pure returns (uint8) {
        return 2;
    }

    function bulkIssuance(address[] calldata addresses, uint256[] calldata values, uint256 issuanceTime) whenNotPaused onlyIssuerOrAbove external {
        require(addresses.length == values.length, "Addresses and values length mismatch");

        for (uint256 i = 0; i < addresses.length; i++) {
            dsToken.issueTokensCustom(addresses[i], values[i], issuanceTime, 0, "", 0);
        }
    }

    function bulkRegisterAndIssuance(BulkRegisterAndIssuance[] calldata data) whenNotPaused onlyIssuerOrAbove external {
        TokenIssuer tokenIssuer = TokenIssuer(getDSService(TOKEN_ISSUER));
        for (uint256 i = 0; i < data.length; i++) {
            BulkRegisterAndIssuance memory currentBulkAndIssuance = data[i];

            tokenIssuer.issueTokens(
                currentBulkAndIssuance.id,
                currentBulkAndIssuance.to,
                currentBulkAndIssuance.issuanceValues,
                currentBulkAndIssuance.reason,
                currentBulkAndIssuance.locksValues,
                currentBulkAndIssuance.lockReleaseTimes,
                "",
                currentBulkAndIssuance.country,
                currentBulkAndIssuance.attributeValues,
                currentBulkAndIssuance.attributeExpirations
            );
        }
    }

    function bulkBurn(address[] calldata addresses, uint256[] memory values) whenNotPaused onlyIssuerOrTransferAgentOrAbove external {
        require(addresses.length == values.length, "Addresses and values length mismatch");

        for (uint256 i = 0; i < addresses.length; i++) {
            dsToken.burn(addresses[i], values[i], "");
        }
    }
}
