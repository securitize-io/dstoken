pragma solidity ^0.4.23;

contract DSTrustServiceInterface {
  event DSTrustServiceRoleAdded(address _address,uint8 _role);
  event DSTrustServiceRoleRemoved(address _address, uint8 _role);

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

  function setRoleImpl(address _address, uint8 _role) internal returns (bool);
  function setOwner(address _address) public onlyMaster returns (bool);
  function setRole(address _address, uint8 _role) public onlyMasterOrIssuer returns (bool);
  function removeRole(address _address) public onlyMasterOrIssuer returns (bool);
  function getRole(address _address) public view returns (uint8);
}