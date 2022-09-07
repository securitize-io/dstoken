pragma solidity ^0.8.13;

import "./IDSComplianceService.sol";

//SPDX-License-Identifier: UNLICENSED
contract IDSComplianceServicePartitioned is IDSComplianceService {
    constructor() internal {}

    function initialize() public {
        VERSIONS.push(2);
    }

    function getComplianceTransferableTokens(
        address _who,
        uint256 _time,
        bool _checkFlowback
    ) public view returns (uint256 transferable);

    function getComplianceTransferableTokens(
        address _who,
        uint256 _time,
        bool _checkFlowback,
        bytes32 _partition
    ) public view returns (uint256);

    function getComplianceTransferableTokens(
        address _who,
        uint256 _time,
        address _to
    ) public view returns (uint256 transferable);

    function getComplianceTransferableTokens(
        address _who,
        uint256 _time,
        address _to,
        bytes32 _partition
    ) public view returns (uint256);
}
