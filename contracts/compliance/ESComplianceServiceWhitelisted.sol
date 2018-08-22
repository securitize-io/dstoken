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

    function checkWhitelisted(address _who) view internal returns (bool) {
      DSRegistryServiceInterface registry = DSRegistryServiceInterface(getDSService(REGISTRY_SERVICE));
      return getWalletManager().getWalletType(_who) != getWalletManager().NONE() || keccak256(abi.encodePacked(registry.getInvestor(_who))) != keccak256("");
    }

    function recordIssuance(address _to, uint) internal returns (bool){
      return checkWhitelisted(_to);
    }

    function recordTransfer(address, address, uint) internal returns (bool){
      return true;
    }

    function checkTransfer(address, address _to, uint) view internal returns (uint, string){
      if (!checkWhitelisted(_to)) {
        return (20, WALLET_NOT_IN_TEGISTRY_SERVICE);
      }

      return (0, VALID);
    }

    function preIssuanceCheck(address _to, uint _value) view public returns (uint code, string reason){
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