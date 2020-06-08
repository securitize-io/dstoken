pragma solidity 0.5.17;

contract ProxyTarget {
    address internal ___t1;
    address internal ___t2;

    modifier forceInitializeFromProxy() {
        require(___t1 != address(0x0), "Must be initialized from proxy");

        _;
    }
}
