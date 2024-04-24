//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.13;

import "../utils/Initializable.sol";
import "../utils/Ownable.sol";
import "../service/IDSServiceConsumer.sol";
import "@openzeppelin/contracts/utils/Address.sol";


abstract contract IMulticallProxy is IDSServiceConsumer, Initializable,Ownable {

    uint 8 role;

    constructor(uint8 _role){}

    function multicall(
        address[] memory _targets,
        bytes[] calldata data
    ) external payable returns (bytes[] memory results);

    function _callTarget(
        address target,
        bytes memory data
    ) internal returns (bytes memory);

}

