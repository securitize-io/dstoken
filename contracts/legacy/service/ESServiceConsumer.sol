pragma solidity ^0.4.23;

import "./DSServiceConsumerInterface.sol";
import "../storage/EternalStorageClient.sol";
import "../token/DSTokenInterface.sol";
import "../compliance/DSWalletManagerInterface.sol";
import "../compliance/DSLockManagerInterface.sol";
import "../compliance/DSComplianceServiceInterface.sol";
import "../compliance/DSIssuanceInformationManagerInterface.sol";
import "../registry/DSRegistryServiceInterface.sol";

contract ESServiceConsumer is DSServiceConsumerInterface, EternalStorageClient {
  constructor(address _address, string _namespace) public EternalStorageClient(_address, _namespace) {}

  modifier onlyMaster {
    DSTrustServiceInterface trustManager = getTrustService();
    require(this.owner() == msg.sender || trustManager.getRole(msg.sender) == trustManager.MASTER(),"Insufficient trust level");
    _;
  }

  modifier onlyIssuerOrAbove {
    DSTrustServiceInterface trustManager = getTrustService();
    require(trustManager.getRole(msg.sender) == trustManager.ISSUER()
    || trustManager.getRole(msg.sender) == trustManager.MASTER(),"Insufficient trust level");
    _;
  }

  modifier onlyExchangeOrAbove {
    DSTrustServiceInterface trustManager = getTrustService();
    require(trustManager.getRole(msg.sender) == trustManager.EXCHANGE()
    || trustManager.getRole(msg.sender) == trustManager.ISSUER()
    || trustManager.getRole(msg.sender) == trustManager.MASTER(),"Insufficient trust level");
    _;
  }

  modifier onlyToken {
    require(msg.sender == getDSService(DS_TOKEN), "This function can only called by the associated token");
    _;
  }

  modifier onlyIssuerOrAboveOrToken {
    if (msg.sender != getDSService(DS_TOKEN)) {
      DSTrustServiceInterface trustManager = DSTrustServiceInterface(getDSService(TRUST_SERVICE));
      require(trustManager.getRole(msg.sender) == trustManager.ISSUER()
      || trustManager.getRole(msg.sender) == trustManager.MASTER(),"Insufficient trust level");
    }
    _;
  }

  function getDSService(uint _serviceId) public view returns (address) {
    return getAddress("services", _serviceId);
  }

  function setDSService(uint _serviceId, address _address) public onlyMaster returns (bool) {
    setAddress("services", _serviceId, _address);
    emit DSServiceSet(_serviceId,_address);
    return true;
  }

  function getToken() internal view returns (DSTokenInterface){
    return DSTokenInterface(getDSService(DS_TOKEN));
  }

  function getTrustService() internal view returns (DSTrustServiceInterface) {
    return DSTrustServiceInterface(getDSService(TRUST_SERVICE));
  }

  function getWalletManager() internal view returns (DSWalletManagerInterface) {
    return DSWalletManagerInterface(getDSService(WALLET_MANAGER));
  }

  function getLockManager() internal view returns (DSLockManagerInterface) {
    return DSLockManagerInterface(getDSService(LOCK_MANAGER));
  }

  function getComplianceService() internal view returns (DSComplianceServiceInterface) {
    return DSComplianceServiceInterface(getDSService(COMPLIANCE_SERVICE));
  }

  function getRegistryService() internal view returns (DSRegistryServiceInterface) {
    return DSRegistryServiceInterface(getDSService(REGISTRY_SERVICE));
  }

  function getIssuanceInformationManager() internal view returns (DSIssuanceInformationManagerInterface) {
    return DSIssuanceInformationManagerInterface(getDSService(ISSUANCE_INFORMATION_MANAGER));
  }
}