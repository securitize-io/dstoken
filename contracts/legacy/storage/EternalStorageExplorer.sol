pragma solidity ^0.4.21;

import '../../zeppelin/ownership/Ownable.sol';
import './DSEternalStorage.sol';

/**
* @title EternalStorageClient
* @dev communicates with the eternal storage provider for a contract, providing convenience functions for accessing
* different types of variables
*
* NOTE: this is a AUTOMATICALLY GENERATED file, and can be OVERWRITTEN. it should not be manually edited.
*/


contract EternalStorageExplorer is Ownable {
  /* Boolean functions */

  function getBooleanGeneric(DSEternalStorage eternalStorage, bytes encoded) view public returns (bool) {
    return eternalStorage.getBoolean(keccak256(encoded));
  }

  function setBooleanGeneric(DSEternalStorage eternalStorage, bytes encoded, bool v) onlyOwner public {
    eternalStorage.setBoolean(keccak256(encoded), v);
  }

  function deleteBooleanGeneric(DSEternalStorage eternalStorage, bytes encoded) onlyOwner public {
    eternalStorage.deleteBoolean(keccak256(encoded));
  }

  /* Uint functions */

  function getUintGeneric(DSEternalStorage eternalStorage, bytes encoded) view public returns (uint256) {
    return eternalStorage.getUint(keccak256(encoded));
  }

  function setUintGeneric(DSEternalStorage eternalStorage, bytes encoded, uint256 v) onlyOwner public {
    eternalStorage.setUint(keccak256(encoded), v);
  }

  function deleteUintGeneric(DSEternalStorage eternalStorage, bytes encoded) onlyOwner public {
    eternalStorage.deleteUint(keccak256(encoded));
  }

  /* Int functions */

  function getIntGeneric(DSEternalStorage eternalStorage, bytes encoded) view public returns (int) {
    return eternalStorage.getInt(keccak256(encoded));
  }

  function setIntGeneric(DSEternalStorage eternalStorage, bytes encoded, int v) onlyOwner public {
    eternalStorage.setInt(keccak256(encoded), v);
  }

  function deleteIntGeneric(DSEternalStorage eternalStorage, bytes encoded) onlyOwner public {
    eternalStorage.deleteInt(keccak256(encoded));
  }

  /* Address functions */

  function getAddressGeneric(DSEternalStorage eternalStorage, bytes encoded) view public returns (address) {
    return eternalStorage.getAddress(keccak256(encoded));
  }

  function setAddressGeneric(DSEternalStorage eternalStorage, bytes encoded, address v) onlyOwner public {
    eternalStorage.setAddress(keccak256(encoded), v);
  }

  function deleteAddressGeneric(DSEternalStorage eternalStorage, bytes encoded) onlyOwner public {
    eternalStorage.deleteAddress(keccak256(encoded));
  }

  /* String functions */

  function getStringGeneric(DSEternalStorage eternalStorage, bytes encoded) view public returns (string) {
    return eternalStorage.getString(keccak256(encoded));
  }

  function setStringGeneric(DSEternalStorage eternalStorage, bytes encoded, string v) onlyOwner public {
    eternalStorage.setString(keccak256(encoded), v);
  }

  function deleteStringGeneric(DSEternalStorage eternalStorage, bytes encoded) onlyOwner public {
    eternalStorage.deleteString(keccak256(encoded));
  }

  /* Bytes functions */

  function getBytesGeneric(DSEternalStorage eternalStorage, bytes encoded) view public returns (bytes) {
    return eternalStorage.getBytes(keccak256(encoded));
  }

  function setBytesGeneric(DSEternalStorage eternalStorage, bytes encoded, bytes v) public {
    eternalStorage.setBytes(keccak256(encoded), v);
  }

  function deleteBytesGeneric(DSEternalStorage eternalStorage, bytes encoded) public {
    eternalStorage.deleteBytes(keccak256(encoded));
  }
}