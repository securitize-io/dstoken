pragma solidity ^0.8.13;

import "./Proxy.sol";
import "../utils/CommonUtils.sol";
import "../utils/ProxyTarget.sol";
import "./Ownable.sol";
import "../trust/IDSTrustService.sol";
import "../registry/IDSRegistryService.sol";
import "../registry/IDSWalletRegistrar.sol";
import "../compliance/IDSComplianceService.sol";
import "../compliance/IDSComplianceConfigurationService.sol";
import "../compliance/IDSPartitionsManager.sol";
import "../compliance/IDSWalletManager.sol";
import "../compliance/IDSWalletManager.sol";
import "../compliance/IDSLockManager.sol";
import "../service/IDSServiceConsumer.sol";
import "../token/DSToken.sol";
import "../issuance/IDSTokenIssuer.sol";
import "../omnibus/IDSOmnibusTBEController.sol";
import "../omnibus/IDSTokenReallocator.sol";
import "../swap/BaseSecuritizeSwap.sol";
import "../utils/TransactionRelayer.sol";
import "../bulk/IBulkOperator.sol";


//SPDX-License-Identifier: UNLICENSED
contract DeploymentUtils is ProxyTarget, Initializable {
    uint8 public constant TRUST_SERVICE = 0;
    uint8 public constant REGISTRY_SERVICE = 1;
    uint8 public constant COMPLIANCE_SERVICE_REGULATED = 2;
    uint8 public constant COMPLIANCE_SERVICE_PARTITIONED = 3;
    uint8 public constant COMPLIANCE_SERVICE_WHITELISTED = 4;
    uint8 public constant COMPLIANCE_SERVICE_NOT_REGULATED = 5;
    uint8 public constant COMPLIANCE_CONFIGURATION = 6;
    uint8 public constant WALLET_MANAGER = 7;
    uint8 public constant LOCK_MANAGER = 8;
    uint8 public constant INVESTOR_LOCK_MANAGER = 9;
    uint8 public constant INVESTOR_LOCK_MANAGER_PARTITIONED = 10;
    uint8 public constant DS_TOKEN = 11;
    uint8 public constant DS_TOKEN_PARTITIONED = 12;
    uint8 public constant TOKEN_ISSUER = 13;
    uint8 public constant WALLET_REGISTRAR = 14;
    uint8 public constant PARTITIONS_MANAGER = 15;
    uint8 public constant OMNIBUS_TBE_CONTROLLER = 16;
    uint8 public constant OMNIBUS_TBE_CONTROLLER_WHITELISTED = 17;
    uint8 public constant TRANSACTION_RELAYER = 18;
    uint8 public constant TOKEN_REALLOCATOR = 19;
    uint8 public constant SECURITIZE_SWAP = 20;
    uint8 public constant BULK_OPERATOR = 21;
    uint8 public constant TRANSFER_AGENT_MULTICALL = 22;
    uint8 public constant EXCHANGE_MULTICALL = 23;
    uint8 public constant ISSUER_MULTICALL = 24;
    

    address public owner;
    mapping(uint8 => address) public implementationAddresses;

    event ImplementationAddressAdded(uint8 service, address implementation);
    event ProxyContractDeployed(address proxyAddress);
    event ContractDeployed(address contractAddress);

    function initialize() public initializer forceInitializeFromProxy {
        owner = msg.sender;
    }

    modifier restricted() {
        require (msg.sender == owner, "Unauthorized wallet");
        _;
    }

    function setImplementationAddress(uint8 service, address implementationAddress ) public restricted {
        implementationAddresses[service] = implementationAddress;
        emit ImplementationAddressAdded(service, implementationAddress);
    }

    function setImplementationAddresses(uint8[] memory services, address[] memory addresses ) public restricted {
        require(services.length <= 20, "Exceeded the maximum number of addresses");
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

    function copyImplementationContracts(address _oldDeploymentUtils) public restricted {
        DeploymentUtils oldDeploymentUtils = DeploymentUtils(_oldDeploymentUtils);
        for (uint8 i = 0; i <= 20; i++) {
            address oldImplementation = oldDeploymentUtils.getImplementationAddress(i);
            setImplementationAddress(i, oldImplementation);
        }
    }

    function deployTrustService() public restricted {
        address proxyAddress = _deployProxy(implementationAddresses[TRUST_SERVICE]);
        IDSTrustService(proxyAddress).initialize();
        emit ProxyContractDeployed(proxyAddress);
    }

    function deployRegistryService() public restricted {
        address proxyAddress = _deployProxy(implementationAddresses[REGISTRY_SERVICE]);
        IDSRegistryService(proxyAddress).initialize();
        emit ProxyContractDeployed(proxyAddress);
    }

    function deployComplianceServiceRegulated() public restricted {
        _deployComplianceService(COMPLIANCE_SERVICE_REGULATED);
    }

    function deployComplianceServiceNotRegulated() public restricted {
        _deployComplianceService(COMPLIANCE_SERVICE_NOT_REGULATED);
    }

    function deployComplianceServicePartitioned() public restricted {
        _deployComplianceService(COMPLIANCE_SERVICE_PARTITIONED);
    }

    function deployComplianceServiceWhitelisted() public {
        _deployComplianceService(COMPLIANCE_SERVICE_WHITELISTED);
    }

    function deployPartitionsManager() public restricted {
        address proxyAddress = _deployProxy(implementationAddresses[PARTITIONS_MANAGER]);
        IDSPartitionsManager(proxyAddress).initialize();
        emit ProxyContractDeployed(proxyAddress);
    }

    function deploySecuritizeSwap(address dsToken, address stableCoin, address issuerWallet) public restricted {
        address proxyAddress = _deployProxy(implementationAddresses[SECURITIZE_SWAP]);
        BaseSecuritizeSwap(proxyAddress).initialize(dsToken, stableCoin, issuerWallet);
        emit ProxyContractDeployed(proxyAddress);
    }

    function deployOmnibusTbeController(address omnibusWallet, bool isPartitionedToken) public restricted {
        _deployOmnibusTbeController(OMNIBUS_TBE_CONTROLLER, omnibusWallet, isPartitionedToken);
    }

    function deployOmnibusTbeControllerWhitelisted(address omnibusWallet, bool isPartitionedToken) public restricted {
        _deployOmnibusTbeController(OMNIBUS_TBE_CONTROLLER_WHITELISTED, omnibusWallet, isPartitionedToken);
    }

    function deployTransactionRelayer(uint256 chainId) public restricted {
        address proxyAddress = _deployProxy(implementationAddresses[TRANSACTION_RELAYER]);
        TransactionRelayer(proxyAddress).initialize(chainId);
        emit ProxyContractDeployed(proxyAddress);
    }

    function deployConfigurationService() public restricted {
        address proxyAddress = _deployProxy(implementationAddresses[COMPLIANCE_CONFIGURATION]);
        IDSComplianceConfigurationService(proxyAddress).initialize();
        emit ProxyContractDeployed(proxyAddress);
    }

    function deployTokenReallocator() public restricted {
        address proxyAddress = _deployProxy(implementationAddresses[TOKEN_REALLOCATOR]);
        IDSTokenReallocator(proxyAddress).initialize();
        emit ProxyContractDeployed(proxyAddress);
    }

    function deployWalletManager() public restricted {
        address proxyAddress = _deployProxy(implementationAddresses[WALLET_MANAGER]);
        IDSWalletManager(proxyAddress).initialize();
        emit ProxyContractDeployed(proxyAddress);
    }

    function deployLockManager() public restricted {
        _deployLockManagerService(LOCK_MANAGER);
    }

    function deployInvestorLockManager() public restricted {
        _deployLockManagerService(INVESTOR_LOCK_MANAGER);
    }

    function deployInvestorLockManagerPartitioned() public restricted {
        _deployLockManagerService(INVESTOR_LOCK_MANAGER_PARTITIONED);
    }

    function deployDsToken(string memory name, string memory symbol, uint8 decimals) public restricted {
        _deployToken(DS_TOKEN, name, symbol, decimals);
    }

    function deployDsTokenPartitioned(string memory name, string memory symbol, uint8 decimals) public restricted {
        _deployToken(DS_TOKEN_PARTITIONED, name, symbol, decimals);
    }

    function deployTokenIssuer() public restricted {
        address proxyAddress = _deployProxy(implementationAddresses[TOKEN_ISSUER]);
        IDSTokenIssuer(proxyAddress).initialize();
        emit ProxyContractDeployed(proxyAddress);
    }

    function deployWalletRegistrar() public restricted {
        address proxyAddress = _deployProxy(implementationAddresses[WALLET_REGISTRAR]);
        IDSWalletRegistrar(proxyAddress).initialize();
        emit ProxyContractDeployed(proxyAddress);
    }

    function deployBulkOperator(address dsToken) public restricted {
        address proxyAddress = _deployProxy(implementationAddresses[BULK_OPERATOR]);
        IBulkOperator(proxyAddress).initialize(dsToken);
        emit ProxyContractDeployed(proxyAddress);
    }

    function setRoles(address proxyTrustService, address[] memory addressesToSet, uint8[] memory roles) public restricted {
        IDSTrustService(proxyTrustService).setRoles(addressesToSet, roles);
    }

    function transferOwnershipToMaster(address master, address[] memory proxies) public restricted {
        require(proxies.length <= 20, "Exceeded the maximum number of addresses");
        for (uint i = 0; i < proxies.length; i++) {
            Ownable(proxies[i]).transferOwnership(master);
            Proxy(proxies[i]).setOwner(master);
        }
    }

    function transferTrustServiceOwnershipToMaster(address master, address proxyTrustService) public restricted {
        IDSTrustService(proxyTrustService).setServiceOwner(master);
        Proxy(proxyTrustService).setOwner(master);
    }

    function addPlatformWallets(address proxyWalletManager, address[] memory wallets) public restricted returns (bool) {
        return IDSWalletManager(proxyWalletManager).addPlatformWallets(wallets);
    }

    function addIssuerWallets(address proxyWalletManager, address[] memory wallets) public restricted returns (bool) {
        return IDSWalletManager(proxyWalletManager).addIssuerWallets(wallets);
    }

    function setCountriesCompliance(address proxyCompConfiguration, string[] memory countries, uint256[] memory values) public restricted {
        IDSComplianceConfigurationService(proxyCompConfiguration).setCountriesCompliance(countries, values);
    }

    function setAllComplianceValues(address proxyCompConfiguration, uint256[] memory uintValues, bool[] memory boolValues) public restricted {
        IDSComplianceConfigurationService(proxyCompConfiguration).setAll(uintValues, boolValues);
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

    function _deployToken(uint8 service, string memory name, string memory symbol, uint8 decimals) internal {
        address proxyAddress = _deployProxy(implementationAddresses[service]);
        DSToken(proxyAddress).initialize(name, symbol, decimals);
        emit ProxyContractDeployed(proxyAddress);
    }

    function _deployOmnibusTbeController(uint8 service, address omnibusWallet, bool isPartitionedToken) internal {
        address proxyAddress = _deployProxy(implementationAddresses[service]);
        IDSOmnibusTBEController(proxyAddress).initialize(omnibusWallet, isPartitionedToken);
        emit ProxyContractDeployed(proxyAddress);
    }

}
