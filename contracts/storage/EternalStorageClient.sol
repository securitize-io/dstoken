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

  function getBoolean(string p1) view internal returns (bool) {
    return eternalStorage.getBoolean(keccak256(abi.encodePacked(namespace, p1)));
  }

  function getBoolean(string p1,address p2) view internal returns (bool) {
    return eternalStorage.getBoolean(keccak256(abi.encodePacked(namespace, p1,p2)));
  }

  function getBoolean(string p1,uint256 p2) view internal returns (bool) {
    return eternalStorage.getBoolean(keccak256(abi.encodePacked(namespace, p1,p2)));
  }

  function getBoolean(string p1,address p2,address p3) view internal returns (bool) {
    return eternalStorage.getBoolean(keccak256(abi.encodePacked(namespace, p1,p2,p3)));
  }

  function getBoolean(string p1, address p2, string p3) view internal returns (bool) {
    return eternalStorage.getBoolean(keccak256(abi.encodePacked(namespace, p1,p2,p3)));
  }

  function getBoolean(string p1, string p2, string p3) view internal returns (bool) {
    return eternalStorage.getBoolean(keccak256(abi.encodePacked(namespace, p1, p2, p3)));
  }

  function getBoolean(string p1, string p2, uint p3, string p4) view internal returns (bool) {
    return eternalStorage.getBoolean(keccak256(abi.encodePacked(namespace, p1, p2, p3, p4)));
  }

  function getBoolean8(string p1,uint8 p2) view internal returns (bool) {
    return eternalStorage.getBoolean(keccak256(abi.encodePacked(namespace, p1,p2)));
  }

  function getBoolean8(string p1, string p2, string p3, uint8 p4) view internal returns (bool) {
    return eternalStorage.getBoolean(keccak256(abi.encodePacked(namespace, p1, p2, p3, p4)));
  }

  function getBoolean8(string p1, string p2, uint8 p3, string p4) view internal returns (bool) {
    return eternalStorage.getBoolean(keccak256(abi.encodePacked(namespace, p1, p2, p3, p4)));
  }

  function getBoolean8(string p1, address p2, string p3, string p4, uint8 p5) view internal returns (bool) {
    return eternalStorage.getBoolean(keccak256(abi.encodePacked(namespace, p1, p2, p3, p4, p5)));
  }

  function setBoolean(string p1, bool v) internal {
    eternalStorage.setBoolean(keccak256(abi.encodePacked(namespace, p1)), v);
  }

  function setBoolean(string p1,address p2, bool v) internal {
    eternalStorage.setBoolean(keccak256(abi.encodePacked(namespace, p1,p2)), v);
  }

  function setBoolean(string p1,uint256 p2, bool v) internal {
    eternalStorage.setBoolean(keccak256(abi.encodePacked(namespace, p1,p2)), v);
  }

  function setBoolean(string p1,address p2,address p3, bool v) internal {
    eternalStorage.setBoolean(keccak256(abi.encodePacked(namespace, p1,p2,p3)), v);
  }

  function setBoolean(string p1,address p2,string p3, bool v) internal {
    eternalStorage.setBoolean(keccak256(abi.encodePacked(namespace, p1,p2,p3)), v);
  }

  function setBoolean(string p1, string p2, string p3, bool v) internal {
    eternalStorage.setBoolean(keccak256(abi.encodePacked(namespace, p1,p2,p3)), v);
  }

  function setBoolean(string p1, string p2, uint p3, string p4, bool v) internal {
    eternalStorage.setBoolean(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4)), v);
  }

  function setBoolean8(string p1,uint8 p2, bool v) internal {
    eternalStorage.setBoolean(keccak256(abi.encodePacked(namespace, p1,p2)), v);
  }

  function setBoolean8(string p1, string p2, string p3, uint8 p4, bool v) internal {
    eternalStorage.setBoolean(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4)), v);
  }

  function setBoolean8(string p1, string p2, uint8 p3, string p4, bool v) internal {
    eternalStorage.setBoolean(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4)), v);
  }

  function setBoolean8(string p1, address p2, string p3, string p4, uint8 p5, bool v) internal {
    eternalStorage.setBoolean(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4,p5)), v);
  }

  function deleteBoolean(string p1) internal {
    return eternalStorage.deleteBoolean(keccak256(abi.encodePacked(namespace, p1)));
  }

  function deleteBoolean(string p1,address p2) internal {
    return eternalStorage.deleteBoolean(keccak256(abi.encodePacked(namespace, p1,p2)));
  }

  function deleteBoolean(string p1,address p2,address p3) internal {
    return eternalStorage.deleteBoolean(keccak256(abi.encodePacked(namespace, p1,p2,p3)));
  }

  function deleteBoolean(string p1,address p2,string p3) internal {
    return eternalStorage.deleteBoolean(keccak256(abi.encodePacked(namespace, p1,p2,p3)));
  }

  function deleteBoolean(string p1,string p2,string p3) internal {
    return eternalStorage.deleteBoolean(keccak256(abi.encodePacked(namespace, p1,p2,p3)));
  }

  function deleteBoolean(string p1, string p2, uint p3, string p4) internal {
    return eternalStorage.deleteBoolean(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4)));
  }

  function deleteBoolean8(string p1,uint8 p2) internal {
    return eternalStorage.deleteBoolean(keccak256(abi.encodePacked(namespace, p1,p2)));
  }

  function deleteBoolean8(string p1, string p2, string p3, uint8 p4) internal {
    return eternalStorage.deleteBoolean(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4)));
  }

  function deleteBoolean8(string p1, string p2, uint8 p3, string p4) internal {
    return eternalStorage.deleteBoolean(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4)));
  }

  function deleteBoolean8(string p1, address p2, string p3, string p4, uint8 p5) internal {
    return eternalStorage.deleteBoolean(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4,p5)));
  }


