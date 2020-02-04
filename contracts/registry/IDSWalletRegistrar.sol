pragma solidity ^0.5.0;

import "../utils/VersionedContract.sol";
import "../utils/Initializable.sol";

contract IDSWalletRegistrar is Initializable, VersionedContract {
    constructor() internal {}

    function initialize() public isNotInitialized {
        VERSIONS.push(2);
    }

    function registerWallet(
        string memory _id,
        address _wallet,
        string memory _collisionHash,
        string memory _country,
        uint256[] memory _attributeValues,
        uint256[] memory _attributeExpirations /*onlyOwner*/
    ) public returns (bool);
}
