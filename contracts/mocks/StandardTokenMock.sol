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

import "../token/StandardToken.sol";

// mock class using StandardToken
contract StandardTokenMock is StandardToken {

    function initialize(string calldata _name, string calldata _symbol, uint8 _decimals) public virtual override onlyProxy initializer {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }

    function balanceOfInvestor(string memory) public pure override returns (uint256) {
        revertFunction();
    }

    function burn(address, uint256, string calldata) public pure override {
        revertFunction();
    }

    function getWalletAt(uint256) public pure override returns (address) {
        revertFunction();
    }

    function issueTokens(address, uint256) public pure override returns (bool) {
        revertFunction();
    }

    function issueTokensCustom(address, uint256, uint256, uint256, string memory, uint64) public pure override returns (bool) {
        revertFunction();
    }

    function issueTokensWithMultipleLocks(address, uint256, uint256, uint256[] memory, string memory, uint64[] memory) public pure override returns (bool) {
        revertFunction();
    }

    function issueTokensWithNoCompliance(address, uint256) public pure override {
        revertFunction();
    }

    function preTransferCheck(address, address, uint256) public pure override returns (uint256, string memory) {
        revertFunction();
    }

    function seize(address, address, uint256, string calldata) public pure override {
        revertFunction();
    }

    function setCap(uint256) public pure override {
        revertFunction();
    }

    function updateInvestorBalance(address, uint256, CommonUtils.IncDec) internal pure override returns (bool) {
        revertFunction();
    }

    function walletCount() public pure override returns (uint256) {
        revertFunction();
    }

    function revertFunction() private pure {
        revert("not implemented");
    }
}
