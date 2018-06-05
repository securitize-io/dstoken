pragma solidity ^0.4.23;

import "../../storage/EternalStorageClient.sol";
import "./DSTrustServiceInterface.sol";

contract ESTrustService is DSTrustServiceInterface, EternalStorageClient {
  constructor(address _address, string _namespace) public EternalStorageClient(_address, _namespace) {}

  mapping (address => uint8) roles;

  address public owner;

  bool public initialized = false;

  function initialize() public onlyOwner {
    require(!initialized);
    setAddress(keccak256("owner"), msg.sender);
    setUint(keccak256("roles", msg.sender), MASTER);
    initialized = true;
  }

  modifier onlyMaster() {
    require(getUint(keccak256("roles", msg.sender)) == MASTER);
    _;
  }

  modifier onlyMasterOrIssuer() {
    require(getUint(keccak256("roles", msg.sender)) == MASTER || getUint(keccak256("roles", msg.sender)) == ISSUER);
    _;
  }

  function setRoleImpl(address _address, uint8 _role) internal returns (bool) {
    uint8 old_role = uint8(getUint(keccak256("roles", _address)));

    require(old_role == NONE || _role == NONE);

    setUint(keccak256("roles", _address), _role);

    if (old_role == NONE) {
      emit DSTrustServiceRoleAdded(_address, _role, msg.sender);
    } else {
      emit DSTrustServiceRoleRemoved(_address, old_role, msg.sender);
    }

    return true;
  }

  function setOwner(address _address) public onlyMaster returns (bool) {
    require(setRoleImpl(owner, NONE));
    setAddress(keccak256("owner"), _address);
    require(setRoleImpl(_address, MASTER));
    return true;
  }

  function setRole(address _address, uint8 _role) public onlyMasterOrIssuer returns (bool) {
    require(_role == ISSUER || _role == EXCHANGE);

    return setRoleImpl(_address, _role);
  }

  function removeRole(address _address) public onlyMasterOrIssuer returns (bool) {
    uint8 role = uint8(getUint(keccak256("roles", _address)));

    require(role == ISSUER || role == EXCHANGE);

    return setRoleImpl(_address, NONE);
  }

  function getRole(address _address) public view returns (uint8) {
    return uint8(getUint(keccak256("roles", _address)));
  }
}