pragma solidity ^0.5.0;

import "../utils/VersionedContract.sol";
import "../utils/Initializable.sol";

contract IDSTokenIssuer is Initializable, VersionedContract {
    constructor() internal {}

    function initialize() public {
        VERSIONS.push(2);
    }

    function issueTokens(
        string memory _id,
        address _to,
        uint256[] memory _issuanceValues,
        string memory _reason,
        uint256[] memory _locksValues,
        uint64[] memory _lockReleaseTimes,
        string memory _collisionHash,
        string memory _country,
        uint256[] memory attributeValues,
        uint256[] memory attributeExpirations /*onlyIssuerOrAbove*/
    ) public returns (bool);
}
