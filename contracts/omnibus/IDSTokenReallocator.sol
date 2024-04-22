pragma solidity ^0.8.20;

import "../utils/VersionedContract.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

//SPDX-License-Identifier: UNLICENSED
abstract contract IDSTokenReallocator is Initializable, VersionedContract {

    function initialize() public virtual {
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
    ) public virtual returns (bool);
}
