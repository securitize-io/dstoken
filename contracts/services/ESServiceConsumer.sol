pragma solidity ^0.4.23;

import "./DSServiceConsumerInterface.sol";

contract ESServiceConsumer is DSServiceConsumerInterface {
  constructor(address _address, address _trustManagerAddress) public EternalStorageUser(_address) {
    _storage.setAddress(keccak256("services", TRUST_SERVICE), _trustManagerAddress);
  }

  modifier onlyMaster {
    DSTrustServiceInterface trustManager = DSTrustServiceInterface(_storage.getAddress(keccak256("services", TRUST_SERVICE)));
    require(trustManager.getRole(msg.sender) == trustManager.MASTER());
    _;
  }

  modifier onlyIssuer {
    DSTrustServiceInterface trustManager = DSTrustServiceInterface(_storage.getAddress(keccak256("services", TRUST_SERVICE)));
    require(trustManager.getRole(msg.sender) == trustManager.ISSUER());
    _;
  }

  modifier onlyExchange {
    DSTrustServiceInterface trustManager = DSTrustServiceInterface(_storage.getAddress(keccak256("services", TRUST_SERVICE)));
    require(trustManager.getRole(msg.sender) == trustManager.EXCHANGE());
    _;
  }

  function getDSService(uint8 _serviceId) public view returns (address) {
    return _storage.getAddress(keccak256("services", _serviceId));
  }

  function setDSService(uint8 _serviceId, address _address) public onlyMaster returns (bool) {
    return _storage.setAddress(keccak256("services", _serviceId), _address);
    return true;
  }
}