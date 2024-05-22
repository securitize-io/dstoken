pragma solidity ^0.8.20;

//SPDX-License-Identifier: GPL-3.0
abstract contract IDSTokenReallocator {

    function initialize() public virtual;

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
