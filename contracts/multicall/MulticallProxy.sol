//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.13;

import "../utils/Ownable.sol";
import "../service/ServiceConsumer.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./IMulticallProxy.sol";

contract MulticallProxy is IMulticallProxy, ServiceConsumer, Ownable {
    using Address for address;

    constructor(uint8 _role) Ownable() ServiceConsumer() {
        initialize(); //TODO pq no usan directamente OZ Ownable?
        role = _role;
    }

    function initialize() public initializer {
        owner = msg.sender;
    }

    function taMulticall(address[] memory _targets, bytes[] calldata data) external payable onlyTransferAgentOrAbove returns (bytes[] memory results) {
        results = new bytes[](data.length);
        for (uint256 i = 0; i < data.length; i++) {
            results[i] = _callTarget(_targets[i], data[i]);
        }
    }

    function isMulticall(address[] memory _targets, bytes[] calldata data) external payable onlyIssuerOrAbove returns (bytes[] memory results) {
        return _callTargets(_targets, _data);
    }

    function _callTarget(address target, bytes memory data) internal returns (bytes memory) {
        results = new bytes[](data.length);
        for (uint256 i = 0; i < data.length; i++) {
            results[i] = _callTarget(_targets[i], data[i]);
        }
        bytes memory result = Address.functionCall(target, data);
        return result;
    }

    fallback() external payable {
        revert("Function not recognized");
    }

    receive() external payable {}
}
