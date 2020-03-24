pragma solidity ^0.5.0;

import "./StandardToken.sol";

contract PausableToken is StandardToken {
    event Pause();
    event Unpause();

    constructor() internal {}

    function initialize() public isNotInitialized {
        StandardToken.initialize();
        VERSIONS.push(2);
    }

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    modifier whenPaused() {
        require(paused, "Contract is not paused");
        _;
    }

    function pause() public onlyOwner whenNotPaused {
        paused = true;
        emit Pause();
    }

    function unpause() public onlyOwner whenPaused {
        paused = false;
        emit Unpause();
    }

    function isPaused() public view returns (bool) {
        return paused;
    }
}
