pragma solidity ^0.4.21;

import '../ownership/Ownable.sol';
import './EternalStorage.sol';

contract EternalStorageUser is Ownable {
  EternalStorage public _storage;

  constructor(address _address) public {
    _storage = EternalStorage(_address);
  }

  function setStorage(address _address) public onlyOwner {
    _storage = EternalStorage(_address);
  }
}