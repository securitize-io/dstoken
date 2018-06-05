pragma solidity ^0.4.23;

import "../storage/EternalStorageClient.sol";

contract ESPausable is EternalStorageClient {
  constructor(address _address, string _namespace) public EternalStorageClient(_address, _namespace) {}

  event Pause();
  event Unpause();

  modifier whenNotPaused() {
    require(!getBoolean(keccak256("paused")));
    _;
  }

  modifier whenPaused() {
    require(getBoolean(keccak256("paused")));
    _;
  }

  function pause() onlyOwner whenNotPaused public {
    setBoolean(keccak256("paused"), true);
    emit Pause();
  }

  function unpause() onlyOwner whenPaused public {
    setBoolean(keccak256("paused"), false);
    emit Unpause();
  }
}
