pragma solidity 0.5.17;

import "../utils/VersionedContract.sol";
import "../utils/Initializable.sol";

contract IDSTokenReallocator is Initializable, VersionedContract {
    constructor() internal {}

    function initialize() public {
        VERSIONS.push(3);
    }

    function reallocateTokens(
        string memory _id,
        address _wallet,
        string memory _collisionHash,
        string memory _country,
        uint8[] memory _attributeIds,
        uint256[] memory _attributeValues,
        uint256[] memory _attributeExpirations,
        uint256 _value, /*onlyOwner*/
        bool isAffiliate
    ) public returns (bool);
}
