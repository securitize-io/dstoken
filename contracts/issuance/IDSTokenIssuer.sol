pragma solidity ^0.8.20;

import "../utils/VersionedContract.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

//SPDX-License-Identifier: GPL-3.0
abstract contract IDSTokenIssuer is Initializable, VersionedContract {

    function initialize() public virtual {
        VERSIONS.push(4);
    }

    //Same values as IDSRegistryService
    uint8 public constant KYC_APPROVED = 1;
    uint8 public constant ACCREDITED = 2;
    uint8 public constant QUALIFIED = 4;


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
    ) public virtual returns (bool);
}
