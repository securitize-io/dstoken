//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.13;
import "./MulticallProxy.sol";

contract TransferAgentMulticall is MulticallProxy {
 
    constructor() MulticallProxy(ROLE_TRANSFER_AGENT) {}

    function multicall(address[] memory _targets, bytes[] calldata data) external payable onlyTransferAgentOrAbove returns (bytes[] memory results) {
        results = new bytes[](data.length);
        for (uint256 i = 0; i < data.length; i++) {
            results[i] = _callTarget(_targets[i], data[i]);
        }
    }
}
