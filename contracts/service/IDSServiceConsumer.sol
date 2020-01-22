pragma solidity ^0.5.0;

import "../trust/IDSTrustService.sol";

contract IDSServiceConsumer is VersionedContract {
    constructor() internal {
        VERSIONS.push(2);
    }

    uint256 public constant TRUST_SERVICE = 1;
    uint256 public constant DS_TOKEN = 2;
    uint256 public constant REGISTRY_SERVICE = 4;
    uint256 public constant COMPLIANCE_SERVICE = 8;
    uint256 public constant COMMS_SERVICE = 16;
    uint256 public constant WALLET_MANAGER = 32;
    uint256 public constant LOCK_MANAGER = 64;
    uint256 public constant ISSUANCE_INFORMATION_MANAGER = 128;
    uint256 public constant COMPLIANCE_CONFIGURATION_SERVICE = 256;
    uint256 public constant TOKEN_ISSUER = 512;

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

    modifier onlyRegistry {
        assert(false);
        _;
    }

    modifier onlyIssuerOrAboveOrToken {
        assert(false);
        _;
    }

    function getDSService(uint256 _serviceId) public view returns (address);
    function setDSService(
        uint256 _serviceId,
        address _address /*onlyMaster*/
    ) public returns (bool);

    event DSServiceSet(uint256 serviceId, address serviceAddress);
}
