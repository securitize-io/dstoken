pragma solidity ^0.5.0;

import "../service/IDSServiceConsumer.sol";

contract IDSWalletRegistrar is IDSServiceConsumer {
    constructor() internal {
        VERSIONS.push(1);
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
