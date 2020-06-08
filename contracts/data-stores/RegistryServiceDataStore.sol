pragma solidity 0.5.17;

import "./ServiceConsumerDataStore.sol";
import "../omnibus/IDSOmnibusWalletController.sol";

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
        mapping(uint8 => Attribute) attributes;
    }

    mapping(string => Investor) internal investors;
    mapping(address => Wallet) internal investorsWallets;
    mapping(address => IDSOmnibusWalletController) internal omnibusWalletsControllers;
}
