pragma solidity ^0.4.23;

import "../service/DSServiceConsumerInterfaceVersioned.sol";
import "../storage/EternalStorageClientVersioned.sol";
import "../token/DSTokenInterfaceVersioned.sol";
import "../compliance/DSWalletManagerInterfaceVersioned.sol";
import "../compliance/DSLockManagerInterfaceVersioned.sol";
import "../compliance/DSComplianceServiceInterfaceVersioned.sol";
import "../compliance/DSIssuanceInformationManagerInterfaceVersioned.sol";
import "../compliance/DSComplianceConfigurationServiceInterfaceVersioned.sol";
import "../registry/DSRegistryServiceInterfaceVersioned.sol";

contract ESServiceConsumerVersioned is DSServiceConsumerInterfaceVersioned, EternalStorageClientVersioned {
  constructor(address _address, string _namespace) public EternalStorageClientVersioned(_address, _namespace) {
    VERSIONS.push(1);
  }

  modifier onlyMaster {
    DSTrustServiceInterfaceVersioned trustManager = getTrustService();
    require(this.owner() == msg.sender || trustManager.getRole(msg.sender) == trustManager.MASTER(),"Insufficient trust level");
    _;
  }

  modifier onlyIssuerOrAbove {
    DSTrustServiceInterfaceVersioned trustManager = getTrustService();
    require(trustManager.getRole(msg.sender) == trustManager.ISSUER()
    || trustManager.getRole(msg.sender) == trustManager.MASTER(),"Insufficient trust level");
    _;
  }

  modifier onlyExchangeOrAbove {
    DSTrustServiceInterfaceVersioned trustManager = getTrustService();
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
      DSTrustServiceInterfaceVersioned trustManager = DSTrustServiceInterfaceVersioned(getDSService(TRUST_SERVICE));
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

  function getToken() internal view returns (DSTokenInterfaceVersioned){
    return DSTokenInterfaceVersioned(getDSService(DS_TOKEN));
  }

  function getTrustService() internal view returns (DSTrustServiceInterfaceVersioned) {
    return DSTrustServiceInterfaceVersioned(getDSService(TRUST_SERVICE));
  }

  function getWalletManager() internal view returns (DSWalletManagerInterfaceVersioned) {
    return DSWalletManagerInterfaceVersioned(getDSService(WALLET_MANAGER));
  }

  function getLockManager() internal view returns (DSLockManagerInterfaceVersioned) {
    return DSLockManagerInterfaceVersioned(getDSService(LOCK_MANAGER));
  }

  function getComplianceService() internal view returns (DSComplianceServiceInterfaceVersioned) {
    return DSComplianceServiceInterfaceVersioned(getDSService(COMPLIANCE_SERVICE));
  }

  function getRegistryService() internal view returns (DSRegistryServiceInterfaceVersioned) {
    return DSRegistryServiceInterfaceVersioned(getDSService(REGISTRY_SERVICE));
  }

  function getIssuanceInformationManager() internal view returns (DSIssuanceInformationManagerInterfaceVersioned) {
    return DSIssuanceInformationManagerInterfaceVersioned(getDSService(ISSUANCE_INFORMATION_MANAGER));
  }

  function getComplianceConfigurationService() internal view returns (DSComplianceConfigurationServiceInterfaceVersioned) {
    return DSComplianceConfigurationServiceInterfaceVersioned(getDSService(COMPLIANCE_CONFIGURATION_SERVICE));
  }
}