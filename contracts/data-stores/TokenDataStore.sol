pragma solidity ^0.5.0;

import "./ServiceConsumerDataStore.sol";
import '../utils/TokenPartitionsLibrary.sol';
import '../token/TokenLibrary.sol';

contract TokenDataStore is ServiceConsumerDataStore {
    using TokenPartitionsLibrary for TokenPartitionsLibrary.TokenPartitions;
    using TokenLibrary for TokenLibrary.SupportedFeatures;

    TokenLibrary.TokenData internal tokenData;
    mapping(address => mapping(address => uint256)) internal allowances;
    mapping(uint256 => address) internal walletsList;
    uint256 internal walletsCount;
    mapping(address => uint256) internal walletsToIndexes;
    TokenPartitionsLibrary.TokenPartitions internal partitionsManagement;
    uint256 public cap;
    string public name;
    string public symbol;
    uint8 public decimals;
    TokenLibrary.SupportedFeatures public supportedFeatures;
    bool internal paused;

}