/* Uint functions */

  function getUint(string p1) view internal returns (uint256) {
    return eternalStorage.getUint(keccak256(abi.encodePacked(namespace, p1)));
  }

  function getUint(string p1,address p2) view internal returns (uint256) {
    return eternalStorage.getUint(keccak256(abi.encodePacked(namespace, p1,p2)));
  }

  function getUint(string p1,uint256 p2) view internal returns (uint256) {
    return eternalStorage.getUint(keccak256(abi.encodePacked(namespace, p1,p2)));
  }

  function getUint(string p1,address p2,address p3) view internal returns (uint256) {
    return eternalStorage.getUint(keccak256(abi.encodePacked(namespace, p1,p2,p3)));
  }

  function getUint(string p1, address p2, string p3) view internal returns (uint256) {
    return eternalStorage.getUint(keccak256(abi.encodePacked(namespace, p1,p2,p3)));
  }

  function getUint(string p1, string p2, string p3) view internal returns (uint256) {
    return eternalStorage.getUint(keccak256(abi.encodePacked(namespace, p1, p2, p3)));
  }

  function getUint(string p1, string p2, uint p3, string p4) view internal returns (uint256) {
    return eternalStorage.getUint(keccak256(abi.encodePacked(namespace, p1, p2, p3, p4)));
  }

  function getUint8(string p1,uint8 p2) view internal returns (uint256) {
    return eternalStorage.getUint(keccak256(abi.encodePacked(namespace, p1,p2)));
  }

  function getUint8(string p1, string p2, string p3, uint8 p4) view internal returns (uint256) {
    return eternalStorage.getUint(keccak256(abi.encodePacked(namespace, p1, p2, p3, p4)));
  }

  function getUint8(string p1, string p2, uint8 p3, string p4) view internal returns (uint256) {
    return eternalStorage.getUint(keccak256(abi.encodePacked(namespace, p1, p2, p3, p4)));
  }

  function getUint8(string p1, address p2, string p3, string p4, uint8 p5) view internal returns (uint256) {
    return eternalStorage.getUint(keccak256(abi.encodePacked(namespace, p1, p2, p3, p4, p5)));
  }

  function setUint(string p1, uint256 v) internal {
    eternalStorage.setUint(keccak256(abi.encodePacked(namespace, p1)), v);
  }

  function setUint(string p1,address p2, uint256 v) internal {
    eternalStorage.setUint(keccak256(abi.encodePacked(namespace, p1,p2)), v);
  }

  function setUint(string p1,uint256 p2, uint256 v) internal {
    eternalStorage.setUint(keccak256(abi.encodePacked(namespace, p1,p2)), v);
  }

  function setUint(string p1,address p2,address p3, uint256 v) internal {
    eternalStorage.setUint(keccak256(abi.encodePacked(namespace, p1,p2,p3)), v);
  }

  function setUint(string p1,address p2,string p3, uint256 v) internal {
    eternalStorage.setUint(keccak256(abi.encodePacked(namespace, p1,p2,p3)), v);
  }

  function setUint(string p1, string p2, string p3, uint256 v) internal {
    eternalStorage.setUint(keccak256(abi.encodePacked(namespace, p1,p2,p3)), v);
  }

  function setUint(string p1, string p2, uint p3, string p4, uint256 v) internal {
    eternalStorage.setUint(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4)), v);
  }

  function setUint8(string p1,uint8 p2, uint256 v) internal {
    eternalStorage.setUint(keccak256(abi.encodePacked(namespace, p1,p2)), v);
  }

  function setUint8(string p1, string p2, string p3, uint8 p4, uint256 v) internal {
    eternalStorage.setUint(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4)), v);
  }

  function setUint8(string p1, string p2, uint8 p3, string p4, uint256 v) internal {
    eternalStorage.setUint(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4)), v);
  }

  function setUint8(string p1, address p2, string p3, string p4, uint8 p5, uint256 v) internal {
    eternalStorage.setUint(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4,p5)), v);
  }

  function deleteUint(string p1) internal {
    return eternalStorage.deleteUint(keccak256(abi.encodePacked(namespace, p1)));
  }

  function deleteUint(string p1,address p2) internal {
    return eternalStorage.deleteUint(keccak256(abi.encodePacked(namespace, p1,p2)));
  }

  function deleteUint(string p1,address p2,address p3) internal {
    return eternalStorage.deleteUint(keccak256(abi.encodePacked(namespace, p1,p2,p3)));
  }

  function deleteUint(string p1,address p2,string p3) internal {
    return eternalStorage.deleteUint(keccak256(abi.encodePacked(namespace, p1,p2,p3)));
  }

  function deleteUint(string p1,string p2,string p3) internal {
    return eternalStorage.deleteUint(keccak256(abi.encodePacked(namespace, p1,p2,p3)));
  }

  function deleteUint(string p1, string p2, uint p3, string p4) internal {
    return eternalStorage.deleteUint(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4)));
  }

  function deleteUint8(string p1,uint8 p2) internal {
    return eternalStorage.deleteUint(keccak256(abi.encodePacked(namespace, p1,p2)));
  }

  function deleteUint8(string p1, string p2, string p3, uint8 p4) internal {
    return eternalStorage.deleteUint(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4)));
  }

  function deleteUint8(string p1, string p2, uint8 p3, string p4) internal {
    return eternalStorage.deleteUint(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4)));
  }

  function deleteUint8(string p1, address p2, string p3, string p4, uint8 p5) internal {
    return eternalStorage.deleteUint(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4,p5)));
  }


