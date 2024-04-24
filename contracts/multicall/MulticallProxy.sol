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
    //TODO refactorizar a cada Proxy independiente
    function exMulticall(address[] memory _targets, bytes[] calldata data) external payable onlyExchangeOrAbove returns (bytes[] memory results) {
        return _callTargets(_targets, _data);
    }

    function taMulticall(address[] memory _targets, bytes[] calldata data) external payable onlyTransferAgentOrAbove returns (bytes[] memory results) {
        return _callTargets(_targets, _data);
    }

    function isMulticall(address[] memory _targets, bytes[] calldata _data) external payable onlyIssuerOrAbove returns (bytes[] memory results) {
        return _callTargets(_targets, _data);
    }

    function _callTarget(address[] memory _targets, bytes[] memory data) internal returns (bytes memory) {
        results = new bytes[](data.length);
        for (uint256 i = 0; i < data.length; i++) {
            results[i] = _callTarget(_targets[i], data[i]);
        }
        return result;
    }

    fallback() external payable {
        revert("Function not recognized");
    }

    receive() external payable {}
}
