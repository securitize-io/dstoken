pragma solidity ^0.5.0;

import "./ServiceConsumerDataStore.sol";

contract TokenDataStore is ServiceConsumerDataStore {
    mapping(address => uint256) internal walletsBalances;
    mapping(string => uint256) internal investorsBalances;
    mapping(address => mapping(address => uint256)) internal allowances;
    mapping(uint256 => address) internal walletsList;
    uint256 internal walletsCount;
    mapping(address => uint256) internal walletsToIndexes;
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public supportedFeatures;
    bool internal paused;
    uint256 public cap;
    uint256 public totalSupply;
    uint256 public totalIssued;
}
