pragma solidity ^0.8.20;

//SPDX-License-Identifier: UNLICENSED
abstract contract IDSPartitionsManager {

    event PartitionCreated(uint256 _date, uint256 _region, bytes32 _partition);

    function initialize() public virtual;

    function ensurePartition(
        uint256 _issuanceDate,
        uint256 _region /*onlyIssuerOrAboveOrToken*/
    ) public virtual returns (bytes32 partition);

    function getPartition(bytes32 _partition) public view virtual returns (uint256 date, uint256 region);

    function getPartitionIssuanceDate(bytes32 _partition) public view virtual returns (uint256);

    function getPartitionRegion(bytes32 _partition) public view virtual returns (uint256);
}
