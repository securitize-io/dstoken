pragma solidity ^0.4.21;

import "../zeppelin/storage/EternalStorage.sol";

contract DSEternalStorage is EternalStorage {
  // struct Registry {
  //   mapping(bytes32 => bytes[]) _bool;
  //   mapping(bytes32 => bytes[]) _int;
  //   mapping(bytes32 => bytes[]) _uint;
  //   mapping(bytes32 => bytes[]) _string;
  //   mapping(bytes32 => bytes[]) _address;
  //   mapping(bytes32 => bytes[]) _bytes;
  // }

  // Registry internal r;

  function deleteBoolean(bytes32 h, bool v) public onlyRole("write") {
    delete(s._bool[h]);
  }

  function deleteInt(bytes32 h, int v) public onlyRole("write") {
    delete(s._int[h]);
  }

  function deleteUint(bytes32 h, uint256 v) public onlyRole("write") {
    delete(s._uint[h]);
  }

  function deleteAddress(bytes32 h, address v) public onlyRole("write") {
    delete(s._address[h]);
  }

  function deleteString(bytes32 h, string v) public onlyRole("write") {
    delete(s._string[h]);
  }

  function deleteBytes(bytes32 h, bytes v) public onlyRole("write") {
    delete(s._bytes[h]);
  }

  // function registerBoolean(bytes32 h, bytes32 v) public onlyRole("write") {
  //   r._bool[h].add(v);
  // }

  // function registerInt(bytes32 h, bytes32 v) public onlyRole("write") {
  //   r._int[h].add(v);
  // }

  // function registerUint(bytes32 h, bytes32 v) public onlyRole("write") {
  //   r._uint[h].add(v);
  // }

  // function registerAddress(bytes32 h, bytes32 v) public onlyRole("write") {
  //   r._address[h].add(v);
  // }

  // function registerString(bytes32 h, bytes32 v) public onlyRole("write") {
  //   r._string[h].add(v);
  // }

  // function registerBytes(bytes32 h, bytes32 v) public onlyRole("write") {
  //   r._bytes[h].add(v);
  // }

  // function registerBoolean(bytes32 h, bytes32 v) public onlyRole("write") {
  //   r._bool[h].add(v);
  // }

  // function registerInt(bytes32 h, bytes32 v) public onlyRole("write") {
  //   r._int[h].add(v);
  // }

  // function registerUint(bytes32 h, bytes32 v) public onlyRole("write") {
  //   r._uint[h].add(v);
  // }

  // function registerAddress(bytes32 h, bytes32 v) public onlyRole("write") {
  //   r._address[h].add(v);
  // }

  // function registerString(bytes32 h, bytes32 v) public onlyRole("write") {
  //   r._string[h].add(v);
  // }

  // function registerBytes(bytes32 h, bytes32 v) public onlyRole("write") {
  //   r._bytes[h].add(v);
  // }

  // function deleteBooleanFromRegistry(bytes32 h) public onlyRole("write") {
  //   delete(r._bool[h]);
  // }

  // function deleteIntFromRegistry(bytes32 h) public onlyRole("write") {
  //   delete(r._int[h]);
  // }

  // function deleteUintFromRegistry(bytes32 h) public onlyRole("write") {
  //   delete(r._uint[h]);
  // }

  // function deleteAddressFromRegistry(bytes32 h) public onlyRole("write") {
  //   delete(r._address[h]);
  // }

  // function deleteStringFromRegistry(bytes32 h) public onlyRole("write") {
  //   delete(r._string[h]);
  // }

  // function deleteBytesFromRegistry(bytes32 h) public onlyRole("write") {
  //   delete(r._bytes[h]);
  // }
}