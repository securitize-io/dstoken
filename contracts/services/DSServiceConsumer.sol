pragma solidity ^0.4.23;

import "./DSServiceConsumerInterface.sol";

contract DSServiceConsumer is DSServiceConsumerInterface {
  mapping (uint8 => address) services;

  constructor(address _trustManagerAddress) public {
    services[TRUST_SERVICE] = _trustManagerAddress;
  }

  modifier onlyMaster {
    DSTrustServiceInterface trustManager = DSTrustServiceInterface(services[TRUST_SERVICE]);
    require(trustManager.getRole(msg.sender) == trustManager.MASTER());
    _;
  }

  modifier onlyIssuer {
    DSTrustServiceInterface trustManager = DSTrustServiceInterface(services[TRUST_SERVICE]);
    require(trustManager.getRole(msg.sender) == trustManager.ISSUER());
    _;
  }

  modifier onlyExchange {
    DSTrustServiceInterface trustManager = DSTrustServiceInterface(services[TRUST_SERVICE]);
    require(trustManager.getRole(msg.sender) == trustManager.EXCHANGE());
    _;
  }

  function getDSService(uint8 _serviceId) public view returns (address) {
    return services[_serviceId];
  }

  function setDSService(uint8 _serviceId, address _address) public onlyMaster returns (bool) {
    services[_serviceId] = _address;
    return true;
  }
}