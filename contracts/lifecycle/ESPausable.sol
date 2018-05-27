pragma solidity ^0.4.23;

import "../storage/EternalStorageUser.sol";

contract ESPausable is EternalStorageUser {
  event Pause();
  event Unpause();

  modifier whenNotPaused() {
    require(!_storage.getBoolean(keccak256("paused")));
    _;
  }

  modifier whenPaused() {
    require(_storage.getBoolean(keccak256("paused")));
    _;
  }

  function pause() onlyOwner whenNotPaused public {
    _storage.setBoolean(keccak256("paused"), true);
    emit Pause();
  }

  function unpause() onlyOwner whenPaused public {
    _storage.setBoolean(keccak256("paused"), false);
    emit Unpause();
  }
}
