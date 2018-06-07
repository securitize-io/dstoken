pragma solidity ^0.4.23;
import "./ESComplianceService.sol";

contract ESComplianceServiceNotRegulated is ESComplianceService{

    function recordIssuance(address, uint) internal returns (bool){
        return true;
    }

    function recordTransfer(address, address, uint) internal returns (bool){
        return true;
    }

    function checkTransfer(address, address, uint) view internal returns (bool){
        return true;
    }
}