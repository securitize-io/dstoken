pragma solidity ^0.8.20;

import "./ServiceConsumerDataStore.sol";

//SPDX-License-Identifier: UNLICENSED
contract PartitionsManagerDataStore is ServiceConsumerDataStore {
    struct Partition {
    	uint256 issuanceDate;
    	uint256 region;
    }
    mapping(bytes32 => Partition) internal partitions;
}
