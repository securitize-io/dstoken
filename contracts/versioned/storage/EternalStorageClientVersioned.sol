pragma solidity ^0.4.21;

import '../../zeppelin/ownership/Ownable.sol';
import './DSEternalStorageVersioned.sol';

/**
* @title EternalStorageClient
* @dev communicates with the eternal storage provider for a contract, providing convenience functions for accessing
* different types of variables
*
* NOTE: this is a AUTOMATICALLY GENERATED file, and can be OVERWRITTEN. it should not be manually edited.
*/

library EternalStorageClientBooleanLibrary {
  function getBooleanGeneric(EternalStorageClientVersioned _client, bytes encoded) view internal returns (bool) {
    return _client.eternalStorage().getBoolean(keccak256(encoded));
  }

  function setBooleanGeneric(EternalStorageClientVersioned _client, bytes encoded, bool v) internal {
    _client.eternalStorage().setBoolean(keccak256(encoded), v);
  }

  function deleteBooleanGeneric(EternalStorageClientVersioned _client, bytes encoded) internal {
    _client.eternalStorage().deleteBoolean(keccak256(encoded));
  }

  function getBoolean(EternalStorageClientVersioned _client, string p1) view public returns (bool) {
    return getBooleanGeneric(_client, abi.encodePacked(_client.namespace(),p1));
  }

  function setBoolean(EternalStorageClientVersioned _client, string p1, bool v) public {
    setBooleanGeneric(_client, abi.encodePacked(_client.namespace(),p1), v);
  }

  function deleteBoolean(EternalStorageClientVersioned _client, string p1) public {
    deleteBooleanGeneric(_client, abi.encodePacked(_client.namespace(),p1));
  }
}

