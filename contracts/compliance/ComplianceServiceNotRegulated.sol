pragma solidity ^0.8.20;

import "./ComplianceService.sol";

/**
*   @title Concrete compliance service for tokens with no regulation
*
*   This simple compliance service is meant to be used for tokens outside of any specific regulations
*   it simply returns true for all checks.
*/
//SPDX-License-Identifier: UNLICENSED
contract ComplianceServiceNotRegulated is ComplianceService {
    function initialize() public override onlyProxy initializer {
        ComplianceService.initialize();
    }

    function recordIssuance(address, uint256, uint256) internal pure override returns (bool) {
        return true;
    }

    function recordTransfer(address, address, uint256) internal pure override returns (bool) {
        return true;
    }

    function checkTransfer(address, address, uint256) internal pure override returns (uint256, string memory) {
        return (0, VALID);
    }

    function preIssuanceCheck(address, uint256) public pure override returns (uint256 code, string memory reason) {
        code = 0;
        reason = VALID;
    }

    function recordBurn(address, uint256) internal pure override returns (bool) {
        return true;
    }

    function recordSeize(address, address, uint256) internal pure override returns (bool) {
        return true;
    }
}
