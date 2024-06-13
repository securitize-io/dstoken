pragma solidity ^0.8.20;

import "./ServiceConsumerDataStore.sol";

//SPDX-License-Identifier: GPL-3.0
contract PartitionsManagerDataStore is ServiceConsumerDataStore {
    struct Partition {
    	uint256 issuanceDate;
    	uint256 region;
    }
    mapping(bytes32 => Partition) internal partitions;

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[49] private __gap;
}
