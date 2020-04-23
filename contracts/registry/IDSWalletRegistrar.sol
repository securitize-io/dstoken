pragma solidity ^0.5.0;

import "../utils/VersionedContract.sol";
import "../utils/Initializable.sol";


contract IDSWalletRegistrar is Initializable, VersionedContract {
    constructor() internal {}

    function initialize() public {
        VERSIONS.push(2);
    }

    function registerWallet(
        string memory _id,
        address[] memory _wallets,
        string memory _collisionHash,
        string memory _country,
        uint8[] memory _attributeIds,
        uint256[] memory _attributeValues,
        uint256[] memory _attributeExpirations /*onlyOwner*/
    ) public returns (bool);
}
