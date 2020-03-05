pragma solidity ^0.5.0;

contract TrustServiceDataStore {
    address internal owner;
    mapping(address => uint8) internal roles;
    mapping(string => bool) internal entities;
    mapping(address => string) internal ownersEntities;
    mapping(address => string) internal operatorsEntities;
    mapping(address => string) internal resourcesEntities;
}
