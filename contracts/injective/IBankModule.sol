/**
 * Copyright 2025 Securitize Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

pragma solidity 0.8.22;

interface IBankModule {
    function mint(address account, uint256 amount) external payable returns (bool);

    function balanceOf(address token, address account) external view returns (uint256);

    function burn(address account, uint256 amount) external payable returns (bool);

    function transfer(address from, address to, uint256 amount) external payable returns (bool);

    function totalSupply(address token) external view returns (uint256);

    function metadata(address token) external view returns (string memory, string memory, uint8);

    function setMetadata(string memory name, string memory symbol, uint8 decimals) external payable returns (bool);
}
