pragma solidity ^0.4.21;

contract ProxyOwnerChanger {
  address public owner;
  address public target;

  /**
   * @dev Throws if called by any account other than the owner.
   */
  modifier onlyOwner() {
    require(msg.sender == owner);
    _;
  }

  function setOwner(address _owner) public onlyOwner {
    owner = _owner;
  }
}