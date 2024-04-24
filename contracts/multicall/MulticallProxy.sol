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

    function _callTarget(address target, bytes memory data) internal returns (bytes memory) {
        return Address.functionCall(target, data);
    }

    fallback() external payable {
        revert("Function not recognized");
    }

    receive() external payable {}
}