library EternalStorageClientUintLibrary {
  function getUintGeneric(EternalStorageClientVersioned _client, bytes encoded) view internal returns (uint256) {
    return _client.eternalStorage().getUint(keccak256(encoded));
  }

  function setUintGeneric(EternalStorageClientVersioned _client, bytes encoded, uint256 v) internal {
    _client.eternalStorage().setUint(keccak256(encoded), v);
  }

  function deleteUintGeneric(EternalStorageClientVersioned _client, bytes encoded) internal {
    _client.eternalStorage().deleteUint(keccak256(encoded));
  }

  function getUint(EternalStorageClientVersioned _client, string p1) view public returns (uint256) {
    return getUintGeneric(_client, abi.encodePacked(_client.namespace(),p1));
  }

  function setUint(EternalStorageClientVersioned _client, string p1, uint256 v) public {
    setUintGeneric(_client, abi.encodePacked(_client.namespace(),p1), v);
  }

  function deleteUint(EternalStorageClientVersioned _client, string p1) public {
    deleteUintGeneric(_client, abi.encodePacked(_client.namespace(),p1));
  }

  function getUint(EternalStorageClientVersioned _client, string p1,string p2) view public returns (uint256) {
    return getUintGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2));
  }

  function setUint(EternalStorageClientVersioned _client, string p1,string p2, uint256 v) public {
    setUintGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2), v);
  }

  function deleteUint(EternalStorageClientVersioned _client, string p1,string p2) public {
    deleteUintGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2));
  }

  function getUint(EternalStorageClientVersioned _client, string p1,address p2) view public returns (uint256) {
    return getUintGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2));
  }

  function setUint(EternalStorageClientVersioned _client, string p1,address p2, uint256 v) public {
    setUintGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2), v);
  }

  function deleteUint(EternalStorageClientVersioned _client, string p1,address p2) public {
    deleteUintGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2));
  }

  function getUint(EternalStorageClientVersioned _client, string p1,string p2,string p3) view public returns (uint256) {
    return getUintGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3));
  }

  function setUint(EternalStorageClientVersioned _client, string p1,string p2,string p3, uint256 v) public {
    setUintGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3), v);
  }

  function deleteUint(EternalStorageClientVersioned _client, string p1,string p2,string p3) public {
    deleteUintGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3));
  }

  function getUint(EternalStorageClientVersioned _client, string p1,string p2,uint256 p3) view public returns (uint256) {
    return getUintGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3));
  }

  function setUint(EternalStorageClientVersioned _client, string p1,string p2,uint256 p3, uint256 v) public {
    setUintGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3), v);
  }

  function deleteUint(EternalStorageClientVersioned _client, string p1,string p2,uint256 p3) public {
    deleteUintGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3));
  }

  function getUint(EternalStorageClientVersioned _client, string p1,address p2,string p3) view public returns (uint256) {
    return getUintGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3));
  }

  function setUint(EternalStorageClientVersioned _client, string p1,address p2,string p3, uint256 v) public {
    setUintGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3), v);
  }

  function deleteUint(EternalStorageClientVersioned _client, string p1,address p2,string p3) public {
    deleteUintGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3));
  }

  function getUint(EternalStorageClientVersioned _client, string p1,address p2,address p3) view public returns (uint256) {
    return getUintGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3));
  }

  function setUint(EternalStorageClientVersioned _client, string p1,address p2,address p3, uint256 v) public {
    setUintGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3), v);
  }

  function deleteUint(EternalStorageClientVersioned _client, string p1,address p2,address p3) public {
    deleteUintGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3));
  }

  function getUint(EternalStorageClientVersioned _client, string p1,address p2,uint256 p3) view public returns (uint256) {
    return getUintGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3));
  }

  function setUint(EternalStorageClientVersioned _client, string p1,address p2,uint256 p3, uint256 v) public {
    setUintGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3), v);
  }

  function deleteUint(EternalStorageClientVersioned _client, string p1,address p2,uint256 p3) public {
    deleteUintGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3));
  }

  function getUint(EternalStorageClientVersioned _client, string p1,string p2,uint256 p3,string p4) view public returns (uint256) {
    return getUintGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3,p4));
  }

  function setUint(EternalStorageClientVersioned _client, string p1,string p2,uint256 p3,string p4, uint256 v) public {
    setUintGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3,p4), v);
  }

  function deleteUint(EternalStorageClientVersioned _client, string p1,string p2,uint256 p3,string p4) public {
    deleteUintGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3,p4));
  }

  function getUint8(EternalStorageClientVersioned _client, string p1,string p2,uint8 p3,string p4) view public returns (uint256) {
    return getUintGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3,p4));
  }

  function setUint8(EternalStorageClientVersioned _client, string p1,string p2,uint8 p3,string p4, uint256 v) public {
    setUintGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3,p4), v);
  }

  function deleteUint8(EternalStorageClientVersioned _client, string p1,string p2,uint8 p3,string p4) public {
    deleteUintGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3,p4));
  }

  function getUint8(EternalStorageClientVersioned _client, string p1,address p2,string p3,string p4,uint8 p5) view public returns (uint256) {
    return getUintGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3,p4,p5));
  }

  function setUint8(EternalStorageClientVersioned _client, string p1,address p2,string p3,string p4,uint8 p5, uint256 v) public {
    setUintGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3,p4,p5), v);
  }

  function deleteUint8(EternalStorageClientVersioned _client, string p1,address p2,string p3,string p4,uint8 p5) public {
    deleteUintGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3,p4,p5));
  }
}

library EternalStorageClientAddressLibrary {
  function getAddressGeneric(EternalStorageClientVersioned _client, bytes encoded) view internal returns (address) {
    return _client.eternalStorage().getAddress(keccak256(encoded));
  }

  function setAddressGeneric(EternalStorageClientVersioned _client, bytes encoded, address v) internal {
    _client.eternalStorage().setAddress(keccak256(encoded), v);
  }

  function deleteAddressGeneric(EternalStorageClientVersioned _client, bytes encoded) internal {
    _client.eternalStorage().deleteAddress(keccak256(encoded));
  }

  function getAddress(EternalStorageClientVersioned _client, string p1) view public returns (address) {
    return getAddressGeneric(_client, abi.encodePacked(_client.namespace(),p1));
  }

  function setAddress(EternalStorageClientVersioned _client, string p1, address v) public {
    setAddressGeneric(_client, abi.encodePacked(_client.namespace(),p1), v);
  }

  function deleteAddress(EternalStorageClientVersioned _client, string p1) public {
    deleteAddressGeneric(_client, abi.encodePacked(_client.namespace(),p1));
  }

  function getAddress(EternalStorageClientVersioned _client, string p1,uint256 p2) view public returns (address) {
    return getAddressGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2));
  }

  function setAddress(EternalStorageClientVersioned _client, string p1,uint256 p2, address v) public {
    setAddressGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2), v);
  }

  function deleteAddress(EternalStorageClientVersioned _client, string p1,uint256 p2) public {
    deleteAddressGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2));
  }

  function getAddress(EternalStorageClientVersioned _client, string p1,string p2,string p3) view public returns (address) {
    return getAddressGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3));
  }

  function setAddress(EternalStorageClientVersioned _client, string p1,string p2,string p3, address v) public {
    setAddressGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3), v);
  }

  function deleteAddress(EternalStorageClientVersioned _client, string p1,string p2,string p3) public {
    deleteAddressGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3));
  }

  function getAddress(EternalStorageClientVersioned _client, string p1,address p2,string p3) view public returns (address) {
    return getAddressGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3));
  }

  function setAddress(EternalStorageClientVersioned _client, string p1,address p2,string p3, address v) public {
    setAddressGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3), v);
  }

  function deleteAddress(EternalStorageClientVersioned _client, string p1,address p2,string p3) public {
    deleteAddressGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3));
  }
}

