pragma solidity ^0.4.23;

import "./ESMintableToken.sol";
import "../../ownership/rbac/RBAC.sol";


contract ESRBACMintableToken is ESMintableToken, RBAC {
  constructor(address _address, string _namespace) public ESMintableToken(_address, _namespace) {}

  /**
   * A constant role name for indicating minters.
   */
  string public constant ROLE_MINTER = "minter";

  /**
   * @dev override the Mintable token modifier to add role based logic
   */
  modifier hasMintPermission() {
    checkRole(msg.sender, ROLE_MINTER);
    _;
  }

  /**
   * @dev add a minter role to an address
   * @param minter address
   */
  function addMinter(address minter) onlyOwner public {
    addRole(minter, ROLE_MINTER);
  }

  /**
   * @dev remove a minter role from an address
   * @param minter address
   */
  function removeMinter(address minter) onlyOwner public {
    removeRole(minter, ROLE_MINTER);
  }
}
