pragma solidity ^0.5.0;

import "./IDSServiceConsumer.sol";
import "../data-stores/ServiceConsumerDataStore.sol";
import "../token/IDSToken.sol";
import "../compliance/IDSWalletManager.sol";
import "../compliance/IDSLockManager.sol";
import "../compliance/IDSComplianceService.sol";
import "../compliance/IDSComplianceConfigurationService.sol";
import "../registry/IDSRegistryService.sol";
import "../trust/IDSTrustService.sol";
import "../utils/Ownable.sol";

contract ServiceConsumer is IDSServiceConsumer, Ownable, ServiceConsumerDataStore {
    constructor() internal {}

    function initialize() public isNotInitialized {
        IDSServiceConsumer.initialize();
        Ownable.initialize();

        VERSIONS.push(3);
    }

    modifier onlyMaster {
        IDSTrustService trustManager = getTrustService();
        require(this.owner() == msg.sender || trustManager.getRole(msg.sender) == trustManager.MASTER(), "Insufficient trust level");
        _;
    }

    modifier onlyIssuerOrAbove {
        IDSTrustService trustManager = getTrustService();
        require(trustManager.getRole(msg.sender) == trustManager.ISSUER() || trustManager.getRole(msg.sender) == trustManager.MASTER(), "Insufficient trust level");
        _;
    }

    modifier onlyExchangeOrAbove {
        IDSTrustService trustManager = getTrustService();
        require(
            trustManager.getRole(msg.sender) == trustManager.EXCHANGE() ||
                trustManager.getRole(msg.sender) == trustManager.ISSUER() ||
                trustManager.getRole(msg.sender) == trustManager.MASTER(),
            "Insufficient trust level"
        );
        _;
    }

    modifier onlyToken {
        require(msg.sender == getDSService(DS_TOKEN), "This function can only called by the associated token");
        _;
    }

    modifier onlyRegistry {
        require(msg.sender == getDSService(REGISTRY_SERVICE), "This function can only called by the registry service");
        _;
    }

    modifier onlyIssuerOrAboveOrToken {
        if (msg.sender != getDSService(DS_TOKEN)) {
            IDSTrustService trustManager = IDSTrustService(getDSService(TRUST_SERVICE));
            require(trustManager.getRole(msg.sender) == trustManager.ISSUER() || trustManager.getRole(msg.sender) == trustManager.MASTER(), "Insufficient trust level");
        }
        _;
    }

    modifier onlyOmnibusWalletController(address omnibusWallet, IDSOmnibusWalletController omnibusWalletController) {
        require(getRegistryService().getOmnibusWalletController(omnibusWallet) == omnibusWalletController);
        _;
    }

    function getDSService(uint256 _serviceId) public view returns (address) {
        return services[_serviceId];
    }

    function setDSService(uint256 _serviceId, address _address) public onlyMaster returns (bool) {
        services[_serviceId] = _address;
        emit DSServiceSet(_serviceId, _address);
        return true;
    }

    function getToken() internal view returns (IDSToken) {
        return IDSToken(getDSService(DS_TOKEN));
    }

    function getTrustService() internal view returns (IDSTrustService) {
        return IDSTrustService(getDSService(TRUST_SERVICE));
    }

    function getWalletManager() internal view returns (IDSWalletManager) {
        return IDSWalletManager(getDSService(WALLET_MANAGER));
    }

    function getLockManager() internal view returns (IDSLockManager) {
        return IDSLockManager(getDSService(LOCK_MANAGER));
    }

    function getComplianceService() internal view returns (IDSComplianceService) {
        return IDSComplianceService(getDSService(COMPLIANCE_SERVICE));
    }

    function getRegistryService() internal view returns (IDSRegistryService) {
        return IDSRegistryService(getDSService(REGISTRY_SERVICE));
    }

    function getComplianceConfigurationService() internal view returns (IDSComplianceConfigurationService) {
        return IDSComplianceConfigurationService(getDSService(COMPLIANCE_CONFIGURATION_SERVICE));
    }
}
