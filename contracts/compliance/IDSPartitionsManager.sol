pragma solidity ^0.8.20;

import "../service/IDSServiceConsumer.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

//SPDX-License-Identifier: UNLICENSED
abstract contract IDSPartitionsManager is Initializable, IDSServiceConsumer {

    event PartitionCreated(uint256 _date, uint256 _region, bytes32 _partition);

    function initialize() public virtual override {
        VERSIONS.push(2);
    }

    function ensurePartition(
        uint256 _issuanceDate,
        uint256 _region /*onlyIssuerOrAboveOrToken*/
    ) public virtual returns (bytes32 partition);

    function getPartition(bytes32 _partition) public view virtual returns (uint256 date, uint256 region);

    function getPartitionIssuanceDate(bytes32 _partition) public view virtual returns (uint256);

    function getPartitionRegion(bytes32 _partition) public view virtual returns (uint256);
}
