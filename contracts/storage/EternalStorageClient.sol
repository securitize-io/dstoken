pragma solidity ^0.4.21;

import '../ownership/Ownable.sol';
import './EternalStorage.sol';

contract EternalStorageClient is Ownable {
  EternalStorage public eternalStorage;
  string public namespace;

  constructor(address _address, string _namespace) public {
    eternalStorage = EternalStorage(_address);
    namespace = _namespace;
  }

  function setStorage(address _address) onlyOwner internal {
    eternalStorage = EternalStorage(_address);
  }

  function setBoolean(bytes32 h, bool v) internal {
    eternalStorage.setBoolean(keccak256(namespace, h), v);
  }

  function setInt(bytes32 h, int v) internal {
    eternalStorage.setInt(keccak256(namespace, h), v);
  }

  function setUint(bytes32 h, uint256 v) internal {
    eternalStorage.setUint(keccak256(namespace, h), v);
  }

  function setAddress(bytes32 h, address v) internal {
    eternalStorage.setAddress(keccak256(namespace, h), v);
  }

  function setString(bytes32 h, string v) internal {
    eternalStorage.setString(keccak256(namespace, h), v);
  }

  function setBytes(bytes32 h, bytes v) internal {
    eternalStorage.setBytes(keccak256(namespace, h), v);
  }

  function getBoolean(bytes32 h) view internal returns (bool) {
    return eternalStorage.getBoolean(keccak256(namespace, h));
  }

  function getInt(bytes32 h) view internal returns (int) {
    return eternalStorage.getInt(keccak256(namespace, h));
  }

  function getUint(bytes32 h) view internal returns (uint256) {
    return eternalStorage.getUint(keccak256(namespace, h));
  }

  function getAddress(bytes32 h) view internal returns (address) {
    return eternalStorage.getAddress(keccak256(namespace, h));
  }

  function getString(bytes32 h) view internal returns (string) {
    return eternalStorage.getString(keccak256(namespace, h));
  }

  function getBytes(bytes32 h) view internal returns (bytes) {
    return eternalStorage.getBytes(keccak256(namespace, h));
  }
}