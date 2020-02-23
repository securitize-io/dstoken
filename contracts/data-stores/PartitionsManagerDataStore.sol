pragma solidity ^0.5.0;

import "./ServiceConsumerDataStore.sol";

contract PartitionsManagerDataStore is ServiceConsumerDataStore {
    struct PartitionData {
    	uint256 issuanceDate;
    	uint256 region;
    }
    // Map from bytes32 representation to PartitionData struct
    mapping(bytes32 => PartitionData) internal partitions;
}
