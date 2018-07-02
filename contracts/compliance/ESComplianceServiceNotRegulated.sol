pragma solidity ^0.4.23;
import "./ESComplianceService.sol";

/**
*   @title Concrete compliance service for tokens with no regulation
*
*   This simple compliance service is meant to be used for tokens outside of any specific regulations
*   it simply returns true for all checks.
*/

contract ESComplianceServiceNotRegulated is ESComplianceService{

    constructor(address _address, string _namespace) public ESComplianceService(_address, _namespace) {}

    function recordIssuance(address, uint) internal returns (bool){
        return true;
    }

    function recordTransfer(address, address, uint) internal returns (bool){
        return true;
    }

    function checkTransfer(address, address, uint) view internal returns (bool){
        return true;
    }

    function recordBurn(address, uint) internal returns (bool){
        return true;
    }
    function recordSeize(address, address, uint) internal returns (bool){
        return true;
    }
}