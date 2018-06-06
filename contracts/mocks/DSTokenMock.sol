pragma solidity ^0.4.23;

import "../token/DSToken.sol";
import "../zeppelin/token/ERC20/DetailedERC20.sol";

contract DSTokenMock is DSToken, DetailedERC20 {

    constructor(
        string _name,
        string _symbol,
        uint8 _decimals
    )
    DetailedERC20(_name, _symbol, _decimals)
    public
    {}

}