/* Int functions */

  function getInt(string p1) view internal returns (int) {
    return eternalStorage.getInt(keccak256(abi.encodePacked(namespace, p1)));
  }

  function getInt(string p1,address p2) view internal returns (int) {
    return eternalStorage.getInt(keccak256(abi.encodePacked(namespace, p1,p2)));
  }

  function getInt(string p1,uint256 p2) view internal returns (int) {
    return eternalStorage.getInt(keccak256(abi.encodePacked(namespace, p1,p2)));
  }

  function getInt(string p1,address p2,address p3) view internal returns (int) {
    return eternalStorage.getInt(keccak256(abi.encodePacked(namespace, p1,p2,p3)));
  }

  function getInt(string p1, address p2, string p3) view internal returns (int) {
    return eternalStorage.getInt(keccak256(abi.encodePacked(namespace, p1,p2,p3)));
  }

  function getInt(string p1, string p2, string p3) view internal returns (int) {
    return eternalStorage.getInt(keccak256(abi.encodePacked(namespace, p1, p2, p3)));
  }

  function getInt(string p1, string p2, uint p3, string p4) view internal returns (int) {
    return eternalStorage.getInt(keccak256(abi.encodePacked(namespace, p1, p2, p3, p4)));
  }

  function getInt8(string p1,uint8 p2) view internal returns (int) {
    return eternalStorage.getInt(keccak256(abi.encodePacked(namespace, p1,p2)));
  }

  function getInt8(string p1, string p2, string p3, uint8 p4) view internal returns (int) {
    return eternalStorage.getInt(keccak256(abi.encodePacked(namespace, p1, p2, p3, p4)));
  }

  function getInt8(string p1, string p2, uint8 p3, string p4) view internal returns (int) {
    return eternalStorage.getInt(keccak256(abi.encodePacked(namespace, p1, p2, p3, p4)));
  }

  function getInt8(string p1, address p2, string p3, string p4, uint8 p5) view internal returns (int) {
    return eternalStorage.getInt(keccak256(abi.encodePacked(namespace, p1, p2, p3, p4, p5)));
  }

  function setInt(string p1, int v) internal {
    eternalStorage.setInt(keccak256(abi.encodePacked(namespace, p1)), v);
  }

  function setInt(string p1,address p2, int v) internal {
    eternalStorage.setInt(keccak256(abi.encodePacked(namespace, p1,p2)), v);
  }

  function setInt(string p1,uint256 p2, int v) internal {
    eternalStorage.setInt(keccak256(abi.encodePacked(namespace, p1,p2)), v);
  }

  function setInt(string p1,address p2,address p3, int v) internal {
    eternalStorage.setInt(keccak256(abi.encodePacked(namespace, p1,p2,p3)), v);
  }

  function setInt(string p1,address p2,string p3, int v) internal {
    eternalStorage.setInt(keccak256(abi.encodePacked(namespace, p1,p2,p3)), v);
  }

  function setInt(string p1, string p2, string p3, int v) internal {
    eternalStorage.setInt(keccak256(abi.encodePacked(namespace, p1,p2,p3)), v);
  }

  function setInt(string p1, string p2, uint p3, string p4, int v) internal {
    eternalStorage.setInt(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4)), v);
  }

  function setInt8(string p1,uint8 p2, int v) internal {
    eternalStorage.setInt(keccak256(abi.encodePacked(namespace, p1,p2)), v);
  }

  function setInt8(string p1, string p2, string p3, uint8 p4, int v) internal {
    eternalStorage.setInt(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4)), v);
  }

  function setInt8(string p1, string p2, uint8 p3, string p4, int v) internal {
    eternalStorage.setInt(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4)), v);
  }

  function setInt8(string p1, address p2, string p3, string p4, uint8 p5, int v) internal {
    eternalStorage.setInt(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4,p5)), v);
  }

  function deleteInt(string p1) internal {
    return eternalStorage.deleteInt(keccak256(abi.encodePacked(namespace, p1)));
  }

  function deleteInt(string p1,address p2) internal {
    return eternalStorage.deleteInt(keccak256(abi.encodePacked(namespace, p1,p2)));
  }

  function deleteInt(string p1,address p2,address p3) internal {
    return eternalStorage.deleteInt(keccak256(abi.encodePacked(namespace, p1,p2,p3)));
  }

  function deleteInt(string p1,address p2,string p3) internal {
    return eternalStorage.deleteInt(keccak256(abi.encodePacked(namespace, p1,p2,p3)));
  }

  function deleteInt(string p1,string p2,string p3) internal {
    return eternalStorage.deleteInt(keccak256(abi.encodePacked(namespace, p1,p2,p3)));
  }

  function deleteInt(string p1, string p2, uint p3, string p4) internal {
    return eternalStorage.deleteInt(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4)));
  }

  function deleteInt8(string p1,uint8 p2) internal {
    return eternalStorage.deleteInt(keccak256(abi.encodePacked(namespace, p1,p2)));
  }

  function deleteInt8(string p1, string p2, string p3, uint8 p4) internal {
    return eternalStorage.deleteInt(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4)));
  }

  function deleteInt8(string p1, string p2, uint8 p3, string p4) internal {
    return eternalStorage.deleteInt(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4)));
  }

  function deleteInt8(string p1, address p2, string p3, string p4, uint8 p5) internal {
    return eternalStorage.deleteInt(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4,p5)));
  }


