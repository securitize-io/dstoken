pragma solidity ^0.4.23;

import "./trust/DSTrustServiceInterface.sol";

contract DSServiceConsumerInterface {
  uint public constant TRUST_SERVICE = 1;
  uint public constant DS_TOKEN = 2;
  uint public constant REGISTRY_SERVICE = 4;
  uint public constant COMPLIANCE_SERVICE = 8;
  uint public constant COMMS_SERVICE = 16;
  uint public constant WALLET_MANAGER = 32;
  uint public constant LOCK_MANAGER = 64;
  uint public constant ISSUANCE_INFORMATION_MANAGER = 128;

  modifier onlyMaster {
    assert(false);
    _;
  }

  modifier onlyIssuerOrAbove {
    assert(false);
    _;
  }

  modifier onlyExchangeOrAbove {
    assert(false);
    _;
  }

  modifier onlyToken {
    assert(false);
    _;
  }

  modifier onlyIssuerOrAboveOrToken {
    assert(false);
    _;
  }

  function getDSService(uint _serviceId) public view returns (address);
  function setDSService(uint _serviceId, address _address) public /*onlyMaster*/ returns (bool);
}