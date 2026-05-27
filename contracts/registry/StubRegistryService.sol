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

import {IDSRegistryService} from "./IDSRegistryService.sol";
import {BaseDSContract} from "../utils/BaseDSContract.sol";

/**
 * @title StubRegistryService
 *
 * A no-op registry for permissionless tokens. All getters return empty/false so that
 * the existing `if (!isEmptyString(investor))` guards in DSToken/TokenLibrary make all
 * investor-keyed bookkeeping a no-op. State-changing functions return true silently,
 * allowing flows like TokenIssuer.issueTokens to complete without registry side-effects.
 */
contract StubRegistryService is IDSRegistryService, BaseDSContract {

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public override onlyProxy initializer {
        __BaseDSContract_init();
    }

    // ─── State-changing functions — all no-op, return true ───────────────────

    function registerInvestor(string calldata, string calldata) public pure override returns (bool) {
        return true;
    }

    function updateInvestor(
        string calldata, string calldata, string memory,
        address[] memory, uint8[] memory, uint256[] memory, uint256[] memory
    ) public pure override returns (bool) {
        return true;
    }

    function removeInvestor(string calldata) public pure override returns (bool) {
        return true;
    }

    function setCountry(string calldata, string memory) public pure override returns (bool) {
        return true;
    }

    function setAttribute(string calldata, uint8, uint256, uint256, string memory) public pure override returns (bool) {
        return true;
    }

    function addWallet(address, string memory) public pure override returns (bool) {
        return true;
    }

    function removeWallet(address, string memory) public pure override returns (bool) {
        return true;
    }

    // ─── View functions — all return empty/false ──────────────────────────────

    function getCountry(string memory) public pure override returns (string memory) {
        return "";
    }

    function getCollisionHash(string calldata) public pure override returns (string memory) {
        return "";
    }

    function getAttributeValue(string memory, uint8) public pure override returns (uint256) {
        return 0;
    }

    function getAttributeExpiry(string memory, uint8) public pure override returns (uint256) {
        return 0;
    }

    function getAttributeProofHash(string memory, uint8) public pure override returns (string memory) {
        return "";
    }

    function getInvestor(address) public pure override returns (string memory) {
        return "";
    }

    function getInvestorDetails(address) public pure override returns (string memory, string memory) {
        return ("", "");
    }

    function getInvestorDetailsFull(string memory)
        public pure override
        returns (string memory, uint256[] memory, uint256[] memory, string memory, string memory, string memory, string memory)
    {
        return ("", new uint256[](0), new uint256[](0), "", "", "", "");
    }

    function isInvestor(string memory) public pure override returns (bool) {
        return false;
    }

    function isWallet(address) public pure override returns (bool) {
        return false;
    }

    function isAccreditedInvestor(string calldata) external pure override returns (bool) {
        return false;
    }

    function isQualifiedInvestor(string calldata) external pure override returns (bool) {
        return false;
    }

    function isAccreditedInvestor(address) external pure override returns (bool) {
        return false;
    }

    function isQualifiedInvestor(address) external pure override returns (bool) {
        return false;
    }

    function getInvestors(address, address) external pure override returns (string memory, string memory) {
        return ("", "");
    }
}
