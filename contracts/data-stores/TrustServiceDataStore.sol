pragma solidity ^0.5.0;

contract TrustServiceDataStore {
    address internal owner;
    mapping(address => uint8) internal roles;
}
