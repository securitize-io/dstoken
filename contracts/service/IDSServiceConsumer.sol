pragma solidity 0.5.17;

import "../utils/VersionedContract.sol";
import "../utils/Initializable.sol";
import "../omnibus/IDSOmnibusWalletController.sol";


contract IDSServiceConsumer is Initializable, VersionedContract {
    constructor() internal {}

    function initialize() public {
        VERSIONS.push(6);
    }

    uint256 public constant TRUST_SERVICE = 1;
    uint256 public constant DS_TOKEN = 2;
    uint256 public constant REGISTRY_SERVICE = 4;
    uint256 public constant COMPLIANCE_SERVICE = 8;
    uint256 public constant UNUSED_1 = 16;
    uint256 public constant WALLET_MANAGER = 32;
    uint256 public constant LOCK_MANAGER = 64;
    uint256 public constant PARTITIONS_MANAGER = 128;
    uint256 public constant COMPLIANCE_CONFIGURATION_SERVICE = 256;
    uint256 public constant TOKEN_ISSUER = 512;
    uint256 public constant WALLET_REGISTRAR = 1024;
    uint256 public constant OMNIBUS_TBE_CONTROLLER = 2048;
    uint256 public constant TRANSACTION_RELAYER = 4096;
    uint256 public constant TOKEN_REALLOCATOR = 8192;

    modifier onlyMaster {
        require(false, "Not implemented");
        _;
    }

    modifier onlyIssuerOrAbove {
        require(false, "Not implemented");
        _;
    }

    modifier onlyExchangeOrAbove {
        require(false, "Not implemented");
        _;
    }

    modifier onlyToken {
        require(false, "Not implemented");
        _;
    }

    modifier onlyRegistry {
        require(false, "Not implemented");
        _;
    }

    modifier onlyIssuerOrAboveOrToken {
        require(false, "Not implemented");
        _;
    }

    modifier onlyOmnibusWalletController(address omnibusWallet, IDSOmnibusWalletController omnibusWalletController) {
        require(false, "Not implemented");
        _;
    }

    modifier onlyTBEOmnibus {
        require(false, "Not implemented");
        _;
    }

    modifier onlyMasterOrTBEOmnibus {
        require(false, "Not implemented");
        _;
    }

    modifier onlyOwnerOrIssuerOrAbove {
        require(false, "Not implemented");
        _;
    }

    function getDSService(uint256 _serviceId) public view returns (address);

    function setDSService(
        uint256 _serviceId,
        address _address /*onlyMaster*/
    ) public returns (bool);

    event DSServiceSet(uint256 serviceId, address serviceAddress);
}
