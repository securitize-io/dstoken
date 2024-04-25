pragma solidity ^0.8.20;

//SPDX-License-Identifier: GPL-3.0
contract ProxyTarget {
    address internal ___t1;
    address internal ___t2;

    modifier forceInitializeFromProxy() {
        require(___t1 != address(0x0), "Must be initialized from proxy");

        _;
    }
}
