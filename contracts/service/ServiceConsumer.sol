pragma solidity 0.5.17;

import "./IDSServiceConsumer.sol";
import "../data-stores/ServiceConsumerDataStore.sol";
import "../token/IDSToken.sol";
import "../token/IDSTokenPartitioned.sol";
import "../compliance/IDSWalletManager.sol";
import "../compliance/IDSLockManager.sol";
import "../compliance/IDSLockManagerPartitioned.sol";
import "../compliance/IDSComplianceService.sol";
import "../compliance/IDSComplianceServicePartitioned.sol";
import "../compliance/IDSPartitionsManager.sol";
import "../compliance/IDSComplianceConfigurationService.sol";
import "../registry/IDSRegistryService.sol";
import "../omnibus/IDSOmnibusTBEController.sol";
import "../trust/IDSTrustService.sol";
import "../utils/Ownable.sol";

contract ServiceConsumer is IDSServiceConsumer, Ownable, ServiceConsumerDataStore {
    constructor() internal {}

    // Bring role constants to save gas both in deployment (less bytecode) and usage
    uint8 public constant ROLE_NONE = 0;
    uint8 public constant ROLE_MASTER = 1;
    uint8 public constant ROLE_ISSUER = 2;
    uint8 public constant ROLE_EXCHANGE = 4;

    function initialize() public {
        IDSServiceConsumer.initialize();
        Ownable.initialize();

        VERSIONS.push(5);
    }

    modifier onlyMaster {
        IDSTrustService trustManager = getTrustService();
        require(this.contractOwner() == msg.sender || trustManager.getRole(msg.sender) == ROLE_MASTER, "Insufficient trust level");
        _;
    }

    modifier onlyIssuerOrAbove {
        IDSTrustService trustManager = getTrustService();
        require(trustManager.getRole(msg.sender) == ROLE_ISSUER || trustManager.getRole(msg.sender) == ROLE_MASTER, "Insufficient trust level");
        _;
    }

    modifier onlyExchangeOrAbove {
        IDSTrustService trustManager = getTrustService();
        require(
            trustManager.getRole(msg.sender) == ROLE_EXCHANGE || trustManager.getRole(msg.sender) == ROLE_ISSUER || trustManager.getRole(msg.sender) == ROLE_MASTER,
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
            require(trustManager.getRole(msg.sender) == ROLE_ISSUER || trustManager.getRole(msg.sender) == ROLE_MASTER, "Insufficient trust level");
        }
        _;
    }

    modifier onlyOmnibusWalletController(address omnibusWallet, IDSOmnibusWalletController omnibusWalletController) {
        require(getRegistryService().getOmnibusWalletController(omnibusWallet) == omnibusWalletController, "Wrong controller address");
        _;
    }

    modifier onlyTBEOmnibus {
        require(msg.sender == getOmnibusTBEController().getOmnibusWallet(), "Not authorized");
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

    function getLockManagerPartitioned() internal view returns (IDSLockManagerPartitioned) {
        return IDSLockManagerPartitioned(getDSService(LOCK_MANAGER));
    }

    function getComplianceService() internal view returns (IDSComplianceService) {
        return IDSComplianceService(getDSService(COMPLIANCE_SERVICE));
    }

    function getRegistryService() internal view returns (IDSRegistryService) {
        return IDSRegistryService(getDSService(REGISTRY_SERVICE));
    }

    function getPartitionsManager() internal view returns (IDSPartitionsManager) {
        return IDSPartitionsManager(getDSService(PARTITIONS_MANAGER));
    }

    function getTokenPartitioned() internal view returns (IDSTokenPartitioned) {
        return IDSTokenPartitioned(getDSService(DS_TOKEN));
    }

    function getComplianceConfigurationService() internal view returns (IDSComplianceConfigurationService) {
        return IDSComplianceConfigurationService(getDSService(COMPLIANCE_CONFIGURATION_SERVICE));
    }

    function getOmnibusTBEController() internal view returns (IDSOmnibusTBEController) {
        return IDSOmnibusTBEController(getDSService(OMNIBUS_TBE_CONTROLLER));
    }
}
