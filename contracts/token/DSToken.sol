pragma solidity ^0.4.23;

import "./ESStandardToken.sol";
import "./ESPausableToken.sol";
import "../zeppelin/token/ERC20/DetailedERC20.sol";
import "../ESServiceConsumer.sol";

contract DSToken is ESStandardToken,ESPausableToken,DetailedERC20,ESServiceConsumer {

    constructor(
        string _name,
        string _symbol,
        uint8 _decimals,
        address _storageAddress,
        string _namespace
    )
    DetailedERC20(_name, _symbol, _decimals)
    ESServiceConsumer(_storageAddress, _namespace)
    public
    {}



}