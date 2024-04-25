pragma solidity ^0.8.20;

import "../service/ServiceConsumer.sol";
import "./IDSPartitionsManager.sol";
import "../data-stores/PartitionsManagerDataStore.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

//SPDX-License-Identifier: GPL-3.0
contract PartitionsManager is IDSPartitionsManager, ServiceConsumer, PartitionsManagerDataStore, UUPSUpgradeable {

    function initialize() public override onlyProxy initializer {
        __ServiceConsumer_init();
    }

    /**
     * @dev required by the OZ UUPS module
     */
    function _authorizeUpgrade(address) internal override onlyMaster {}

    function ensurePartition(uint256 _issuanceDate, uint256 _region) public override onlyIssuerOrAboveOrToken returns (bytes32 partition) {
        partition = keccak256(abi.encodePacked(_issuanceDate, _region));

        if (getPartitionIssuanceDate(partition) == 0) {
            partitions[partition] = Partition(_issuanceDate, _region);
            emit PartitionCreated(_issuanceDate, _region, partition);
        }
    }

    function getPartition(bytes32 _partition) public view override returns (uint256 issuancedate, uint256 region) {
        return (partitions[_partition].issuanceDate, partitions[_partition].region);
    }

    function getPartitionIssuanceDate(bytes32 _partition) public view override returns (uint256) {
        return partitions[_partition].issuanceDate;
    }

    function getPartitionRegion(bytes32 _partition) public view override returns (uint256) {
        return partitions[_partition].region;
    }

}
