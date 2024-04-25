pragma solidity ^0.8.20;

//SPDX-License-Identifier: GPL-3.0
contract TrustServiceDataStore {
    address internal owner;
    mapping(address => uint8) internal roles;
    mapping(string => address) internal entitiesOwners;
    mapping(address => string) internal ownersEntities;
    mapping(address => string) internal operatorsEntities;
    mapping(address => string) internal resourcesEntities;
}
