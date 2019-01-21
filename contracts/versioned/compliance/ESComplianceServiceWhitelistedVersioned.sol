pragma solidity ^0.4.23;
import "./ESComplianceServiceVersioned.sol";
import "../registry/DSRegistryServiceInterfaceVersioned.sol";

/**
*   @title Concrete compliance service for tokens with whitelisted wallets.
*
*   This simple compliance service is meant to be used for tokens that only need to be validated against an investor registry.
*/

contract ESComplianceServiceWhitelistedVersioned is ESComplianceServiceVersioned{

    constructor(address _address, string _namespace) public ESComplianceServiceVersioned(_address, _namespace) {
        VERSIONS.push(1);
    }

    function checkWhitelisted(address _who) view public returns (bool) {
      return getWalletManager().getWalletType(_who) != getWalletManager().NONE() || keccak256(abi.encodePacked(getRegistryService().getInvestor(_who))) != keccak256("");
    }

    function recordIssuance(address, uint, uint) internal returns (bool){
      return true;
    }

    function recordTransfer(address, address, uint) internal returns (bool){
      return true;
    }

    function checkTransfer(address, address _to, uint) view internal returns (uint, string){
      if (!checkWhitelisted(_to)) {
        return (20, WALLET_NOT_IN_REGISTRY_SERVICE);
      }

      return (0, VALID);
    }

    function preIssuanceCheck(address _to, uint) view public returns (uint, string){
      if (!checkWhitelisted(_to)) {
        return (20, WALLET_NOT_IN_REGISTRY_SERVICE);
      }

      return (0, VALID);
    }

    function recordBurn(address, uint) internal returns (bool){
      return true;
    }

    function recordSeize(address, address, uint) internal returns (bool){
      return true;
    }
}