pragma solidity ^0.4.23;

import "../storage/EternalStorageClient.sol";

contract ESPausable is EternalStorageClient {

  event Pause();
  event Unpause();

  modifier whenNotPaused() {
    require(!getBoolean("paused"),"Contract is paused");
    _;
  }

  modifier whenPaused() {
    require(getBoolean("paused"),"Contract is not paused");
    _;
  }

  function pause() onlyOwner whenNotPaused public {
    setBoolean("paused", true);
    emit Pause();
  }

  function unpause() onlyOwner whenPaused public {
    setBoolean("paused", false);
    emit Unpause();
  }

  function paused() view public returns (bool) {
    return getBoolean("paused");
  }
}
