pragma solidity ^0.4.23;

import "./trust/DSTrustServiceInterface.sol";

contract DSServiceConsumerInterface {
  uint8 public constant TRUST_SERVICE = 1;
  uint8 public constant DS_TOKEN = 2;
  uint8 public constant REGISTRY_SERVICE = 4;
  uint8 public constant COMPLIANCE_SERVICE = 8;
  uint8 public constant COMMS_SERVICE = 16;

  modifier onlyMaster {
    assert(false);
    _;
  }

  modifier onlyIssuer {
    assert(false);
    _;
  }

  modifier onlyExchange {
    assert(false);
    _;
  }

  function getDSService(uint8 _serviceId) public view returns (address);
  function setDSService(uint8 _serviceId, address _address) public /*onlyMaster*/ returns (bool);
}