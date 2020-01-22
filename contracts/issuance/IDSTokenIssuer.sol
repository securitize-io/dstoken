pragma solidity ^0.5.0;

import "../service/IDSServiceConsumer.sol";

contract IDSTokenIssuer is IDSServiceConsumer {
    constructor() internal {
        VERSIONS.push(1);
    }

    function issueTokens(
        string memory _id,
        address _to,
        uint256[] memory _issuanceValues,
        string memory _reason,
        uint256[] memory _locksValues,
        uint64[] memory _releaseTimes,
        string memory _collisionHash,
        string memory _country,
        uint256[] memory attributeValues,
        uint256[] memory attributeExpirations /*onlyIssuerOrAbove*/
    ) public returns (bool);
}