/* Address functions */

  function getAddress(string p1) view internal returns (address) {
    return eternalStorage.getAddress(keccak256(abi.encodePacked(namespace, p1)));
  }

  function getAddress(string p1,address p2) view internal returns (address) {
    return eternalStorage.getAddress(keccak256(abi.encodePacked(namespace, p1,p2)));
  }

  function getAddress(string p1,uint256 p2) view internal returns (address) {
    return eternalStorage.getAddress(keccak256(abi.encodePacked(namespace, p1,p2)));
  }

  function getAddress(string p1,address p2,address p3) view internal returns (address) {
    return eternalStorage.getAddress(keccak256(abi.encodePacked(namespace, p1,p2,p3)));
  }

  function getAddress(string p1, address p2, string p3) view internal returns (address) {
    return eternalStorage.getAddress(keccak256(abi.encodePacked(namespace, p1,p2,p3)));
  }

  function getAddress(string p1, string p2, string p3) view internal returns (address) {
    return eternalStorage.getAddress(keccak256(abi.encodePacked(namespace, p1, p2, p3)));
  }

  function getAddress(string p1, string p2, uint p3, string p4) view internal returns (address) {
    return eternalStorage.getAddress(keccak256(abi.encodePacked(namespace, p1, p2, p3, p4)));
  }

  function getAddress8(string p1,uint8 p2) view internal returns (address) {
    return eternalStorage.getAddress(keccak256(abi.encodePacked(namespace, p1,p2)));
  }

  function getAddress8(string p1, string p2, string p3, uint8 p4) view internal returns (address) {
    return eternalStorage.getAddress(keccak256(abi.encodePacked(namespace, p1, p2, p3, p4)));
  }

  function getAddress8(string p1, string p2, uint8 p3, string p4) view internal returns (address) {
    return eternalStorage.getAddress(keccak256(abi.encodePacked(namespace, p1, p2, p3, p4)));
  }

  function getAddress8(string p1, address p2, string p3, string p4, uint8 p5) view internal returns (address) {
    return eternalStorage.getAddress(keccak256(abi.encodePacked(namespace, p1, p2, p3, p4, p5)));
  }

  function setAddress(string p1, address v) internal {
    eternalStorage.setAddress(keccak256(abi.encodePacked(namespace, p1)), v);
  }

  function setAddress(string p1,address p2, address v) internal {
    eternalStorage.setAddress(keccak256(abi.encodePacked(namespace, p1,p2)), v);
  }

  function setAddress(string p1,uint256 p2, address v) internal {
    eternalStorage.setAddress(keccak256(abi.encodePacked(namespace, p1,p2)), v);
  }

  function setAddress(string p1,address p2,address p3, address v) internal {
    eternalStorage.setAddress(keccak256(abi.encodePacked(namespace, p1,p2,p3)), v);
  }

  function setAddress(string p1,address p2,string p3, address v) internal {
    eternalStorage.setAddress(keccak256(abi.encodePacked(namespace, p1,p2,p3)), v);
  }

  function setAddress(string p1, string p2, string p3, address v) internal {
    eternalStorage.setAddress(keccak256(abi.encodePacked(namespace, p1,p2,p3)), v);
  }

  function setAddress(string p1, string p2, uint p3, string p4, address v) internal {
    eternalStorage.setAddress(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4)), v);
  }

  function setAddress8(string p1,uint8 p2, address v) internal {
    eternalStorage.setAddress(keccak256(abi.encodePacked(namespace, p1,p2)), v);
  }

  function setAddress8(string p1, string p2, string p3, uint8 p4, address v) internal {
    eternalStorage.setAddress(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4)), v);
  }

  function setAddress8(string p1, string p2, uint8 p3, string p4, address v) internal {
    eternalStorage.setAddress(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4)), v);
  }

  function setAddress8(string p1, address p2, string p3, string p4, uint8 p5, address v) internal {
    eternalStorage.setAddress(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4,p5)), v);
  }

  function deleteAddress(string p1) internal {
    return eternalStorage.deleteAddress(keccak256(abi.encodePacked(namespace, p1)));
  }

  function deleteAddress(string p1,address p2) internal {
    return eternalStorage.deleteAddress(keccak256(abi.encodePacked(namespace, p1,p2)));
  }

  function deleteAddress(string p1,address p2,address p3) internal {
    return eternalStorage.deleteAddress(keccak256(abi.encodePacked(namespace, p1,p2,p3)));
  }

  function deleteAddress(string p1,address p2,string p3) internal {
    return eternalStorage.deleteAddress(keccak256(abi.encodePacked(namespace, p1,p2,p3)));
  }

  function deleteAddress(string p1,string p2,string p3) internal {
    return eternalStorage.deleteAddress(keccak256(abi.encodePacked(namespace, p1,p2,p3)));
  }

  function deleteAddress(string p1, string p2, uint p3, string p4) internal {
    return eternalStorage.deleteAddress(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4)));
  }

  function deleteAddress8(string p1,uint8 p2) internal {
    return eternalStorage.deleteAddress(keccak256(abi.encodePacked(namespace, p1,p2)));
  }

  function deleteAddress8(string p1, string p2, string p3, uint8 p4) internal {
    return eternalStorage.deleteAddress(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4)));
  }

  function deleteAddress8(string p1, string p2, uint8 p3, string p4) internal {
    return eternalStorage.deleteAddress(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4)));
  }

  function deleteAddress8(string p1, address p2, string p3, string p4, uint8 p5) internal {
    return eternalStorage.deleteAddress(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4,p5)));
  }


