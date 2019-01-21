pragma solidity ^0.4.23;

import '../util/VersionedContract.sol';

contract MigrationsVersioned is VersionedContract {
  constructor() public {
    owner = msg.sender;
    VERSIONS.push(1);
  }

  address public owner;
  uint public last_completed_migration;

  modifier restricted() {
    if (msg.sender == owner) _;
  }

  function setCompleted(uint completed) public restricted {
    last_completed_migration = completed;
  }

  function upgrade(address new_address) public restricted {
    MigrationsVersioned upgraded = MigrationsVersioned(new_address);
    upgraded.setCompleted(last_completed_migration);
  }
}
