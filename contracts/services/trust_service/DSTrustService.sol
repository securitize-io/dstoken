pragma solidity ^0.4.23;

import "./DSTrustServiceInterface.sol";

contract DSTrustService is DSTrustServiceInterface {
  mapping (address => uint8) roles;

  address public owner;

  constructor() public {
    owner = msg.sender;
    roles[msg.sender] = MASTER;
  }

  modifier onlyMaster() {
    require(roles[msg.sender] == MASTER);
    _;
  }

  modifier onlyMasterOrIssuer() {
    require(roles[msg.sender] == MASTER || roles[msg.sender] == ISSUER);
    _;
  }

  function setRoleImpl(address _address, uint8 _role) internal returns (bool) {
    uint8 old_role = roles[_address];

    require(old_role == NONE || _role == NONE);

    roles[_address] = _role;

    if (old_role == NONE) {
      emit DSTrustServiceRoleAdded(_address, _role);
    } else {
      emit DSTrustServiceRoleRemoved(_address, old_role);
    }

    return true;
  }

  function setOwner(address _address) public onlyMaster returns (bool) {
    require(setRoleImpl(owner, NONE));
    owner = _address;
    require(setRoleImpl(_address, MASTER));
    return true;
  }

  function setRole(address _address, uint8 _role) public onlyMasterOrIssuer returns (bool) {
    require(_role == ISSUER || _role == EXCHANGE);

    return setRoleImpl(_address, _role);
  }

  function removeRole(address _address) public onlyMasterOrIssuer returns (bool) {
    uint8 role = roles[_address];

    require(role == ISSUER || role == EXCHANGE);

    return setRoleImpl(_address, NONE);
  }

  function getRole(address _address) public view returns (uint8) {
    uint8 role = roles[_address];
    require(role != NONE);
    return role;
  }
}