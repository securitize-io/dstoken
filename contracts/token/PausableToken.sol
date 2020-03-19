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

    // function transfer(address _to, uint256 _value) public whenNotPaused returns (bool) {
    //     return super.transfer(_to, _value);
    // }

    // function transferFrom(address _from, address _to, uint256 _value) public whenNotPaused returns (bool) {
    //     return super.transferFrom(_from, _to, _value);
    // }

    // function approve(address _spender, uint256 _value) public whenNotPaused returns (bool) {
    //     return super.approve(_spender, _value);
    // }

    // function increaseApproval(address _spender, uint256 _addedValue) public whenNotPaused returns (bool success) {
    //     return super.increaseApproval(_spender, _addedValue);
    // }

    // function decreaseApproval(address _spender, uint256 _subtractedValue) public whenNotPaused returns (bool success) {
    //     return super.decreaseApproval(_spender, _subtractedValue);
    // }
}
