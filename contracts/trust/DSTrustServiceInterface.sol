pragma solidity ^0.4.23;

/**
 * @title DSTrustServiceInterface
 * @dev An interface for a trust service which allows role-based access control for other contracts
 */
contract DSTrustServiceInterface {
  event DSTrustServiceRoleAdded(address _address, uint8 _role, address _sender);
  event DSTrustServiceRoleRemoved(address _address, uint8 _role, address _sender);

  uint8 public constant NONE = 0;
  uint8 public constant MASTER = 1;
  uint8 public constant ISSUER = 2;
  uint8 public constant EXCHANGE = 4;

  modifier onlyMaster() {
    assert(false);
    _;
  }

  modifier onlyMasterOrIssuer() {
    assert(false);
    _;
  }

  /**
   * @dev Sets or removes a role for a wallet. (internal)
   * @param _address The wallet whose role needs to be set or removed.
   * @param _role The role to be set. NONE (0) indicates role removal.
   * @return A boolean that indicates if the operation was successful.
   */
  function setRoleImpl(address _address, uint8 _role) internal returns (bool);
  /**
   * @dev Transfers the ownership (MASTER role) of the contract.
   * @param _address The address which the ownership needs to be transferred to.
   * @return A boolean that indicates if the operation was successful.
   */
  function setOwner(address _address) public /*onlyMaster*/ returns (bool);
  /**
   * @dev A function that sets a role for a wallet.
   * @dev Should not be used for setting MASTER (use setOwner) or role removal (use removeRole)
   * @param _address The wallet whose role needs to be set.
   * @param _role The role to be set.
   * @return A boolean that indicates if the operation was successful.
   */
  function setRole(address _address, uint8 _role) public /*onlyMasterOrIssuer*/ returns (bool);
  /**
   * @dev A function that removes a wallet's role.
   * @dev Should not be used for setting MASTER (use setOwner) or role removal (use removeRole)
   * @param _address The wallet whose role needs to be set.
   * @param _role The role to be set.
   * @return A boolean that indicates if the operation was successful.
   */
  function removeRole(address _address) public /*onlyMasterOrIssuer*/ returns (bool);
  function getRole(address _address) public view returns (uint8);
}