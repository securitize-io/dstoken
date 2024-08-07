pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

//SPDX-License-Identifier: GPL-3.0
contract TokenERC20 is ERC20 {
    uint8 private tokenDecimals;
    /**
     * @dev Constructor that gives msg.sender all of existing tokens.
     */
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _initialSupply,
        uint8 _decimals
    ) ERC20(_name, _symbol) {
        tokenDecimals = _decimals;
        _mint(msg.sender, _initialSupply);
    }

    function decimals() public view virtual override returns (uint8) {
        return tokenDecimals;
    }
}


