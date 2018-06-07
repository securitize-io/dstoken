pragma solidity ^0.4.23;

import "../DSServiceConsumerInterface.sol";
import "../zeppelin/token/ERC20/ERC20.sol";

contract DSComplianceServiceInterface is DSServiceConsumerInterface {

    modifier onlyToken() {
        assert(false);
        _;
    }

    function validateIssuance(address to, uint amount) /*onlyToken*/ public;
    function validate(address from, address to, uint amount) /*onlyToken*/ public;
    function preTransferCheck(address from, address to, uint amount) view /*onlyExchange*/ public returns (bool);

    //more functions to-be-added

}