pragma solidity ^0.4.23;

import "../storage/EternalStorageUser.sol";
import "./DSServiceConsumerInterface.sol";

contract ESServiceConsumer is DSServiceConsumerInterface, EternalStorageUser {
  constructor(address _address, string _namespace, address _trustManagerAddress) public EternalStorageUser(_address, _namespace) {
    setAddress(keccak256("services", TRUST_SERVICE), _trustManagerAddress);
  }

  modifier onlyMaster {
    DSTrustServiceInterface trustManager = DSTrustServiceInterface(getAddress(keccak256("services", TRUST_SERVICE)));
    require(trustManager.getRole(msg.sender) == trustManager.MASTER());
    _;
  }

  modifier onlyIssuer {
    DSTrustServiceInterface trustManager = DSTrustServiceInterface(getAddress(keccak256("services", TRUST_SERVICE)));
    require(trustManager.getRole(msg.sender) == trustManager.ISSUER());
    _;
  }

  modifier onlyExchange {
    DSTrustServiceInterface trustManager = DSTrustServiceInterface(getAddress(keccak256("services", TRUST_SERVICE)));
    require(trustManager.getRole(msg.sender) == trustManager.EXCHANGE());
    _;
  }

  function getDSService(uint8 _serviceId) public view returns (address) {
    return getAddress(keccak256("services", _serviceId));
  }

  function setDSService(uint8 _serviceId, address _address) public onlyMaster returns (bool) {
    setAddress(keccak256("services", _serviceId), _address);
    return true;
  }
}