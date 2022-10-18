pragma solidity ^0.8.13;

import "../service/IDSServiceConsumer.sol";
import "../utils/Initializable.sol";

//SPDX-License-Identifier: UNLICENSED
abstract contract IDSPartitionsManager is Initializable, IDSServiceConsumer {
    constructor() internal {}

    function initialize() public virtual {
        VERSIONS.push(2);
    }

    function ensurePartition(
        uint256 _issuanceDate,
        uint256 _region /*onlyIssuerOrAboveOrToken*/
    ) public returns (bytes32 partition);

    function getPartition(bytes32 _partition) public view returns (uint256 date, uint256 region);

    function getPartitionIssuanceDate(bytes32 _partition) public view returns (uint256);

    function getPartitionRegion(bytes32 _partition) public view returns (uint256);

    event PartitionCreated(uint256 _date, uint256 _region, bytes32 _partition);
}
