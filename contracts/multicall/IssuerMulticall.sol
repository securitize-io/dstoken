//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.13;
import "./MulticallProxy.sol";

contract IssuerMulticall is MulticallProxy {

    constructor() MulticallProxy() {}

    /// @dev Calls multiple functions in destination contracts, needs the required modifier to whitelist the caller
    /// @param _targets destination contract addresses array
    /// @param data Function signature and parameters array
    function multicall(address[] memory _targets, bytes[] calldata data) external payable override onlyIssuerOrTransferAgentOrAbove returns (bytes[] memory results) {
        results = new bytes[](data.length);
        for (uint256 i = 0; i < data.length; i++) {
            results[i] = _callTarget(_targets[i], data[i], i);
        }
    }
}
