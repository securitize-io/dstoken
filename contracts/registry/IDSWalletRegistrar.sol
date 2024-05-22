pragma solidity ^0.8.20;

//SPDX-License-Identifier: GPL-3.0
abstract contract IDSWalletRegistrar {

    function initialize() public virtual;

    function registerWallet(
        string memory _id,
        address[] memory _wallets,
        string memory _collisionHash,
        string memory _country,
        uint8[] memory _attributeIds,
        uint256[] memory _attributeValues,
        uint256[] memory _attributeExpirations /*onlyOwner*/
    ) public virtual returns (bool);
}