/* String functions */

  function getString(string p1) view internal returns (string) {
    return eternalStorage.getString(keccak256(abi.encodePacked(namespace, p1)));
  }

  function getString(string p1,address p2) view internal returns (string) {
    return eternalStorage.getString(keccak256(abi.encodePacked(namespace, p1,p2)));
  }

  function getString(string p1,uint256 p2) view internal returns (string) {
    return eternalStorage.getString(keccak256(abi.encodePacked(namespace, p1,p2)));
  }

  function getString(string p1,address p2,address p3) view internal returns (string) {
    return eternalStorage.getString(keccak256(abi.encodePacked(namespace, p1,p2,p3)));
  }

  function getString(string p1, address p2, string p3) view internal returns (string) {
    return eternalStorage.getString(keccak256(abi.encodePacked(namespace, p1,p2,p3)));
  }

  function getString(string p1, string p2, string p3) view internal returns (string) {
    return eternalStorage.getString(keccak256(abi.encodePacked(namespace, p1, p2, p3)));
  }

  function getString(string p1, string p2, uint p3, string p4) view internal returns (string) {
    return eternalStorage.getString(keccak256(abi.encodePacked(namespace, p1, p2, p3, p4)));
  }

  function getString8(string p1,uint8 p2) view internal returns (string) {
    return eternalStorage.getString(keccak256(abi.encodePacked(namespace, p1,p2)));
  }

  function getString8(string p1, string p2, string p3, uint8 p4) view internal returns (string) {
    return eternalStorage.getString(keccak256(abi.encodePacked(namespace, p1, p2, p3, p4)));
  }

  function getString8(string p1, string p2, uint8 p3, string p4) view internal returns (string) {
    return eternalStorage.getString(keccak256(abi.encodePacked(namespace, p1, p2, p3, p4)));
  }

  function getString8(string p1, address p2, string p3, string p4, uint8 p5) view internal returns (string) {
    return eternalStorage.getString(keccak256(abi.encodePacked(namespace, p1, p2, p3, p4, p5)));
  }

  function setString(string p1, string v) internal {
    eternalStorage.setString(keccak256(abi.encodePacked(namespace, p1)), v);
  }

  function setString(string p1,address p2, string v) internal {
    eternalStorage.setString(keccak256(abi.encodePacked(namespace, p1,p2)), v);
  }

  function setString(string p1,uint256 p2, string v) internal {
    eternalStorage.setString(keccak256(abi.encodePacked(namespace, p1,p2)), v);
  }

  function setString(string p1,address p2,address p3, string v) internal {
    eternalStorage.setString(keccak256(abi.encodePacked(namespace, p1,p2,p3)), v);
  }

  function setString(string p1,address p2,string p3, string v) internal {
    eternalStorage.setString(keccak256(abi.encodePacked(namespace, p1,p2,p3)), v);
  }

  function setString(string p1, string p2, string p3, string v) internal {
    eternalStorage.setString(keccak256(abi.encodePacked(namespace, p1,p2,p3)), v);
  }

  function setString(string p1, string p2, uint p3, string p4, string v) internal {
    eternalStorage.setString(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4)), v);
  }

  function setString8(string p1,uint8 p2, string v) internal {
    eternalStorage.setString(keccak256(abi.encodePacked(namespace, p1,p2)), v);
  }

  function setString8(string p1, string p2, string p3, uint8 p4, string v) internal {
    eternalStorage.setString(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4)), v);
  }

  function setString8(string p1, string p2, uint8 p3, string p4, string v) internal {
    eternalStorage.setString(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4)), v);
  }

  function setString8(string p1, address p2, string p3, string p4, uint8 p5, string v) internal {
    eternalStorage.setString(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4,p5)), v);
  }

  function deleteString(string p1) internal {
    return eternalStorage.deleteString(keccak256(abi.encodePacked(namespace, p1)));
  }

  function deleteString(string p1,address p2) internal {
    return eternalStorage.deleteString(keccak256(abi.encodePacked(namespace, p1,p2)));
  }

  function deleteString(string p1,address p2,address p3) internal {
    return eternalStorage.deleteString(keccak256(abi.encodePacked(namespace, p1,p2,p3)));
  }

  function deleteString(string p1,address p2,string p3) internal {
    return eternalStorage.deleteString(keccak256(abi.encodePacked(namespace, p1,p2,p3)));
  }

  function deleteString(string p1,string p2,string p3) internal {
    return eternalStorage.deleteString(keccak256(abi.encodePacked(namespace, p1,p2,p3)));
  }

  function deleteString(string p1, string p2, uint p3, string p4) internal {
    return eternalStorage.deleteString(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4)));
  }

  function deleteString8(string p1,uint8 p2) internal {
    return eternalStorage.deleteString(keccak256(abi.encodePacked(namespace, p1,p2)));
  }

  function deleteString8(string p1, string p2, string p3, uint8 p4) internal {
    return eternalStorage.deleteString(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4)));
  }

  function deleteString8(string p1, string p2, uint8 p3, string p4) internal {
    return eternalStorage.deleteString(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4)));
  }

  function deleteString8(string p1, address p2, string p3, string p4, uint8 p5) internal {
    return eternalStorage.deleteString(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4,p5)));
  }


