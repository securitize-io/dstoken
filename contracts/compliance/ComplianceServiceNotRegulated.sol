/**
 * Copyright 2024 Securitize Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

pragma solidity ^0.8.20;

import "./ComplianceService.sol";

/**
*   @title Concrete compliance service for tokens with no regulation
*
*   This simple compliance service is meant to be used for tokens outside of any specific regulations
*   it simply returns true for all checks.
*/

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

    function getComplianceTransferableTokens(
        address _who,
        uint256 _time,
        uint64 /*_lockTime*/
    ) public view virtual override returns (uint256) {
        require(_time > 0, "Time must be greater than zero");
        return getLockManager().getTransferableTokens(_who, _time);
    }
}
