pragma solidity ^0.4.23;
import "./ESComplianceServiceVersioned.sol";

/**
*   @title Concrete compliance service for tokens with no regulation
*
*   This simple compliance service is meant to be used for tokens outside of any specific regulations
*   it simply returns true for all checks.
*/

contract ESComplianceServiceNotRegulatedVersioned is ESComplianceServiceVersioned {
    constructor(address _address, string _namespace) public ESComplianceServiceVersioned(_address, _namespace) {
        VERSIONS.push(1);
    }

    function recordIssuance(address, uint, uint) internal returns (bool){
        return true;
    }

    function recordTransfer(address, address, uint) internal returns (bool){
        return true;
    }

    function checkTransfer(address, address, uint) view internal returns (uint, string){
        return (0, VALID);
    }

    function preIssuanceCheck(address, uint) view public returns (uint code, string reason){
        code = 0;
        reason = VALID;
    }

    function recordBurn(address, uint) internal returns (bool){
        return true;
    }
    function recordSeize(address, address, uint) internal returns (bool){
        return true;
    }
}