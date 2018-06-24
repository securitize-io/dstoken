pragma solidity ^0.4.23;
import "./ESComplianceService.sol";

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