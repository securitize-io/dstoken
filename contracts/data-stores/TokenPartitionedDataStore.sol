pragma solidity ^0.5.0;

import "./TokenDataStore.sol";

contract TokenPartitionedDataStore is TokenDataStore {
  struct AddressPartitions {
    uint count;
    mapping(bytes32 => uint) toIndex;
    mapping(uint => bytes32) partitions;
    mapping(bytes32 => uint256) balances;
  }
  mapping(address => AddressPartitions) walletPartitions;
  mapping (string => mapping (bytes32 => uint)) investorPartitionsBalances;
}
