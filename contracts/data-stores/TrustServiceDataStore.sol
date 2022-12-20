pragma solidity ^0.8.13;

//SPDX-License-Identifier: UNLICENSED
contract TrustServiceDataStore {
    address internal owner;
    mapping(address => uint8) internal roles;
    mapping(string => address) internal entitiesOwners;
    mapping(address => string) internal ownersEntities;
    mapping(address => string) internal operatorsEntities;
    mapping(address => string) internal resourcesEntities;
}
