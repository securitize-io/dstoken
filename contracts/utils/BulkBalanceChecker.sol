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

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BulkBalanceChecker {
    /**
     * @notice Returns the ERC20 token balance for a list of wallets
     * @param token The address of the ERC20 token contract
     * @param wallets The list of wallet addresses to check
     * @return balances The list of balances corresponding to each wallet
     */
    function getTokenBalances(address token, address[] calldata wallets)
        external
        view
        returns (uint256[] memory balances)
    {
        uint256 length = wallets.length;
        balances = new uint256[](length);
        IERC20 erc20 = IERC20(token);

        for (uint256 i = 0; i < length; i++) {
            balances[i] = erc20.balanceOf(wallets[i]);
        }
    }
}
