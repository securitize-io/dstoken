pragma solidity ^0.5.0;

import "./ComplianceService.sol";
import "../registry/IDSRegistryService.sol";

/**
*   @title Concrete compliance service for tokens with whitelisted wallets.
*
*   This simple compliance service is meant to be used for tokens that only need to be validated against an investor registry.
*/

contract ComplianceServiceWhitelisted is ComplianceService {
    function initialize() public initializer onlyFromProxy {
        ComplianceService.initialize();
        VERSIONS.push(2);
    }

    function checkWhitelisted(address _who) public view returns (bool) {
        uint8 walletType = getWalletManager().getWalletType(_who);

        return
            (walletType != getWalletManager().NONE() && walletType != getWalletManager().OMNIBUS()) ||
            keccak256(abi.encodePacked(getRegistryService().getInvestor(_who))) != keccak256("");
    }

    function recordIssuance(address, uint256, uint256) internal returns (bool) {
        return true;
    }

    function recordTransfer(address, address, uint256) internal returns (bool) {
        return true;
    }

    function checkTransfer(address, address _to, uint256) internal view returns (uint256, string memory) {
        if (!checkWhitelisted(_to)) {
            return (20, WALLET_NOT_IN_REGISTRY_SERVICE);
        }

        return (0, VALID);
    }

    function preIssuanceCheck(address _to, uint256, bool) public view returns (uint256, string memory) {
        if (!checkWhitelisted(_to)) {
            return (20, WALLET_NOT_IN_REGISTRY_SERVICE);
        }

        return (0, VALID);
    }

    function recordBurn(address, uint256) internal returns (bool) {
        return true;
    }

    function recordOmnibusBurn(address, address, uint256) internal returns (bool) {
        return true;
    }

    function recordSeize(address, address, uint256) internal returns (bool) {
        return true;
    }

    function recordOmnibusSeize(address, address, address, uint256) internal returns (bool) {
        return true;
    }
}
