pragma solidity ^0.8.20;

//SPDX-License-Identifier: GPL-3.0
contract TrustServiceDataStore {
    address internal owner;
    mapping(address => uint8) internal roles;
    mapping(string => address) internal entitiesOwners;
    mapping(address => string) internal ownersEntities;
    mapping(address => string) internal operatorsEntities;
    mapping(address => string) internal resourcesEntities;

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[44] private __gap;
}
