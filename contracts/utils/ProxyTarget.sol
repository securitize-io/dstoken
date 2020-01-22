pragma solidity ^0.5.0;

contract ProxyTarget {
    address internal ___t1;
    address internal ___t2;

    modifier onlyFromProxy() {
        require(___t1 != address(0x0), "Must be initialized from proxy");

        _;
    }
}
