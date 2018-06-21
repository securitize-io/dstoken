pragma solidity ^0.4.23;

import "./DSServiceConsumerInterface.sol";
import "./storage/EternalStorageClient.sol";

contract ESServiceConsumer is DSServiceConsumerInterface, EternalStorageClient {
  constructor(address _address, string _namespace) public EternalStorageClient(_address, _namespace) {}

  modifier onlyMaster {
    DSTrustServiceInterface trustManager = DSTrustServiceInterface(getDSService(TRUST_SERVICE));
    require(this.owner() == msg.sender || trustManager.getRole(msg.sender) == trustManager.MASTER(),"Insufficient trust level");
    _;
  }

  modifier onlyIssuerOrAbove {
    DSTrustServiceInterface trustManager = DSTrustServiceInterface(getDSService(TRUST_SERVICE));
    require(trustManager.getRole(msg.sender) == trustManager.ISSUER()
    || trustManager.getRole(msg.sender) == trustManager.MASTER(),"Insufficient trust level");
    _;
  }

  modifier onlyExchangeOrAbove {
    DSTrustServiceInterface trustManager = DSTrustServiceInterface(getDSService(TRUST_SERVICE));
    require(trustManager.getRole(msg.sender) == trustManager.EXCHANGE()
    || trustManager.getRole(msg.sender) == trustManager.ISSUER()
    || trustManager.getRole(msg.sender) == trustManager.MASTER(),"Insufficient trust level");
    _;
  }

  function getDSService(uint8 _serviceId) public view returns (address) {
    return getAddress8("services", _serviceId);
  }

  function setDSService(uint8 _serviceId, address _address) public onlyMaster returns (bool) {
    setAddress8("services", _serviceId, _address);
    return true;
  }
}