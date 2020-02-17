pragma solidity ^0.5.0;
import "./ComplianceService.sol";

/**
*   @title Concrete compliance service for tokens with no regulation
*
*   This simple compliance service is meant to be used for tokens outside of any specific regulations
*   it simply returns true for all checks.
*/

contract ComplianceServiceNotRegulated is ComplianceService {
    function initialize() public initializer onlyFromProxy {
        ComplianceService.initialize();
        VERSIONS.push(2);
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
    function recordSeize(address, address, uint256) internal returns (bool) {
        return true;
    }

    function recordOmnibusSeize(address _omnibusWallet, string _fromInvestorId, address _to, uint256 _value) internal returns (bool) {
        return true;
    }
}
