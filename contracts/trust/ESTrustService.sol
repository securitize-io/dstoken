pragma solidity ^0.4.23;

import "../storage/EternalStorageClient.sol";
import "./DSTrustServiceInterface.sol";

/**
 * @title ESTrustService
 * @dev A trust service which allows role-based access control for other contracts.
 * @dev Implements DSTrustServiceInterface with EternalStorage.
 */
contract ESTrustService is DSTrustServiceInterface, EternalStorageClient {
  /**
   * @dev The constructor delegates the parameters to EternalStorageClient.
   */
  constructor(address _address, string _namespace) public EternalStorageClient(_address, _namespace) {}

  // Used for pseudo constructor
  bool public initialized = false;

  /**
   * @dev Pseudo constructor to set the contract creator as MASTER.
   * @dev Cannot be moved to a constructor as it won't have write permissions on the storage at the time of creation.
   */
  function initialize() public onlyOwner {
    require(!initialized,"must not be initialized");
    setAddress("owner", msg.sender);
    setUint("roles", msg.sender, MASTER);
    initialized = true;
  }

  /**
   * @dev Allow invoking of functions only by the user who has the MASTER role.
   */
  modifier onlyMaster() {
    require(getUint("roles", msg.sender) == MASTER);
    _;
  }

  /**
   * @dev Allow invoking of functions only by the users who have the MASTER role or the ISSUER role.
   */
  modifier onlyMasterOrIssuer() {
    require(getUint("roles", msg.sender) == MASTER || getUint("roles", msg.sender) == ISSUER);
    _;
  }

  /**
   * @dev Sets or removes a role for a wallet. (internal)
   * @param _address The wallet whose role needs to be set or removed.
   * @param _role The role to be set. NONE (0) indicates role removal.
   * @return A boolean that indicates if the operation was successful.
   */
  function setRoleImpl(address _address, uint8 _role) internal returns (bool) {
    uint8 old_role = uint8(getUint("roles", _address));

    require(old_role == NONE || _role == NONE,"No direct role-to-role change");

    setUint("roles", _address, _role);

    if (old_role == NONE) {
      emit DSTrustServiceRoleAdded(_address, _role, msg.sender);
    } else {
      emit DSTrustServiceRoleRemoved(_address, old_role, msg.sender);
    }

    return true;
  }

  /**
   * @dev Transfers the ownership (MASTER role) of the contract.
   * @param _address The address which the ownership needs to be transferred to.
   * @return A boolean that indicates if the operation was successful.
   */
  function setOwner(address _address) public onlyMaster returns (bool) {
    require(setRoleImpl(owner, NONE));
    setAddress("owner", _address);
    require(setRoleImpl(_address, MASTER));
    return true;
  }

  /**
   * @dev Sets a role for a wallet.
   * @dev Should not be used for setting MASTER (use setOwner) or role removal (use removeRole).
   * @param _address The wallet whose role needs to be set.
   * @param _role The role to be set.
   * @return A boolean that indicates if the operation was successful.
   */
  function setRole(address _address, uint8 _role) public onlyMasterOrIssuer returns (bool) {
    require(_role == ISSUER || _role == EXCHANGE);

    return setRoleImpl(_address, _role);
  }

  /**
   * @dev Removes the role for a wallet.
   * @dev Should not be used to remove MASTER (use setOwner).
   * @param _address The wallet whose role needs to be removed.
   * @return A boolean that indicates if the operation was successful.
   */
  function removeRole(address _address) public onlyMasterOrIssuer returns (bool) {
    uint8 role = uint8(getUint("roles", _address));

    require(role == ISSUER || role == EXCHANGE);

    return setRoleImpl(_address, NONE);
  }

  /**
   * @dev Gets the role for a wallet.
   * @param _address The wallet whose role needs to be fetched.
   * @return A boolean that indicates if the operation was successful.
   */
  function getRole(address _address) public view returns (uint8) {
    return uint8(getUint("roles", _address));
  }
}