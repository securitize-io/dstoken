pragma solidity ^0.4.23;

import "../storage/EternalStorageClient.sol";

contract ESPausable is EternalStorageClient {

  string internal constant PAUSED = "paused";

  event Pause();
  event Unpause();

  modifier whenNotPaused() {
    require(!getBoolean(PAUSED),"Contract is paused");
    _;
  }

  modifier whenPaused() {
    require(getBoolean(PAUSED),"Contract is not paused");
    _;
  }

  function pause() onlyOwner whenNotPaused public {
    setBoolean(PAUSED, true);
    emit Pause();
  }

  function unpause() onlyOwner whenPaused public {
    setBoolean(PAUSED, false);
    emit Unpause();
  }

  function paused() view public returns (bool) {
    return getBoolean(PAUSED);
  }
}
