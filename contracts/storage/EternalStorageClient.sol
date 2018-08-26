pragma solidity ^0.4.21;

import '../zeppelin/ownership/Ownable.sol';
import './DSEternalStorage.sol';

/**
* @title EternalStorageClient
* @dev communicates with the eternal storage provider for a contract, providing convenience functions for accessing
* different types of variables
*
* NOTE: this is a AUTOMATICALLY GENERATED file, and can be OVERWRITTEN. it should not be manually edited.
*/


contract EternalStorageClient is Ownable {
  DSEternalStorage public eternalStorage;
  string public namespace;

  constructor(address _address, string _namespace) public {
    eternalStorage = DSEternalStorage(_address);
    namespace = _namespace;
  }

  function setStorage(address _address) onlyOwner internal {
    eternalStorage = DSEternalStorage(_address);
  }

  /* Boolean functions */

  function getBooleanGeneric(bytes encoded) view internal returns (bool) {
    return eternalStorage.getBoolean(keccak256(encoded));
  }

  function setBooleanGeneric(bytes encoded, bool v) internal {
    eternalStorage.setBoolean(keccak256(encoded), v);
  }

  function deleteBooleanGeneric(bytes encoded) internal {
    eternalStorage.deleteBoolean(keccak256(encoded));
  }

  function getBoolean(string p1) view internal returns (bool) {
    return getBooleanGeneric(abi.encodePacked("S:",namespace,p1));
  }

  function setBoolean(string p1, bool v) internal {
    setBooleanGeneric(abi.encodePacked("S:",namespace,p1), v);
  }

  function deleteBoolean(string p1) internal {
    deleteBooleanGeneric(abi.encodePacked("S:",namespace,p1));
  }

  /* Uint functions */

  function getUintGeneric(bytes encoded) view internal returns (uint256) {
    return eternalStorage.getUint(keccak256(encoded));
  }

  function setUintGeneric(bytes encoded, uint256 v) internal {
    eternalStorage.setUint(keccak256(encoded), v);
  }

  function deleteUintGeneric(bytes encoded) internal {
    eternalStorage.deleteUint(keccak256(encoded));
  }

  function getUint(string p1) view internal returns (uint256) {
    return getUintGeneric(abi.encodePacked("S:",namespace,p1));
  }

  function setUint(string p1, uint256 v) internal {
    setUintGeneric(abi.encodePacked("S:",namespace,p1), v);
  }

  function deleteUint(string p1) internal {
    deleteUintGeneric(abi.encodePacked("S:",namespace,p1));
  }

  function getUint(string p1,string p2) view internal returns (uint256) {
    return getUintGeneric(abi.encodePacked("SS:",namespace,p1,p2));
  }

  function setUint(string p1,string p2, uint256 v) internal {
    setUintGeneric(abi.encodePacked("SS:",namespace,p1,p2), v);
  }

  function deleteUint(string p1,string p2) internal {
    deleteUintGeneric(abi.encodePacked("SS:",namespace,p1,p2));
  }

  function getUint(string p1,address p2) view internal returns (uint256) {
    return getUintGeneric(abi.encodePacked("SA:",namespace,p1,p2));
  }

  function setUint(string p1,address p2, uint256 v) internal {
    setUintGeneric(abi.encodePacked("SA:",namespace,p1,p2), v);
  }

  function deleteUint(string p1,address p2) internal {
    deleteUintGeneric(abi.encodePacked("SA:",namespace,p1,p2));
  }

  function getUint(string p1,string p2,string p3) view internal returns (uint256) {
    return getUintGeneric(abi.encodePacked("SSS:",namespace,p1,p2,p3));
  }

  function setUint(string p1,string p2,string p3, uint256 v) internal {
    setUintGeneric(abi.encodePacked("SSS:",namespace,p1,p2,p3), v);
  }

  function deleteUint(string p1,string p2,string p3) internal {
    deleteUintGeneric(abi.encodePacked("SSS:",namespace,p1,p2,p3));
  }

  function getUint(string p1,string p2,uint256 p3) view internal returns (uint256) {
    return getUintGeneric(abi.encodePacked("SSU:",namespace,p1,p2,p3));
  }

  function setUint(string p1,string p2,uint256 p3, uint256 v) internal {
    setUintGeneric(abi.encodePacked("SSU:",namespace,p1,p2,p3), v);
  }

  function deleteUint(string p1,string p2,uint256 p3) internal {
    deleteUintGeneric(abi.encodePacked("SSU:",namespace,p1,p2,p3));
  }

  function getUint(string p1,address p2,string p3) view internal returns (uint256) {
    return getUintGeneric(abi.encodePacked("SAS:",namespace,p1,p2,p3));
  }

  function setUint(string p1,address p2,string p3, uint256 v) internal {
    setUintGeneric(abi.encodePacked("SAS:",namespace,p1,p2,p3), v);
  }

  function deleteUint(string p1,address p2,string p3) internal {
    deleteUintGeneric(abi.encodePacked("SAS:",namespace,p1,p2,p3));
  }

  function getUint(string p1,address p2,address p3) view internal returns (uint256) {
    return getUintGeneric(abi.encodePacked("SAA:",namespace,p1,p2,p3));
  }

  function setUint(string p1,address p2,address p3, uint256 v) internal {
    setUintGeneric(abi.encodePacked("SAA:",namespace,p1,p2,p3), v);
  }

  function deleteUint(string p1,address p2,address p3) internal {
    deleteUintGeneric(abi.encodePacked("SAA:",namespace,p1,p2,p3));
  }

  function getUint(string p1,address p2,uint256 p3) view internal returns (uint256) {
    return getUintGeneric(abi.encodePacked("SAU:",namespace,p1,p2,p3));
  }

  function setUint(string p1,address p2,uint256 p3, uint256 v) internal {
    setUintGeneric(abi.encodePacked("SAU:",namespace,p1,p2,p3), v);
  }

  function deleteUint(string p1,address p2,uint256 p3) internal {
    deleteUintGeneric(abi.encodePacked("SAU:",namespace,p1,p2,p3));
  }

  function getUint(string p1,string p2,uint256 p3,string p4) view internal returns (uint256) {
    return getUintGeneric(abi.encodePacked("SSUS:",namespace,p1,p2,p3,p4));
  }

  function setUint(string p1,string p2,uint256 p3,string p4, uint256 v) internal {
    setUintGeneric(abi.encodePacked("SSUS:",namespace,p1,p2,p3,p4), v);
  }

  function deleteUint(string p1,string p2,uint256 p3,string p4) internal {
    deleteUintGeneric(abi.encodePacked("SSUS:",namespace,p1,p2,p3,p4));
  }

  function getUint8(string p1,string p2,uint8 p3,string p4) view internal returns (uint256) {
    return getUintGeneric(abi.encodePacked("SSS:",namespace,p1,p2,p3,p4));
  }

  function setUint8(string p1,string p2,uint8 p3,string p4, uint256 v) internal {
    setUintGeneric(abi.encodePacked("SSS:",namespace,p1,p2,p3,p4), v);
  }

  function deleteUint8(string p1,string p2,uint8 p3,string p4) internal {
    deleteUintGeneric(abi.encodePacked("SSS:",namespace,p1,p2,p3,p4));
  }

  function getUint8(string p1,address p2,string p3,string p4,uint8 p5) view internal returns (uint256) {
    return getUintGeneric(abi.encodePacked("SASS:",namespace,p1,p2,p3,p4,p5));
  }

  function setUint8(string p1,address p2,string p3,string p4,uint8 p5, uint256 v) internal {
    setUintGeneric(abi.encodePacked("SASS:",namespace,p1,p2,p3,p4,p5), v);
  }

  function deleteUint8(string p1,address p2,string p3,string p4,uint8 p5) internal {
    deleteUintGeneric(abi.encodePacked("SASS:",namespace,p1,p2,p3,p4,p5));
  }

  /* Int functions */

  function getIntGeneric(bytes encoded) view internal returns (int) {
    return eternalStorage.getInt(keccak256(encoded));
  }

  function setIntGeneric(bytes encoded, int v) internal {
    eternalStorage.setInt(keccak256(encoded), v);
  }

  function deleteIntGeneric(bytes encoded) internal {
    eternalStorage.deleteInt(keccak256(encoded));
  }

  /* Address functions */

  function getAddressGeneric(bytes encoded) view internal returns (address) {
    return eternalStorage.getAddress(keccak256(encoded));
  }

  function setAddressGeneric(bytes encoded, address v) internal {
    eternalStorage.setAddress(keccak256(encoded), v);
  }

  function deleteAddressGeneric(bytes encoded) internal {
    eternalStorage.deleteAddress(keccak256(encoded));
  }

  function getAddress(string p1) view internal returns (address) {
    return getAddressGeneric(abi.encodePacked("S:",namespace,p1));
  }

  function setAddress(string p1, address v) internal {
    setAddressGeneric(abi.encodePacked("S:",namespace,p1), v);
  }

  function deleteAddress(string p1) internal {
    deleteAddressGeneric(abi.encodePacked("S:",namespace,p1));
  }

  function getAddress(string p1,uint256 p2) view internal returns (address) {
    return getAddressGeneric(abi.encodePacked("SU:",namespace,p1,p2));
  }

  function setAddress(string p1,uint256 p2, address v) internal {
    setAddressGeneric(abi.encodePacked("SU:",namespace,p1,p2), v);
  }

  function deleteAddress(string p1,uint256 p2) internal {
    deleteAddressGeneric(abi.encodePacked("SU:",namespace,p1,p2));
  }

  function getAddress(string p1,string p2,string p3) view internal returns (address) {
    return getAddressGeneric(abi.encodePacked("SSS:",namespace,p1,p2,p3));
  }

  function setAddress(string p1,string p2,string p3, address v) internal {
    setAddressGeneric(abi.encodePacked("SSS:",namespace,p1,p2,p3), v);
  }

  function deleteAddress(string p1,string p2,string p3) internal {
    deleteAddressGeneric(abi.encodePacked("SSS:",namespace,p1,p2,p3));
  }

  function getAddress(string p1,address p2,string p3) view internal returns (address) {
    return getAddressGeneric(abi.encodePacked("SAS:",namespace,p1,p2,p3));
  }

  function setAddress(string p1,address p2,string p3, address v) internal {
    setAddressGeneric(abi.encodePacked("SAS:",namespace,p1,p2,p3), v);
  }

  function deleteAddress(string p1,address p2,string p3) internal {
    deleteAddressGeneric(abi.encodePacked("SAS:",namespace,p1,p2,p3));
  }

  /* String functions */

  function getStringGeneric(bytes encoded) view internal returns (string) {
    return eternalStorage.getString(keccak256(encoded));
  }

  function setStringGeneric(bytes encoded, string v) internal {
    eternalStorage.setString(keccak256(encoded), v);
  }

  function deleteStringGeneric(bytes encoded) internal {
    eternalStorage.deleteString(keccak256(encoded));
  }

  function getString8(string p1,uint8 p2) view internal returns (string) {
    return getStringGeneric(abi.encodePacked("S:",namespace,p1,p2));
  }

  function setString8(string p1,uint8 p2, string v) internal {
    setStringGeneric(abi.encodePacked("S:",namespace,p1,p2), v);
  }

  function deleteString8(string p1,uint8 p2) internal {
    deleteStringGeneric(abi.encodePacked("S:",namespace,p1,p2));
  }

  function getString(string p1,string p2,string p3) view internal returns (string) {
    return getStringGeneric(abi.encodePacked("SSS:",namespace,p1,p2,p3));
  }

  function setString(string p1,string p2,string p3, string v) internal {
    setStringGeneric(abi.encodePacked("SSS:",namespace,p1,p2,p3), v);
  }

  function deleteString(string p1,string p2,string p3) internal {
    deleteStringGeneric(abi.encodePacked("SSS:",namespace,p1,p2,p3));
  }

  function getString(string p1,string p2,uint256 p3) view internal returns (string) {
    return getStringGeneric(abi.encodePacked("SSU:",namespace,p1,p2,p3));
  }

  function setString(string p1,string p2,uint256 p3, string v) internal {
    setStringGeneric(abi.encodePacked("SSU:",namespace,p1,p2,p3), v);
  }

  function deleteString(string p1,string p2,uint256 p3) internal {
    deleteStringGeneric(abi.encodePacked("SSU:",namespace,p1,p2,p3));
  }

  function getString(string p1,address p2,string p3) view internal returns (string) {
    return getStringGeneric(abi.encodePacked("SAS:",namespace,p1,p2,p3));
  }

  function setString(string p1,address p2,string p3, string v) internal {
    setStringGeneric(abi.encodePacked("SAS:",namespace,p1,p2,p3), v);
  }

  function deleteString(string p1,address p2,string p3) internal {
    deleteStringGeneric(abi.encodePacked("SAS:",namespace,p1,p2,p3));
  }

  function getString(string p1,address p2,uint256 p3) view internal returns (string) {
    return getStringGeneric(abi.encodePacked("SAU:",namespace,p1,p2,p3));
  }

  function setString(string p1,address p2,uint256 p3, string v) internal {
    setStringGeneric(abi.encodePacked("SAU:",namespace,p1,p2,p3), v);
  }

  function deleteString(string p1,address p2,uint256 p3) internal {
    deleteStringGeneric(abi.encodePacked("SAU:",namespace,p1,p2,p3));
  }

  function getString(string p1,string p2,uint256 p3,string p4) view internal returns (string) {
    return getStringGeneric(abi.encodePacked("SSUS:",namespace,p1,p2,p3,p4));
  }

  function setString(string p1,string p2,uint256 p3,string p4, string v) internal {
    setStringGeneric(abi.encodePacked("SSUS:",namespace,p1,p2,p3,p4), v);
  }

  function deleteString(string p1,string p2,uint256 p3,string p4) internal {
    deleteStringGeneric(abi.encodePacked("SSUS:",namespace,p1,p2,p3,p4));
  }

  function getString8(string p1,string p2,string p3,uint8 p4) view internal returns (string) {
    return getStringGeneric(abi.encodePacked("SSS:",namespace,p1,p2,p3,p4));
  }

  function setString8(string p1,string p2,string p3,uint8 p4, string v) internal {
    setStringGeneric(abi.encodePacked("SSS:",namespace,p1,p2,p3,p4), v);
  }

  function deleteString8(string p1,string p2,string p3,uint8 p4) internal {
    deleteStringGeneric(abi.encodePacked("SSS:",namespace,p1,p2,p3,p4));
  }

  function getString8(string p1,string p2,uint8 p3,string p4) view internal returns (string) {
    return getStringGeneric(abi.encodePacked("SSS:",namespace,p1,p2,p3,p4));
  }

  function setString8(string p1,string p2,uint8 p3,string p4, string v) internal {
    setStringGeneric(abi.encodePacked("SSS:",namespace,p1,p2,p3,p4), v);
  }

  function deleteString8(string p1,string p2,uint8 p3,string p4) internal {
    deleteStringGeneric(abi.encodePacked("SSS:",namespace,p1,p2,p3,p4));
  }

  /* Bytes functions */

  function getBytesGeneric(bytes encoded) view internal returns (bytes) {
    return eternalStorage.getBytes(keccak256(encoded));
  }

  function setBytesGeneric(bytes encoded, bytes v) internal {
    eternalStorage.setBytes(keccak256(encoded), v);
  }

  function deleteBytesGeneric(bytes encoded) internal {
    eternalStorage.deleteBytes(keccak256(encoded));
  }
}