library EternalStorageClientStringLibrary {
  function getStringGeneric(EternalStorageClientVersioned _client, bytes encoded) view internal returns (string) {
    return _client.eternalStorage().getString(keccak256(encoded));
  }

  function setStringGeneric(EternalStorageClientVersioned _client, bytes encoded, string v) internal {
    _client.eternalStorage().setString(keccak256(encoded), v);
  }

  function deleteStringGeneric(EternalStorageClientVersioned _client, bytes encoded) internal {
    _client.eternalStorage().deleteString(keccak256(encoded));
  }

  function getString8(EternalStorageClientVersioned _client, string p1,uint8 p2) view public returns (string) {
    return getStringGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2));
  }

  function setString8(EternalStorageClientVersioned _client, string p1,uint8 p2, string v) public {
    setStringGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2), v);
  }

  function deleteString8(EternalStorageClientVersioned _client, string p1,uint8 p2) public {
    deleteStringGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2));
  }

  function getString(EternalStorageClientVersioned _client, string p1,string p2,string p3) view public returns (string) {
    return getStringGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3));
  }

  function setString(EternalStorageClientVersioned _client, string p1,string p2,string p3, string v) public {
    setStringGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3), v);
  }

  function deleteString(EternalStorageClientVersioned _client, string p1,string p2,string p3) public {
    deleteStringGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3));
  }

  function getString(EternalStorageClientVersioned _client, string p1,string p2,uint256 p3) view public returns (string) {
    return getStringGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3));
  }

  function setString(EternalStorageClientVersioned _client, string p1,string p2,uint256 p3, string v) public {
    setStringGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3), v);
  }

  function deleteString(EternalStorageClientVersioned _client, string p1,string p2,uint256 p3) public {
    deleteStringGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3));
  }

  function getString(EternalStorageClientVersioned _client, string p1,address p2,string p3) view public returns (string) {
    return getStringGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3));
  }

  function setString(EternalStorageClientVersioned _client, string p1,address p2,string p3, string v) public {
    setStringGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3), v);
  }

  function deleteString(EternalStorageClientVersioned _client, string p1,address p2,string p3) public {
    deleteStringGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3));
  }

  function getString(EternalStorageClientVersioned _client, string p1,address p2,uint256 p3) view public returns (string) {
    return getStringGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3));
  }

  function setString(EternalStorageClientVersioned _client, string p1,address p2,uint256 p3, string v) public {
    setStringGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3), v);
  }

  function deleteString(EternalStorageClientVersioned _client, string p1,address p2,uint256 p3) public {
    deleteStringGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3));
  }

  function getString(EternalStorageClientVersioned _client, string p1,string p2,uint256 p3,string p4) view public returns (string) {
    return getStringGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3,p4));
  }

  function setString(EternalStorageClientVersioned _client, string p1,string p2,uint256 p3,string p4, string v) public {
    setStringGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3,p4), v);
  }

  function deleteString(EternalStorageClientVersioned _client, string p1,string p2,uint256 p3,string p4) public {
    deleteStringGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3,p4));
  }

  function getString8(EternalStorageClientVersioned _client, string p1,string p2,string p3,uint8 p4) view public returns (string) {
    return getStringGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3,p4));
  }

  function setString8(EternalStorageClientVersioned _client, string p1,string p2,string p3,uint8 p4, string v) public {
    setStringGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3,p4), v);
  }

  function deleteString8(EternalStorageClientVersioned _client, string p1,string p2,string p3,uint8 p4) public {
    deleteStringGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3,p4));
  }

  function getString8(EternalStorageClientVersioned _client, string p1,string p2,uint8 p3,string p4) view public returns (string) {
    return getStringGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3,p4));
  }

  function setString8(EternalStorageClientVersioned _client, string p1,string p2,uint8 p3,string p4, string v) public {
    setStringGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3,p4), v);
  }

  function deleteString8(EternalStorageClientVersioned _client, string p1,string p2,uint8 p3,string p4) public {
    deleteStringGeneric(_client, abi.encodePacked(_client.namespace(),p1,p2,p3,p4));
  }
}


