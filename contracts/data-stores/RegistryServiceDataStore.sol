pragma solidity ^0.8.20;

import "./ServiceConsumerDataStore.sol";
import "../omnibus/IDSOmnibusWalletController.sol";

//SPDX-License-Identifier: UNLICENSED
contract RegistryServiceDataStore is ServiceConsumerDataStore {
    struct Attribute {
        uint256 value;
        uint256 expiry;
        string proofHash;
    }

    struct Wallet {
        string owner;
        address creator;
        address lastUpdatedBy;
    }

    struct Investor {
        string id;
        string collisionHash;
        address creator;
        address lastUpdatedBy;
        string country;
        uint256 walletCount;
        // Mappings outside Storage
        // Ref: https://docs.soliditylang.org/en/v0.7.1/070-breaking-changes.html#mappings-outside-storage
        // mapping(uint8 => Attribute) attributes;
    }

    mapping(string => Investor) internal investors;
    mapping(address => Wallet) internal investorsWallets;
    mapping(address => IDSOmnibusWalletController) internal omnibusWalletsControllers;
    mapping(string => mapping(uint8 => Attribute)) public attributes;
}
