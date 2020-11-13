pragma solidity 0.5.17;

import "./ComplianceService.sol";

/**
*   @title Concrete compliance service for tokens with no regulation
*
*   This simple compliance service is meant to be used for tokens outside of any specific regulations
*   it simply returns true for all checks.
*/

contract ComplianceServiceNotRegulated is ComplianceService {
    function initialize() public initializer forceInitializeFromProxy {
        ComplianceService.initialize();
        VERSIONS.push(3);
    }

    function recordIssuance(address, uint256, uint256) internal returns (bool) {
        return true;
    }

    function recordTransfer(address, address, uint256) internal returns (bool) {
        return true;
    }

    function checkTransfer(address, address, uint256) internal view returns (uint256, string memory) {
        return (0, VALID);
    }

    function preIssuanceCheck(address, uint256) public view returns (uint256 code, string memory reason) {
        code = 0;
        reason = VALID;
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