contract EternalStorageClientVersioned is Ownable, VersionedContract {
  DSEternalStorageVersioned public eternalStorage;
  string public namespace;

  constructor(address _address, string _namespace) public {
    eternalStorage = DSEternalStorageVersioned(_address);
    namespace = _namespace;
    VERSIONS.push(1);
  }

  function setStorage(address _address) onlyOwner internal {
    eternalStorage = DSEternalStorageVersioned(_address);
  }

  /* Boolean functions */

  function getBoolean(string p1) view internal returns (bool) {
    return EternalStorageClientBooleanLibrary.getBoolean(this,p1);
  }

  function setBoolean(string p1, bool v) internal {
    EternalStorageClientBooleanLibrary.setBoolean(this,p1,v);
  }

  function deleteBoolean(string p1) internal {
    EternalStorageClientBooleanLibrary.deleteBoolean(this,p1);
  }

  /* Uint functions */

  function getUint(string p1) view internal returns (uint256) {
    return EternalStorageClientUintLibrary.getUint(this,p1);
  }

  function setUint(string p1, uint256 v) internal {
    EternalStorageClientUintLibrary.setUint(this,p1,v);
  }

  function deleteUint(string p1) internal {
    EternalStorageClientUintLibrary.deleteUint(this,p1);
  }

  function getUint(string p1,string p2) view internal returns (uint256) {
    return EternalStorageClientUintLibrary.getUint(this,p1,p2);
  }

  function setUint(string p1,string p2, uint256 v) internal {
    EternalStorageClientUintLibrary.setUint(this,p1,p2,v);
  }

  function deleteUint(string p1,string p2) internal {
    EternalStorageClientUintLibrary.deleteUint(this,p1,p2);
  }

  function getUint(string p1,address p2) view internal returns (uint256) {
    return EternalStorageClientUintLibrary.getUint(this,p1,p2);
  }

  function setUint(string p1,address p2, uint256 v) internal {
    EternalStorageClientUintLibrary.setUint(this,p1,p2,v);
  }

  function deleteUint(string p1,address p2) internal {
    EternalStorageClientUintLibrary.deleteUint(this,p1,p2);
  }

  function getUint(string p1,string p2,string p3) view internal returns (uint256) {
    return EternalStorageClientUintLibrary.getUint(this,p1,p2,p3);
  }

  function setUint(string p1,string p2,string p3, uint256 v) internal {
    EternalStorageClientUintLibrary.setUint(this,p1,p2,p3,v);
  }

  function deleteUint(string p1,string p2,string p3) internal {
    EternalStorageClientUintLibrary.deleteUint(this,p1,p2,p3);
  }

  function getUint(string p1,string p2,uint256 p3) view internal returns (uint256) {
    return EternalStorageClientUintLibrary.getUint(this,p1,p2,p3);
  }

  function setUint(string p1,string p2,uint256 p3, uint256 v) internal {
    EternalStorageClientUintLibrary.setUint(this,p1,p2,p3,v);
  }

  function deleteUint(string p1,string p2,uint256 p3) internal {
    EternalStorageClientUintLibrary.deleteUint(this,p1,p2,p3);
  }

  function getUint(string p1,address p2,string p3) view internal returns (uint256) {
    return EternalStorageClientUintLibrary.getUint(this,p1,p2,p3);
  }

  function setUint(string p1,address p2,string p3, uint256 v) internal {
    EternalStorageClientUintLibrary.setUint(this,p1,p2,p3,v);
  }

  function deleteUint(string p1,address p2,string p3) internal {
    EternalStorageClientUintLibrary.deleteUint(this,p1,p2,p3);
  }

  function getUint(string p1,address p2,address p3) view internal returns (uint256) {
    return EternalStorageClientUintLibrary.getUint(this,p1,p2,p3);
  }

  function setUint(string p1,address p2,address p3, uint256 v) internal {
    EternalStorageClientUintLibrary.setUint(this,p1,p2,p3,v);
  }

  function deleteUint(string p1,address p2,address p3) internal {
    EternalStorageClientUintLibrary.deleteUint(this,p1,p2,p3);
  }

  function getUint(string p1,address p2,uint256 p3) view internal returns (uint256) {
    return EternalStorageClientUintLibrary.getUint(this,p1,p2,p3);
  }

  function setUint(string p1,address p2,uint256 p3, uint256 v) internal {
    EternalStorageClientUintLibrary.setUint(this,p1,p2,p3,v);
  }

  function deleteUint(string p1,address p2,uint256 p3) internal {
    EternalStorageClientUintLibrary.deleteUint(this,p1,p2,p3);
  }

  function getUint(string p1,string p2,uint256 p3,string p4) view internal returns (uint256) {
    return EternalStorageClientUintLibrary.getUint(this,p1,p2,p3,p4);
  }

  function setUint(string p1,string p2,uint256 p3,string p4, uint256 v) internal {
    EternalStorageClientUintLibrary.setUint(this,p1,p2,p3,p4,v);
  }

  function deleteUint(string p1,string p2,uint256 p3,string p4) internal {
    EternalStorageClientUintLibrary.deleteUint(this,p1,p2,p3,p4);
  }

  function getUint8(string p1,string p2,uint8 p3,string p4) view internal returns (uint256) {
    return EternalStorageClientUintLibrary.getUint8(this,p1,p2,p3,p4);
  }

  function setUint8(string p1,string p2,uint8 p3,string p4, uint256 v) internal {
    EternalStorageClientUintLibrary.setUint8(this,p1,p2,p3,p4,v);
  }

  function deleteUint8(string p1,string p2,uint8 p3,string p4) internal {
    EternalStorageClientUintLibrary.deleteUint8(this,p1,p2,p3,p4);
  }

  function getUint8(string p1,address p2,string p3,string p4,uint8 p5) view internal returns (uint256) {
    return EternalStorageClientUintLibrary.getUint8(this,p1,p2,p3,p4,p5);
  }

  function setUint8(string p1,address p2,string p3,string p4,uint8 p5, uint256 v) internal {
    EternalStorageClientUintLibrary.setUint8(this,p1,p2,p3,p4,p5,v);
  }

  function deleteUint8(string p1,address p2,string p3,string p4,uint8 p5) internal {
    EternalStorageClientUintLibrary.deleteUint8(this,p1,p2,p3,p4,p5);
  }

  /* Address functions */

  function getAddress(string p1) view internal returns (address) {
    return EternalStorageClientAddressLibrary.getAddress(this,p1);
  }

  function setAddress(string p1, address v) internal {
    EternalStorageClientAddressLibrary.setAddress(this,p1,v);
  }

  function deleteAddress(string p1) internal {
    EternalStorageClientAddressLibrary.deleteAddress(this,p1);
  }

  function getAddress(string p1,uint256 p2) view internal returns (address) {
    return EternalStorageClientAddressLibrary.getAddress(this,p1,p2);
  }

  function setAddress(string p1,uint256 p2, address v) internal {
    EternalStorageClientAddressLibrary.setAddress(this,p1,p2,v);
  }

  function deleteAddress(string p1,uint256 p2) internal {
    EternalStorageClientAddressLibrary.deleteAddress(this,p1,p2);
  }

  function getAddress(string p1,string p2,string p3) view internal returns (address) {
    return EternalStorageClientAddressLibrary.getAddress(this,p1,p2,p3);
  }

  function setAddress(string p1,string p2,string p3, address v) internal {
    EternalStorageClientAddressLibrary.setAddress(this,p1,p2,p3,v);
  }

  function deleteAddress(string p1,string p2,string p3) internal {
    EternalStorageClientAddressLibrary.deleteAddress(this,p1,p2,p3);
  }

  function getAddress(string p1,address p2,string p3) view internal returns (address) {
    return EternalStorageClientAddressLibrary.getAddress(this,p1,p2,p3);
  }

  function setAddress(string p1,address p2,string p3, address v) internal {
    EternalStorageClientAddressLibrary.setAddress(this,p1,p2,p3,v);
  }

  function deleteAddress(string p1,address p2,string p3) internal {
    EternalStorageClientAddressLibrary.deleteAddress(this,p1,p2,p3);
  }

  /* String functions */

  function getString8(string p1,uint8 p2) view internal returns (string) {
    return EternalStorageClientStringLibrary.getString8(this,p1,p2);
  }

  function setString8(string p1,uint8 p2, string v) internal {
    EternalStorageClientStringLibrary.setString8(this,p1,p2,v);
  }

  function deleteString8(string p1,uint8 p2) internal {
    EternalStorageClientStringLibrary.deleteString8(this,p1,p2);
  }

  function getString(string p1,string p2,string p3) view internal returns (string) {
    return EternalStorageClientStringLibrary.getString(this,p1,p2,p3);
  }

  function setString(string p1,string p2,string p3, string v) internal {
    EternalStorageClientStringLibrary.setString(this,p1,p2,p3,v);
  }

  function deleteString(string p1,string p2,string p3) internal {
    EternalStorageClientStringLibrary.deleteString(this,p1,p2,p3);
  }

  function getString(string p1,string p2,uint256 p3) view internal returns (string) {
    return EternalStorageClientStringLibrary.getString(this,p1,p2,p3);
  }

  function setString(string p1,string p2,uint256 p3, string v) internal {
    EternalStorageClientStringLibrary.setString(this,p1,p2,p3,v);
  }

  function deleteString(string p1,string p2,uint256 p3) internal {
    EternalStorageClientStringLibrary.deleteString(this,p1,p2,p3);
  }

  function getString(string p1,address p2,string p3) view internal returns (string) {
    return EternalStorageClientStringLibrary.getString(this,p1,p2,p3);
  }

  function setString(string p1,address p2,string p3, string v) internal {
    EternalStorageClientStringLibrary.setString(this,p1,p2,p3,v);
  }

  function deleteString(string p1,address p2,string p3) internal {
    EternalStorageClientStringLibrary.deleteString(this,p1,p2,p3);
  }

  function getString(string p1,address p2,uint256 p3) view internal returns (string) {
    return EternalStorageClientStringLibrary.getString(this,p1,p2,p3);
  }

  function setString(string p1,address p2,uint256 p3, string v) internal {
    EternalStorageClientStringLibrary.setString(this,p1,p2,p3,v);
  }

  function deleteString(string p1,address p2,uint256 p3) internal {
    EternalStorageClientStringLibrary.deleteString(this,p1,p2,p3);
  }

  function getString(string p1,string p2,uint256 p3,string p4) view internal returns (string) {
    return EternalStorageClientStringLibrary.getString(this,p1,p2,p3,p4);
  }

  function setString(string p1,string p2,uint256 p3,string p4, string v) internal {
    EternalStorageClientStringLibrary.setString(this,p1,p2,p3,p4,v);
  }

  function deleteString(string p1,string p2,uint256 p3,string p4) internal {
    EternalStorageClientStringLibrary.deleteString(this,p1,p2,p3,p4);
  }

  function getString8(string p1,string p2,string p3,uint8 p4) view internal returns (string) {
    return EternalStorageClientStringLibrary.getString8(this,p1,p2,p3,p4);
  }

  function setString8(string p1,string p2,string p3,uint8 p4, string v) internal {
    EternalStorageClientStringLibrary.setString8(this,p1,p2,p3,p4,v);
  }

  function deleteString8(string p1,string p2,string p3,uint8 p4) internal {
    EternalStorageClientStringLibrary.deleteString8(this,p1,p2,p3,p4);
  }

  function getString8(string p1,string p2,uint8 p3,string p4) view internal returns (string) {
    return EternalStorageClientStringLibrary.getString8(this,p1,p2,p3,p4);
  }

  function setString8(string p1,string p2,uint8 p3,string p4, string v) internal {
    EternalStorageClientStringLibrary.setString8(this,p1,p2,p3,p4,v);
  }

  function deleteString8(string p1,string p2,uint8 p3,string p4) internal {
    EternalStorageClientStringLibrary.deleteString8(this,p1,p2,p3,p4);
  }
}