//SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;
import "./MulticallProxy.sol";
import "../utils/BaseDSContract.sol";

contract IssuerMulticall is MulticallProxy, BaseDSContract {

    function initialize() public override onlyProxy initializer {
        __BaseDSContract_init();
    }

    function multicall(address[] memory _targets, bytes[] calldata data) external override onlyIssuerOrAbove returns (bytes[] memory results) {
        results = new bytes[](data.length);
        for (uint256 i = 0; i < data.length; i++) {
            results[i] = _callTarget(_targets[i], data[i], i);
        }
    }
}
