pragma solidity ^0.4.23;

import "./DSTrustServiceInterface.sol";
import "../../storage/EternalStorageUser.sol";

contract ESTrustService is DSTrustServiceInterface, EternalStorageUser {
  mapping (address => uint8) roles;

  address public owner;

  constructor(address _address) public EternalStorageUser(_address) {
    _storage.setAddress(keccak256("owner"), msg.sender);
    _storage.setUint(keccak256("roles", msg.sender), MASTER);
  }

  modifier onlyMaster() {
    require(_storage.getUint(keccak256("roles", msg.sender)) == MASTER);
    _;
  }

  modifier onlyMasterOrIssuer() {
    require(_storage.getUint(keccak256("roles", msg.sender)) == MASTER || _storage.getUint(keccak256("roles", msg.sender)) == ISSUER);
    _;
  }

  function setRoleImpl(address _address, uint8 _role) internal returns (bool) {
    uint8 old_role = _storage.getUint(keccak256("roles", _address));

    require(old_role == NONE || _role == NONE);

    _storage.setUint(keccak256("roles", _address), _role);

    if (old_role == NONE) {
      emit DSTrustServiceRoleAdded(_address, _role);
    } else {
      emit DSTrustServiceRoleRemoved(_address, old_role);
    }

    return true;
  }

  function setOwner(address _address) public onlyMaster returns (bool) {
    require(setRoleImpl(owner, NONE));
    _storage.setAddress(keccak256("owner"), _address);
    require(setRoleImpl(_address, MASTER));
    return true;
  }

  function setRole(address _address, uint8 _role) public onlyMasterOrIssuer returns (bool) {
    require(_role == ISSUER || _role == EXCHANGE);

    return setRoleImpl(_address, _role);
  }

  function removeRole(address _address) public onlyMasterOrIssuer returns (bool) {
    uint8 role = _storage.getUint(keccak256("roles", _address));

    require(role == ISSUER || role == EXCHANGE);

    return setRoleImpl(_address, NONE);
  }

  function getRole(address _address) public view returns (uint8) {
    uint8 role = _storage.getUint(keccak256("roles", _address));
    require(role != NONE);
    return role;
  }
}