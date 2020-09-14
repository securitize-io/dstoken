pragma solidity 0.5.17;

import "./ServiceConsumerDataStore.sol";

contract PartitionsManagerDataStore is ServiceConsumerDataStore {
    struct Partition {
    	uint256 issuanceDate;
    	uint256 region;
    }
    mapping(bytes32 => Partition) internal partitions;
}
