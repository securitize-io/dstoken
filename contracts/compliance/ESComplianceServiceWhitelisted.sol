pragma solidity ^0.4.23;
import "./ESComplianceService.sol";
import "../registry/DSRegistryServiceInterface.sol";

/**
*   @title Concrete compliance service for tokens with whitelisted wallets.
*
*   This simple compliance service is meant to be used for tokens that only need to be validated against an investor registry.
*/

contract ESComplianceServiceWhitelisted is ESComplianceService{

    constructor(address _address, string _namespace) public ESComplianceService(_address, _namespace) {}

    function recordIssuance(address _to, uint) internal returns (bool){
        DSRegistryServiceInterface registry = DSRegistryServiceInterface(getDSService(REGISTRY_SERVICE));
        return getWalletType(_to) != NONE || keccak256(abi.encodePacked(registry.getInvestor(_to))) != keccak256("");
    }

    function recordTransfer(address, address _to, uint) internal returns (bool){
        return true;
    }

    function checkTransfer(address, address _to, uint) view internal returns (uint, string){
        DSRegistryServiceInterface registry = DSRegistryServiceInterface(getDSService(REGISTRY_SERVICE));
        if (getWalletType(_to) == NONE && keccak256(abi.encodePacked(registry.getInvestor(_to))) == keccak256("")) {
          return (20, "Wallet Not In Registry Service");
        }

        return (0, "Valid");
    }

    function recordBurn(address, uint) internal returns (bool){
        return true;
    }

    function recordSeize(address, address, uint) internal returns (bool){
        return true;
    }
}