/* Bytes functions */

  function getBytes(string p1) view internal returns (bytes) {
    return eternalStorage.getBytes(keccak256(abi.encodePacked(namespace, p1)));
  }

  function getBytes(string p1,address p2) view internal returns (bytes) {
    return eternalStorage.getBytes(keccak256(abi.encodePacked(namespace, p1,p2)));
  }

  function getBytes(string p1,uint256 p2) view internal returns (bytes) {
    return eternalStorage.getBytes(keccak256(abi.encodePacked(namespace, p1,p2)));
  }

  function getBytes(string p1,address p2,address p3) view internal returns (bytes) {
    return eternalStorage.getBytes(keccak256(abi.encodePacked(namespace, p1,p2,p3)));
  }

  function getBytes(string p1, address p2, string p3) view internal returns (bytes) {
    return eternalStorage.getBytes(keccak256(abi.encodePacked(namespace, p1,p2,p3)));
  }

  function getBytes(string p1, string p2, string p3) view internal returns (bytes) {
    return eternalStorage.getBytes(keccak256(abi.encodePacked(namespace, p1, p2, p3)));
  }

  function getBytes(string p1, string p2, uint p3, string p4) view internal returns (bytes) {
    return eternalStorage.getBytes(keccak256(abi.encodePacked(namespace, p1, p2, p3, p4)));
  }

  function getBytes8(string p1,uint8 p2) view internal returns (bytes) {
    return eternalStorage.getBytes(keccak256(abi.encodePacked(namespace, p1,p2)));
  }

  function getBytes8(string p1, string p2, string p3, uint8 p4) view internal returns (bytes) {
    return eternalStorage.getBytes(keccak256(abi.encodePacked(namespace, p1, p2, p3, p4)));
  }

  function getBytes8(string p1, string p2, uint8 p3, string p4) view internal returns (bytes) {
    return eternalStorage.getBytes(keccak256(abi.encodePacked(namespace, p1, p2, p3, p4)));
  }

  function getBytes8(string p1, address p2, string p3, string p4, uint8 p5) view internal returns (bytes) {
    return eternalStorage.getBytes(keccak256(abi.encodePacked(namespace, p1, p2, p3, p4, p5)));
  }

  function setBytes(string p1, bytes v) internal {
    eternalStorage.setBytes(keccak256(abi.encodePacked(namespace, p1)), v);
  }

  function setBytes(string p1,address p2, bytes v) internal {
    eternalStorage.setBytes(keccak256(abi.encodePacked(namespace, p1,p2)), v);
  }

  function setBytes(string p1,uint256 p2, bytes v) internal {
    eternalStorage.setBytes(keccak256(abi.encodePacked(namespace, p1,p2)), v);
  }

  function setBytes(string p1,address p2,address p3, bytes v) internal {
    eternalStorage.setBytes(keccak256(abi.encodePacked(namespace, p1,p2,p3)), v);
  }

  function setBytes(string p1,address p2,string p3, bytes v) internal {
    eternalStorage.setBytes(keccak256(abi.encodePacked(namespace, p1,p2,p3)), v);
  }

  function setBytes(string p1, string p2, string p3, bytes v) internal {
    eternalStorage.setBytes(keccak256(abi.encodePacked(namespace, p1,p2,p3)), v);
  }

  function setBytes(string p1, string p2, uint p3, string p4, bytes v) internal {
    eternalStorage.setBytes(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4)), v);
  }

  function setBytes8(string p1,uint8 p2, bytes v) internal {
    eternalStorage.setBytes(keccak256(abi.encodePacked(namespace, p1,p2)), v);
  }

  function setBytes8(string p1, string p2, string p3, uint8 p4, bytes v) internal {
    eternalStorage.setBytes(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4)), v);
  }

  function setBytes8(string p1, string p2, uint8 p3, string p4, bytes v) internal {
    eternalStorage.setBytes(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4)), v);
  }

  function setBytes8(string p1, address p2, string p3, string p4, uint8 p5, bytes v) internal {
    eternalStorage.setBytes(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4,p5)), v);
  }

  function deleteBytes(string p1) internal {
    return eternalStorage.deleteBytes(keccak256(abi.encodePacked(namespace, p1)));
  }

  function deleteBytes(string p1,address p2) internal {
    return eternalStorage.deleteBytes(keccak256(abi.encodePacked(namespace, p1,p2)));
  }

  function deleteBytes(string p1,address p2,address p3) internal {
    return eternalStorage.deleteBytes(keccak256(abi.encodePacked(namespace, p1,p2,p3)));
  }

  function deleteBytes(string p1,address p2,string p3) internal {
    return eternalStorage.deleteBytes(keccak256(abi.encodePacked(namespace, p1,p2,p3)));
  }

  function deleteBytes(string p1,string p2,string p3) internal {
    return eternalStorage.deleteBytes(keccak256(abi.encodePacked(namespace, p1,p2,p3)));
  }

  function deleteBytes(string p1, string p2, uint p3, string p4) internal {
    return eternalStorage.deleteBytes(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4)));
  }

  function deleteBytes8(string p1,uint8 p2) internal {
    return eternalStorage.deleteBytes(keccak256(abi.encodePacked(namespace, p1,p2)));
  }

  function deleteBytes8(string p1, string p2, string p3, uint8 p4) internal {
    return eternalStorage.deleteBytes(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4)));
  }

  function deleteBytes8(string p1, string p2, uint8 p3, string p4) internal {
    return eternalStorage.deleteBytes(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4)));
  }

  function deleteBytes8(string p1, address p2, string p3, string p4, uint8 p5) internal {
    return eternalStorage.deleteBytes(keccak256(abi.encodePacked(namespace, p1,p2,p3,p4,p5)));
  }


}

