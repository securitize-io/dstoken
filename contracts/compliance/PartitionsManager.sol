pragma solidity ^0.8.20;


import "../service/ServiceConsumer.sol";
import "./IDSPartitionsManager.sol";
import "../data-stores/PartitionsManagerDataStore.sol";
import "../utils/ProxyTarget.sol";

//SPDX-License-Identifier: UNLICENSED
contract PartitionsManager is ProxyTarget, Initializable,  IDSPartitionsManager, ServiceConsumer, PartitionsManagerDataStore {

  function initialize() public override(IDSPartitionsManager, ServiceConsumer) initializer forceInitializeFromProxy {
    IDSPartitionsManager.initialize();
    ServiceConsumer.initialize();
    VERSIONS.push(2);
  }


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
