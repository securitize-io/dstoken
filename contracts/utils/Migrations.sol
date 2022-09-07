pragma solidity ^0.8.13;

import "./VersionedContract.sol";

//SPDX-License-Identifier: UNLICENSED
contract Migrations is VersionedContract {
    constructor() public {
        owner = msg.sender;
        VERSIONS.push(3);
    }

    address public owner;
    uint256 public last_completed_migration;

    modifier restricted() {
        if (msg.sender == owner) _;
    }

    function setCompleted(uint256 completed) public restricted {
        last_completed_migration = completed;
    }

    function upgrade(address new_address) public restricted {
        Migrations upgraded = Migrations(new_address);
        upgraded.setCompleted(last_completed_migration);
    }
}
