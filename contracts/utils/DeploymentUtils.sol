pragma solidity ^0.8.13;

import "./Proxy.sol";
import "../trust/IDSTrustService.sol";
import "../registry/IDSRegistryService.sol";
import "../compliance/IDSComplianceService.sol";
import "../compliance/IDSComplianceConfigurationService.sol";
import "../compliance/IDSWalletManager.sol";
import "../compliance/IDSWalletManager.sol";
import "../compliance/IDSLockManager.sol";
import "../service/IDSServiceConsumer.sol";

//SPDX-License-Identifier: UNLICENSED
contract DeploymentUtils {
    uint8 public constant TRUST_SERVICE = 0;
    uint8 public constant REGISTRY_SERVICE = 1;
    uint8 public constant COMPLIANCE_SERVICE_REGULATED = 2;
    uint8 public constant COMPLIANCE_SERVICE_PARTITIONED = 3;
    uint8 public constant COMPLIANCE_SERVICE_WHITELISTED = 4;
    uint8 public constant COMPLIANCE_CONFIGURATION = 5;
    uint8 public constant WALLET_MANAGER = 6;
    uint8 public constant INVESTOR_LOCK_MANAGER = 7;
    uint8 public constant INVESTOR_LOCK_MANAGER_PARTITIONED = 8;
    uint8 public constant DS_TOKEN = 9;
    uint8 public constant DS_TOKEN_PARTITIONED = 10;
    uint8 public constant TOKEN_ISSUER = 11;
    uint8 public constant WALLET_REGISTRAR = 12;
    uint8 public constant PARTITIONS_MANAGER = 13;
    uint8 public constant OMNIBUS_TBE_CONTROLLER = 14;
    uint8 public constant OMNIBUS_TBE_CONTROLLER_WHITELISTED = 15;
    uint8 public constant TRANSACTION_RELAYER = 16;
    uint8 public constant TOKEN_REALLOCATOR = 17;
    address public owner;
    mapping(uint8 => address) public implementationAddresses;

    event ImplementationAddressAdded(uint8 service, address implementation);
    event ProxyContractDeployed(address proxyAddress);
    event ContractDeployed(address contractAddress);

    constructor() {
        owner = msg.sender;
    }

    modifier restricted() {
        require (msg.sender == owner, "Unauthorized wallet");
        _;
    }

    function setImplementationAddresses(uint8[] memory services, address[] memory addresses ) public restricted {
        require(services.length <= 18, "Exceeded the maximum number of addresses");
        require(services.length == addresses.length, "Wrong length of parameters");
        for (uint i = 0; i < services.length; i++) {
            uint8 service = services[i];
            implementationAddresses[service] = addresses[i];
            emit ImplementationAddressAdded(service, addresses[i]);
        }
    }

    function getImplementationAddress(uint8 service) public view returns (address) {
        return implementationAddresses[service];
    }

    function deployTrustService() public {
        address proxyAddress = _deployProxy(implementationAddresses[TRUST_SERVICE]);
        IDSTrustService(proxyAddress).initialize();
        emit ProxyContractDeployed(proxyAddress);
    }

    function deployRegistryService() public {
        address proxyAddress = _deployProxy(implementationAddresses[REGISTRY_SERVICE]);
        IDSRegistryService(proxyAddress).initialize();
        emit ProxyContractDeployed(proxyAddress);
    }

    function deployComplianceServiceRegulated() public {
        _deployComplianceService(COMPLIANCE_SERVICE_REGULATED);
    }

    function deployComplianceServicePartitioned() public {
        _deployComplianceService(COMPLIANCE_SERVICE_PARTITIONED);
    }

    function deployComplianceServiceWhitelisted() public {
        _deployComplianceService(COMPLIANCE_SERVICE_WHITELISTED);
    }

    function deployConfigurationService() public {
        address proxyAddress = _deployProxy(implementationAddresses[COMPLIANCE_CONFIGURATION]);
        IDSComplianceConfigurationService(proxyAddress).initialize();
        emit ProxyContractDeployed(proxyAddress);
    }

    function deployWalletManager() public {
        address proxyAddress = _deployProxy(implementationAddresses[WALLET_MANAGER]);
        IDSWalletManager(proxyAddress).initialize();
        emit ProxyContractDeployed(proxyAddress);
    }

    function deployInvestorLockManager() public {
        _deployLockManagerService(INVESTOR_LOCK_MANAGER);
    }

    function deployInvestorLockManagerPartitioned() public {
        _deployLockManagerService(INVESTOR_LOCK_MANAGER_PARTITIONED);
    }

    function setDSServices(address contractAddress, uint256[] memory services, address[] memory serviceAddresses) public restricted {
        require(services.length <= 25, "Exceeded the maximum number of addresses");
        require(services.length == serviceAddresses.length, "Wrong length of parameters");
        for (uint i = 0; i < services.length; i++) {
            IDSServiceConsumer(contractAddress).setDSService(services[i], serviceAddresses[i]);
        }
    }

    function _deployProxy(address implementationAddress) internal returns (address) {
        require(implementationAddress != address(0), "Implementation contract not configured");
        Proxy proxy = new Proxy();
        proxy.setTarget(implementationAddress);
        return address(proxy);
    }

    function _deployComplianceService(uint8 service) internal {
        address proxyAddress = _deployProxy(implementationAddresses[service]);
        IDSComplianceService(proxyAddress).initialize();
        emit ProxyContractDeployed(proxyAddress);
    }

    function _deployLockManagerService(uint8 service) internal {
        address proxyAddress = _deployProxy(implementationAddresses[service]);
        IDSComplianceService(proxyAddress).initialize();
        emit ProxyContractDeployed(proxyAddress);
    }
}
