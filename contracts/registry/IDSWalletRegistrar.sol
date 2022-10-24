pragma solidity ^0.8.13;

import "../utils/VersionedContract.sol";
import "../utils/Initializable.sol";

//SPDX-License-Identifier: UNLICENSED
abstract contract IDSWalletRegistrar is Initializable, VersionedContract {
    constructor() internal {}

    function initialize() public virtual {
        VERSIONS.push(3);
    }

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
